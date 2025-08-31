// supabase/functions/search-twitch-streams/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, language } = await req.json()

    const twitchClientId = Deno.env.get('TWITCH_CLIENT_ID')
    const twitchClientSecret = Deno.env.get('TWITCH_CLIENT_SECRET')

    if (!twitchClientId || !twitchClientSecret) {
      return new Response(
        JSON.stringify({ error: 'Twitch API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get app access token
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

    // Construire l'URL de recherche avec les paramètres de langue
    let searchUrl = `https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(query)}&first=20&live_only=true`
    
    // Ajouter le filtre de langue si spécifié
    if (language && language !== 'all') {
      searchUrl += `&language=${language}`
    }

    // Search for streams
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Client-ID': twitchClientId,
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!searchResponse.ok) {
      throw new Error(`Twitch search API error: ${searchResponse.status} - ${await searchResponse.text()}`)
    }

    const searchData = await searchResponse.json()
    const channels = searchData.data || []

    if (channels.length === 0) {
      return new Response(
        JSON.stringify({ 
          streams: [],
          message: `No live streams found for "${query}"${language && language !== 'all' ? ` in ${language}` : ''}`,
          total: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get detailed stream info for the channels found
    const channelIds = channels.map((channel: any) => channel.id)
    const streamsUrl = `https://api.twitch.tv/helix/streams?${channelIds.map(id => `user_id=${id}`).join('&')}&first=20`

    const streamsResponse = await fetch(streamsUrl, {
      headers: {
        'Client-ID': twitchClientId,
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    let streams = []
    if (streamsResponse.ok) {
      const streamsData = await streamsResponse.json()
      streams = streamsData.data || []
    }

    // Enrichir avec les informations des channels
    const enrichedStreams = streams.map((stream: any) => {
      const channelInfo = channels.find((channel: any) => channel.id === stream.user_id)
      return {
        ...stream,
        display_name: channelInfo?.display_name || stream.user_name,
        profile_image_url: channelInfo?.thumbnail_url || '',
        broadcaster_language: channelInfo?.broadcaster_language || stream.language,
        tags: channelInfo?.tags || []
      }
    })

    // Trier par nombre de spectateurs (descendant)
    enrichedStreams.sort((a: any, b: any) => b.viewer_count - a.viewer_count)

    return new Response(
      JSON.stringify({ 
        streams: enrichedStreams,
        total: enrichedStreams.length,
        query: query,
        language: language || 'all',
        message: `Found ${enrichedStreams.length} live stream(s) for "${query}"${language && language !== 'all' ? ` in ${language}` : ''}`
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