// supabase/functions/search-twitch-streams/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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

    // Get the authenticated user (optional for this function)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

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

    // Search for streams containing "subathon" or "pauvrathon" in title
    // First, get popular streams
    const streamsResponse = await fetch(
      `https://api.twitch.tv/helix/streams?first=100&language=fr`,
      {
        headers: {
          'Client-ID': twitchClientId,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!streamsResponse.ok) {
      throw new Error(`Twitch streams API error: ${streamsResponse.status}`)
    }

    const streamsData = await streamsResponse.json()
    const allStreams = streamsData.data || []

    // Filter streams that contain subathon/pauvrathon in title (case insensitive)
    const subathonStreams = allStreams.filter((stream: any) => 
      stream.title.toLowerCase().includes('subathon') || 
      stream.title.toLowerCase().includes('pauvrathon') ||
      stream.title.toLowerCase().includes('sub-a-thon')
    )

    // Get user info for profile images if we have subathon streams
    let enrichedStreams = []
    
    if (subathonStreams.length > 0) {
      const userIds = subathonStreams.map((stream: any) => stream.user_id)
      const chunkedUserIds = []
      
      // Split into chunks of 100 (API limit)
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

      // Create user map for quick lookup
      const userMap = new Map()
      allUsers.forEach((user: any) => {
        userMap.set(user.id, user)
      })

      // Enrich streams with user info
      enrichedStreams = subathonStreams.map((stream: any) => {
        const userInfo = userMap.get(stream.user_id)
        return {
          id: stream.id,
          user_id: stream.user_id,
          user_login: stream.user_login,
          user_name: stream.user_name,
          game_id: stream.game_id,
          game_name: stream.game_name,
          type: stream.type,
          title: stream.title,
          viewer_count: stream.viewer_count,
          started_at: stream.started_at,
          language: stream.language,
          thumbnail_url: stream.thumbnail_url,
          profile_image_url: userInfo?.profile_image_url || '',
        }
      })
    }

    // If no subathon streams found, try search API as fallback
    if (enrichedStreams.length === 0) {
      const searchResponse = await fetch(
        `https://api.twitch.tv/helix/search/channels?query=subathon&first=20&live_only=true`,
        {
          headers: {
            'Client-ID': twitchClientId,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        const searchResults = searchData.data || []
        
        // Get stream info for live channels from search
        if (searchResults.length > 0) {
          const liveChannelIds = searchResults
            .filter((channel: any) => channel.is_live)
            .map((channel: any) => channel.id)

          if (liveChannelIds.length > 0) {
            const liveStreamsResponse = await fetch(
              `https://api.twitch.tv/helix/streams?${liveChannelIds.map(id => `user_id=${id}`).join('&')}`,
              {
                headers: {
                  'Client-ID': twitchClientId,
                  'Authorization': `Bearer ${accessToken}`,
                },
              }
            )

            if (liveStreamsResponse.ok) {
              const liveStreamsData = await liveStreamsResponse.json()
              enrichedStreams = (liveStreamsData.data || []).map((stream: any) => {
                const channelInfo = searchResults.find((ch: any) => ch.id === stream.user_id)
                return {
                  id: stream.id,
                  user_id: stream.user_id,
                  user_login: stream.user_login,
                  user_name: stream.user_name,
                  game_id: stream.game_id,
                  game_name: stream.game_name,
                  type: stream.type,
                  title: stream.title,
                  viewer_count: stream.viewer_count,
                  started_at: stream.started_at,
                  language: stream.language,
                  thumbnail_url: stream.thumbnail_url,
                  profile_image_url: channelInfo?.thumbnail_url || '',
                }
              })
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        streams: enrichedStreams,
        total_found: enrichedStreams.length,
        searched_terms: ['subathon', 'pauvrathon', 'sub-a-thon']
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error searching Twitch streams:', error)
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