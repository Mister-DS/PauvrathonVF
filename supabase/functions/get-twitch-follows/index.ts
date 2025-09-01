// supabase/functions/get-twitch-follows/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Fonction de déchiffrement (doit correspondre à celle dans twitch-auth)
function decryptToken(encryptedToken: string): string {
  try {
    const key = Deno.env.get('TOKEN_ENCRYPTION_KEY') || 'default-key-change-this';
    const encrypted = atob(encryptedToken); // Décoder de base64
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return decrypted;
  } catch (error) {
    console.error('Token decryption failed:', error);
    return '';
  }
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

    // SÉCURITÉ AMÉLIORÉE : Essayer d'abord la table sécurisée
    let accessToken = null;
    let twitchId = null;

    // 1. Essayer de récupérer le token depuis la table sécurisée
    try {
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('user_tokens')
        .select('encrypted_access_token')
        .eq('user_id', user.id)
        .single();

      if (!tokenError && tokenData?.encrypted_access_token) {
        accessToken = decryptToken(tokenData.encrypted_access_token);
        console.log('🔐 Token récupéré depuis la table sécurisée');
      }
    } catch (error) {
      console.log('ℹ️ Table sécurisée non disponible, utilisation du fallback');
    }

    // 2. Récupérer les informations du profil (toujours nécessaire pour twitch_id)
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('twitch_id, twitch_access_token') // Garde twitch_access_token comme fallback
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.twitch_id) {
      return new Response(
        JSON.stringify({ 
          streams: [],
          total: 0,
          message: 'Compte Twitch non connecté. Connectez votre compte dans les paramètres pour voir vos follows.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    twitchId = profile.twitch_id;

    // 3. Fallback vers l'ancien système si pas de token sécurisé
    if (!accessToken && profile.twitch_access_token) {
      accessToken = profile.twitch_access_token;
      console.log('⚠️ Utilisation du token fallback depuis profiles');
    }

    const twitchClientId = Deno.env.get('TWITCH_CLIENT_ID')
    const twitchClientSecret = Deno.env.get('TWITCH_CLIENT_SECRET')

    if (!twitchClientId || !twitchClientSecret) {
      return new Response(
        JSON.stringify({ error: 'Twitch API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Si pas de token utilisateur, obtenir un token d'app
    if (!accessToken) {
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

    let followedStreams = []

    // ESSAYER D'ABORD DE RÉCUPÉRER LES VRAIS FOLLOWS (nécessite un token utilisateur)
    const hasUserToken = profile.twitch_access_token || (await supabaseClient
      .from('user_tokens')
      .select('encrypted_access_token')
      .eq('user_id', user.id)
      .single()).data?.encrypted_access_token;

    if (hasUserToken && twitchId) {
      try {
        // Récupérer la liste des follows
        const followsResponse = await fetch(
          `https://api.twitch.tv/helix/channels/followed?user_id=${twitchId}&first=100`,
          {
            headers: {
              'Client-ID': twitchClientId,
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        )

        if (followsResponse.ok) {
          const followsData = await followsResponse.json()
          const follows = followsData.data || []

          if (follows.length > 0) {
            // Récupérer les streams en direct pour les chaînes suivies
            const broadcasterIds = follows.map((follow: any) => follow.broadcaster_id)
            const chunks = []
            
            // L'API Twitch limite à 100 IDs par requête
            for (let i = 0; i < broadcasterIds.length; i += 100) {
              chunks.push(broadcasterIds.slice(i, i + 100))
            }

            const allStreams = []
            
            for (const chunk of chunks) {
              const streamsUrl = `https://api.twitch.tv/helix/streams?${chunk.map(id => `user_id=${id}`).join('&')}`
              
              const streamsResponse = await fetch(streamsUrl, {
                headers: {
                  'Client-ID': twitchClientId,
                  'Authorization': `Bearer ${accessToken}`,
                },
              })

              if (streamsResponse.ok) {
                const streamsData = await streamsResponse.json()
                allStreams.push(...(streamsData.data || []))
              }
            }

            // Enrichir avec les infos utilisateur
            if (allStreams.length > 0) {
              const userIds = [...new Set(allStreams.map((stream: any) => stream.user_id))]
              const usersUrl = `https://api.twitch.tv/helix/users?${userIds.map(id => `id=${id}`).join('&')}`
              
              const usersResponse = await fetch(usersUrl, {
                headers: {
                  'Client-ID': twitchClientId,
                  'Authorization': `Bearer ${accessToken}`,
                },
              })

              if (usersResponse.ok) {
                const usersData = await usersResponse.json()
                const users = usersData.data || []
                
                const userMap = new Map()
                users.forEach((user: any) => {
                  userMap.set(user.id, user)
                })

                followedStreams = allStreams.map((stream: any) => {
                  const userInfo = userMap.get(stream.user_id)
                  return {
                    ...stream,
                    profile_image_url: userInfo?.profile_image_url || '',
                    display_name: userInfo?.display_name || stream.user_name,
                  }
                }).sort((a: any, b: any) => b.viewer_count - a.viewer_count)
              }
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des follows:', error)
        // En cas d'erreur, on continue avec la solution de fallback
      }
    }

    // FALLBACK: Si pas de token utilisateur ou pas de follows en live, montrer des streams populaires
    if (followedStreams.length === 0) {
      try {
        const popularStreamsResponse = await fetch(
          'https://api.twitch.tv/helix/streams?first=20',
          {
            headers: {
              'Client-ID': twitchClientId,
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        )

        if (popularStreamsResponse.ok) {
          const streamsData = await popularStreamsResponse.json()
          const streams = streamsData.data || []

          // Enrichir avec les infos utilisateur
          if (streams.length > 0) {
            const userIds = streams.map((stream: any) => stream.user_id)
            const usersUrl = `https://api.twitch.tv/helix/users?${userIds.map(id => `id=${id}`).join('&')}`
            
            const usersResponse = await fetch(usersUrl, {
              headers: {
                'Client-ID': twitchClientId,
                'Authorization': `Bearer ${accessToken}`,
              },
            })

            if (usersResponse.ok) {
              const usersData = await usersResponse.json()
              const users = usersData.data || []
              
              const userMap = new Map()
              users.forEach((user: any) => {
                userMap.set(user.id, user)
              })

              followedStreams = streams.map((stream: any) => {
                const userInfo = userMap.get(stream.user_id)
                return {
                  ...stream,
                  profile_image_url: userInfo?.profile_image_url || '',
                  display_name: userInfo?.display_name || stream.user_name,
                }
              })
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des streams populaires:', error)
      }
    }

    const isRealFollows = hasUserToken && followedStreams.length > 0
    
    return new Response(
      JSON.stringify({ 
        streams: followedStreams,
        total: followedStreams.length,
        is_real_follows: isRealFollows,
        security_enhanced: !!hasUserToken,
        message: isRealFollows 
          ? `${followedStreams.length} de vos follows sont actuellement en direct`
          : followedStreams.length > 0 
            ? 'Streams populaires affichés (connectez votre compte Twitch pour voir vos vrais follows)'
            : 'Aucun stream en direct trouvé'
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
        streams: [],
        total: 0,
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