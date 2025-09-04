import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, twitch-eventsub-message-id, twitch-eventsub-message-retry, twitch-eventsub-message-signature, twitch-eventsub-message-timestamp, twitch-eventsub-message-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface TwitchEventSubPayload {
  subscription: {
    type: string;
    condition: {
      broadcaster_user_id: string;
    };
  };
  event: {
    user_name?: string;
    user_login?: string;
    tier?: string;
    bits?: number;
    is_gift?: boolean;
    total?: number;
  };
}

// Fonction pour vérifier la signature Twitch
function verifyTwitchSignature(
  body: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  const hmac = createHmac('sha256', secret);
  hmac.update(timestamp + body);
  const expectedSignature = 'sha256=' + hmac.digest('hex');
  return signature === expectedSignature;
}

serve(async (req) => {
  // Gérer CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const messageType = req.headers.get('twitch-eventsub-message-type')
    const messageId = req.headers.get('twitch-eventsub-message-id')
    const messageTimestamp = req.headers.get('twitch-eventsub-message-timestamp')
    const messageSignature = req.headers.get('twitch-eventsub-message-signature')
    
    const body = await req.text()
    
    // Vérification du challenge pour l'abonnement webhook
    if (messageType === 'webhook_callback_verification') {
      const challengeData = JSON.parse(body)
      console.log('Webhook verification challenge received')
      return new Response(challengeData.challenge, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      })
    }

    // Vérifier la signature (optionnel mais recommandé en production)
    const webhookSecret = Deno.env.get('TWITCH_WEBHOOK_SECRET')
    if (webhookSecret && messageSignature && messageTimestamp) {
      if (!verifyTwitchSignature(body, messageSignature, messageTimestamp, webhookSecret)) {
        console.error('Invalid signature')
        return new Response('Invalid signature', { 
          status: 401, 
          headers: corsHeaders 
        })
      }
    }

    if (messageType === 'notification') {
      const payload: TwitchEventSubPayload = JSON.parse(body)
      
      console.log('Received Twitch event:', {
        type: payload.subscription.type,
        broadcaster: payload.subscription.condition.broadcaster_user_id,
        event: payload.event
      })
      
      // Récupérer le streamer par son twitch_id
      const { data: streamer, error: streamerError } = await supabase
        .from('streamers')
        .select('id, status')
        .eq('twitch_id', payload.subscription.condition.broadcaster_user_id)
        .single()

      if (streamerError || !streamer) {
        console.error('Streamer not found:', payload.subscription.condition.broadcaster_user_id)
        return new Response('Streamer not found', { 
          status: 200, 
          headers: corsHeaders 
        })
      }

      if (streamer.status !== 'live') {
        console.log('Streamer not live, ignoring event')
        return new Response('Streamer not live', { 
          status: 200, 
          headers: corsHeaders 
        })
      }

      let timeToAdd = 0
      let eventType = ''
      let eventData = {}

      // Traiter selon le type d'événement
      switch (payload.subscription.type) {
        case 'channel.subscribe':
        case 'channel.subscription.gift':
        case 'channel.subscription.message':
          eventType = 'subs'
          const subTier = payload.event.tier || '1000'
          const tierMap: {[key: string]: string} = {
            '1000': 'T1',
            '2000': 'T2',
            '3000': 'T3'
          }
          
          eventData = {
            user_name: payload.event.user_name,
            tier: tierMap[subTier],
            is_gift: payload.event.is_gift || false
          }
          
          // Utiliser la fonction pour calculer le temps
          const { data: subTime } = await supabase.rpc('get_time_for_event', {
            p_streamer_id: streamer.id,
            p_event_type: 'subs',
            p_event_data: eventData
          })
          timeToAdd = subTime || 0
          break

        case 'channel.cheer':
          eventType = 'bits'
          const bits = payload.event.bits || 0
          
          eventData = {
            user_name: payload.event.user_name,
            bits: bits
          }
          
          // Utiliser la fonction pour calculer le temps
          const { data: bitsTime } = await supabase.rpc('get_time_for_event', {
            p_streamer_id: streamer.id,
            p_event_type: 'bits',
            p_event_data: eventData
          })
          timeToAdd = bitsTime || 0
          break

        default:
          console.log('Unhandled event type:', payload.subscription.type)
          return new Response('Event type not handled', { 
            status: 200, 
            headers: corsHeaders 
          })
      }

      if (timeToAdd > 0) {
        console.log(`Adding ${timeToAdd} seconds for ${eventType}`)
        
        // Utiliser la fonction pour ajouter le temps
        const { error: addTimeError } = await supabase.rpc('add_time_to_streamer', {
          p_streamer_id: streamer.id,
          p_time_seconds: timeToAdd,
          p_event_type: eventType,
          p_event_data: eventData,
          p_player_name: eventData.user_name || null
        })

        if (addTimeError) {
          console.error('Erreur lors de l\'ajout du temps:', addTimeError)
          return new Response('Error adding time', { 
            status: 500, 
            headers: corsHeaders 
          })
        }

        console.log(`Successfully added ${timeToAdd} seconds to streamer ${streamer.id}`)
      } else {
        console.log('No time to add for this event')
      }
    }

    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response('Internal Server Error', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})