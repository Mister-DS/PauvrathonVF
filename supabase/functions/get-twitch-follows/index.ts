// supabase/functions/get-twitch-follows/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    // Get user profile with Twitch data
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('twitch_id, twitch_access_token')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.twitch_id) {
      return new Response(
        JSON.stringify({ 
          follows: [],
          message: 'Twitch account not connected' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const twitchClientId = Deno.env.get('TWITCH_CLIENT_ID')
    const twitchClientSecret = Deno.env.get('TWITCH_CLIENT_SECRET')

    if (!twitchClientId || !twitchClientSecret) {
      return new Response(
        JSON.stringify({ error: 'Twitch API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Si on n'a pas de token utilisateur, utiliser un token d'app pour une requête basique
    let accessToken = profile.twitch_access_token;
    
    if (!accessToken) {
      // Obtenir un token d'application
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
      accessToken = tokenData.access_token

      if (!accessToken) {
        throw new Error('Failed to get Twitch access token')
      }
    }

    // SOLUTION TEMPORAIRE : Retourner une liste de streamers populaires 
    // au lieu d'essayer d'accéder aux follows privés
    const popularStreamsResponse = await fetch(
      'https://api.twitch.tv/helix/streams?game_id=509658&first=20', // Just Chatting category
      {
        headers: {
          'Client-ID': twitchClientId,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!popularStreamsResponse.ok) {
      throw new Error(`Twitch API streams error: ${popularStreamsResponse.status}`)
    }

    const streamsData = await popularStreamsResponse.json()
    const streams = streamsData.data || []

    // Enrichir avec les infos utilisateur
    let enrichedStreams = []
    
    if (streams.length > 0) {
      const userIds = streams.map((stream: any) => stream.user_id)
      
      const usersResponse = await fetch(
        `https://api.twitch.tv/helix/users?${userIds.map(id => `id=${id}`).join('&')}`,
        {
          headers: {
            'Client-ID': twitchClientId,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        const users = usersData.data || []
        
        const userMap = new Map()
        users.forEach((user: any) => {
          userMap.set(user.id, user)
        })

        enrichedStreams = streams.map((stream: any) => {
          const userInfo = userMap.get(stream.user_id)
          return {
            ...stream,
            profile_image_url: userInfo?.profile_image_url || '',
            display_name: userInfo?.display_name || stream.user_name,
          }
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        follows: enrichedStreams, // Renvoyer les streams populaires comme "follows"
        total_live: enrichedStreams.length,
        message: 'Showing popular streams (follows feature requires Twitch user token)'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in get-twitch-follows:', error)
    return new Response(
      JSON.stringify({ 
        follows: [],
        error: error.message,
        details: 'Check function logs in Supabase dashboard'
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