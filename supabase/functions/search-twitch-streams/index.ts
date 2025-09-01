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

    // CORRECTION: Récupérer tous les streams en direct, puis filtrer par titre
    let streamsUrl = 'https://api.twitch.tv/helix/streams?first=100'
    
    // Ajouter le filtre de langue si spécifié
    if (language && language !== 'all') {
      streamsUrl += `&language=${language}`
    }

    // Récupérer les streams en direct
    const streamsResponse = await fetch(streamsUrl, {
      headers: {
        'Client-ID': twitchClientId,
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!streamsResponse.ok) {
      throw new Error(`Twitch streams API error: ${streamsResponse.status} - ${await streamsResponse.text()}`)
    }

    const streamsData = await streamsResponse.json()
    let streams = streamsData.data || []

    // CORRECTION PRINCIPALE: Filtrer par titre de stream (pas par nom de chaîne)
    const filteredStreams = streams.filter((stream: any) => 
      stream.title.toLowerCase().includes(query.toLowerCase())
    )

    if (filteredStreams.length === 0) {
      return new Response(
        JSON.stringify({ 
          streams: [],
          message: `No live streams found with "${query}" in title${language && language !== 'all' ? ` in ${language}` : ''}`,
          total: 0,
          query: query,
          language: language || 'all'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer les informations détaillées des utilisateurs pour les avatars
    const userIds = [...new Set(filteredStreams.map((stream: any) => stream.user_id))]
    const usersUrl = `https://api.twitch.tv/helix/users?${userIds.map(id => `id=${id}`).join('&')}`

    const usersResponse = await fetch(usersUrl, {
      headers: {
        'Client-ID': twitchClientId,
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    let users = []
    if (usersResponse.ok) {
      const usersData = await usersResponse.json()
      users = usersData.data || []
    }

    // Enrichir les streams avec les informations utilisateur
    const enrichedStreams = filteredStreams.map((stream: any) => {
      const userInfo = users.find((user: any) => user.id === stream.user_id)
      return {
        ...stream,
        display_name: userInfo?.display_name || stream.user_name,
        profile_image_url: userInfo?.profile_image_url || '',
        user_description: userInfo?.description || '',
        // Ajouter des tags basiques selon le contenu du titre
        tags: generateTagsFromTitle(stream.title)
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
        message: `Found ${enrichedStreams.length} live stream(s) with "${query}" in title${language && language !== 'all' ? ` in ${language}` : ''}`
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

// Fonction utilitaire pour générer des tags basés sur le titre
function generateTagsFromTitle(title: string): string[] {
  const titleLower = title.toLowerCase()
  const tags: string[] = []
  
  const tagMap = {
    'subathon': 'Subathon',
    'marathon': 'Marathon',
    '24h': '24h Stream',
    'charity': 'Charity',
    'speedrun': 'Speedrun',
    'challenge': 'Challenge',
    'first time': 'First Time',
    'blind': 'Blind Playthrough'
  }
  
  Object.entries(tagMap).forEach(([keyword, tag]) => {
    if (titleLower.includes(keyword)) {
      tags.push(tag)
    }
  })
  
  return tags
}