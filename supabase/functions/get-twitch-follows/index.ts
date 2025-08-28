// supabase/functions/get-twitch-live-streams/index.ts
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
        JSON.stringify({ 
          streams: [],
          message: 'Twitch account not connected' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      throw new Error(`Twitch API follows error: ${followsResponse.status}`)
    }

    const followsData = await followsResponse.json()
    const follows = followsData.data || []

    if (follows.length === 0) {
      return new Response(
        JSON.stringify({ 
          streams: [],
          message: 'No followed channels found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get broadcaster IDs from follows
    const broadcasterIds = follows.map((follow: any) => follow.broadcaster_id)
    
    // Split into chunks of 100 (Twitch API limit)
    const chunkedIds = []
    for (let i = 0; i < broadcasterIds.length; i += 100) {
      chunkedIds.push(broadcasterIds.slice(i, i + 100))
    }

    // Get live streams for followed channels
    const allLiveStreams = []
    
    for (const chunk of chunkedIds) {
      const streamsResponse = await fetch(
        `https://api.twitch.tv/helix/streams?${chunk.map(id => `user_id=${id}`).join('&')}&first=100`,
        {
          headers: {
            'Client-ID': twitchClientId,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (streamsResponse.ok) {
        const streamsData = await streamsResponse.json()
        allLiveStreams.push(...(streamsData.data || []))
      }
    }

    // If we have live streams, get user info for profile images
    let enrichedStreams = []
    
    if (allLiveStreams.length > 0) {
      const userIds = allLiveStreams.map((stream: any) => stream.user_id)
      const chunkedUserIds = []
      
      for (let i = 0; i < userIds.length; i += 100) {
        chunkedUserIds.push(userIds.slice(i, i + 100))
      }

      const allUsers = []
      
      for (const chunk of chunkedUserIds) {
        const usersResponse = await fetch(
          `https://api.twitch.tv/helix/users?${chunk.map(id => `id=${id}`).join('&')}`,
          {
            headers: {
              'Client-ID': twitchClientId,
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        )

        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          allUsers.push(...(usersData.data || []))
        }
      }

      // Create a map of user info
      const userMap = new Map()
      allUsers.forEach((user: any) => {
        userMap.set(user.id, user)
      })

      // Enrich streams with user info
      enrichedStreams = allLiveStreams.map((stream: any) => {
        const userInfo = userMap.get(stream.user_id)
        return {
          ...stream,
          profile_image_url: userInfo?.profile_image_url || '',
        }
      })
    }

    return new Response(
      JSON.stringify({ 
        streams: enrichedStreams,
        total_live: enrichedStreams.length,
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
    console.error('Error fetching Twitch live streams:', error)
    return new Response(
      JSON.stringify({ 
        streams: [],
        error: error.message 
      }),
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