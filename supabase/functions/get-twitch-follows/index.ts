// Follow proper deployment by creating supabase/functions/get-twitch-follows/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile to get twitch_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('twitch_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.twitch_id) {
      return new Response(
        JSON.stringify({ error: 'Twitch account not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Twitch access token
    const twitchClientId = Deno.env.get('TWITCH_CLIENT_ID')
    const twitchClientSecret = Deno.env.get('TWITCH_CLIENT_SECRET')

    if (!twitchClientId || !twitchClientSecret) {
      return new Response(
        JSON.stringify({ error: 'Twitch API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get app access token for Twitch API
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: twitchClientId,
        client_secret: twitchClientSecret,
        grant_type: 'client_credentials',
      }),
    })

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      throw new Error('Failed to get Twitch access token')
    }

    // Get user follows from Twitch API
    const followsResponse = await fetch(
      `https://api.twitch.tv/helix/channels/followed?user_id=${profile.twitch_id}&first=100`,
      {
        headers: {
          'Client-ID': twitchClientId,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!followsResponse.ok) {
      throw new Error(`Twitch API error: ${followsResponse.status}`)
    }

    const followsData = await followsResponse.json()
    const follows = followsData.data || []

    // Get streamers from our database that match the followed channels
    const followedBroadcasterIds = follows.map((follow: any) => follow.broadcaster_id)
    
    const { data: streamers, error: streamersError } = await supabaseClient
      .from('streamers')
      .select(`
        *,
        profiles(*)
      `)
      .in('twitch_id', followedBroadcasterIds)

    if (streamersError) {
      throw streamersError
    }

    // Transform data to match expected format
    const transformedStreamers = (streamers || []).map(streamer => ({
      ...streamer,
      profile: Array.isArray(streamer.profiles) ? streamer.profiles[0] : null
    }))

    return new Response(
      JSON.stringify({ 
        streamers: transformedStreamers,
        total_follows: follows.length 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error fetching Twitch follows:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})