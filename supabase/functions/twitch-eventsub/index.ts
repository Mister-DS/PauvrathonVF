import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, twitch-eventsub-message-signature, twitch-eventsub-message-id, twitch-eventsub-message-timestamp, twitch-eventsub-message-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TwitchEventSubEvent {
  subscription: {
    id: string;
    type: string;
    version: string;
    status: string;
    cost: number;
    condition: Record<string, any>;
    transport: {
      method: string;
      callback: string;
    };
    created_at: string;
  };
  event: Record<string, any>;
  challenge?: string;
}

interface TwitchSubEvent {
  user_id: string;
  user_login: string;
  user_name: string;
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  tier: string;
  is_gift: boolean;
}

interface TwitchBitsEvent {
  user_id: string;
  user_login: string;
  user_name: string;
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  bits: number;
  total_bits: number;
  message: string;
}

interface TwitchGiftSubEvent {
  user_id: string;
  user_login: string;
  user_name: string;
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  total: number;
  tier: string;
  cumulative_total: number | null;
  is_anonymous: boolean;
}

// Service pour traiter les événements Twitch
class TwitchEventService {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  /**
   * Calcule le temps à ajouter selon le type d'événement
   */
  private calculateTimeForEvent(eventType: string, eventData: any): number {
    switch (eventType) {
      case 'channel.subscribe':
        // Temps basé sur le tier de sub
        const tier = eventData.tier || '1000';
        const baseSubTime = {
          '1000': 30, // Tier 1: 30 secondes
          '2000': 60, // Tier 2: 60 secondes  
          '3000': 120 // Tier 3: 2 minutes
        };
        return baseSubTime[tier as keyof typeof baseSubTime] || 30;

      case 'channel.cheer':
        // 1 seconde par 100 bits, minimum 5 secondes
        const bits = eventData.bits || 0;
        return Math.max(Math.floor(bits / 100), 5);

      case 'channel.subscription.gift':
        // Temps par gift sub basé sur le tier et le nombre
        const giftTier = eventData.tier || '1000';
        const total = eventData.total || 1;
        const baseGiftTime = {
          '1000': 20, // Tier 1: 20 secondes par gift
          '2000': 40, // Tier 2: 40 secondes par gift
          '3000': 80  // Tier 3: 80 secondes par gift
        };
        return (baseGiftTime[giftTier as keyof typeof baseGiftTime] || 20) * total;

      default:
        return 0;
    }
  }

  /**
   * Trouve le streamer par Twitch ID
   */
  private async findStreamerByTwitchId(twitchId: string) {
    const { data, error } = await this.supabase
      .from('streamers')
      .select('*')
      .eq('twitch_id', twitchId)
      .single();

    if (error) {
      console.error('Erreur lors de la recherche du streamer:', error);
      return null;
    }

    return data;
  }

  /**
   * Traite un événement de subscription
   */
  async handleSubscription(event: TwitchSubEvent): Promise<boolean> {
    try {
      console.log('Traitement subscription event:', event);

      const streamer = await this.findStreamerByTwitchId(event.broadcaster_user_id);
      if (!streamer) {
        console.log('Streamer non trouvé pour Twitch ID:', event.broadcaster_user_id);
        return false;
      }

      const timeToAdd = this.calculateTimeForEvent('channel.subscribe', event);
      const playerName = event.is_gift ? 'Anonymous Gift' : event.user_name;

      // Insérer dans time_additions
      const { error: insertError } = await this.supabase
        .from('time_additions')
        .insert({
          streamer_id: streamer.id,
          event_type: 'channel.subscribe',
          event_data: event,
          time_seconds: timeToAdd,
          player_name: playerName
        });

      if (insertError) {
        console.error('Erreur insertion time_additions:', insertError);
        return false;
      }

      // Mettre à jour le total_time_added du streamer
      const { error: updateError } = await this.supabase
        .from('streamers')
        .update({
          total_time_added: streamer.total_time_added + timeToAdd,
          updated_at: new Date().toISOString()
        })
        .eq('id', streamer.id);

      if (updateError) {
        console.error('Erreur mise à jour streamer:', updateError);
        return false;
      }

      console.log(`Temps ajouté: ${timeToAdd}s pour ${playerName} (Sub Tier ${event.tier})`);
      return true;

    } catch (error) {
      console.error('Erreur traitement subscription:', error);
      return false;
    }
  }

  /**
   * Traite un événement de bits/cheer
   */
  async handleCheer(event: TwitchBitsEvent): Promise<boolean> {
    try {
      console.log('Traitement cheer event:', event);

      const streamer = await this.findStreamerByTwitchId(event.broadcaster_user_id);
      if (!streamer) {
        console.log('Streamer non trouvé pour Twitch ID:', event.broadcaster_user_id);
        return false;
      }

      const timeToAdd = this.calculateTimeForEvent('channel.cheer', event);

      // Insérer dans time_additions
      const { error: insertError } = await this.supabase
        .from('time_additions')
        .insert({
          streamer_id: streamer.id,
          event_type: 'channel.cheer',
          event_data: event,
          time_seconds: timeToAdd,
          player_name: event.user_name
        });

      if (insertError) {
        console.error('Erreur insertion time_additions:', insertError);
        return false;
      }

      // Mettre à jour le total_time_added du streamer
      const { error: updateError } = await this.supabase
        .from('streamers')
        .update({
          total_time_added: streamer.total_time_added + timeToAdd,
          updated_at: new Date().toISOString()
        })
        .eq('id', streamer.id);

      if (updateError) {
        console.error('Erreur mise à jour streamer:', updateError);
        return false;
      }

      console.log(`Temps ajouté: ${timeToAdd}s pour ${event.user_name} (${event.bits} bits)`);
      return true;

    } catch (error) {
      console.error('Erreur traitement cheer:', error);
      return false;
    }
  }

  /**
   * Traite un événement de gift subscription
   */
  async handleGiftSubscription(event: TwitchGiftSubEvent): Promise<boolean> {
    try {
      console.log('Traitement gift subscription event:', event);

      const streamer = await this.findStreamerByTwitchId(event.broadcaster_user_id);
      if (!streamer) {
        console.log('Streamer non trouvé pour Twitch ID:', event.broadcaster_user_id);
        return false;
      }

      const timeToAdd = this.calculateTimeForEvent('channel.subscription.gift', event);
      const playerName = event.is_anonymous ? 'Anonymous Gifter' : event.user_name;

      // Insérer dans time_additions
      const { error: insertError } = await this.supabase
        .from('time_additions')
        .insert({
          streamer_id: streamer.id,
          event_type: 'channel.subscription.gift',
          event_data: event,
          time_seconds: timeToAdd,
          player_name: playerName
        });

      if (insertError) {
        console.error('Erreur insertion time_additions:', insertError);
        return false;
      }

      // Mettre à jour le total_time_added du streamer
      const { error: updateError } = await this.supabase
        .from('streamers')
        .update({
          total_time_added: streamer.total_time_added + timeToAdd,
          updated_at: new Date().toISOString()
        })
        .eq('id', streamer.id);

      if (updateError) {
        console.error('Erreur mise à jour streamer:', updateError);
        return false;
      }

      console.log(`Temps ajouté: ${timeToAdd}s pour ${playerName} (${event.total} gift subs Tier ${event.tier})`);
      return true;

    } catch (error) {
      console.error('Erreur traitement gift subscription:', error);
      return false;
    }
  }

  /**
   * Traite un événement selon son type
   */
  async processEvent(eventData: TwitchEventSubEvent): Promise<boolean> {
    const eventType = eventData.subscription.type;
    const event = eventData.event;

    console.log(`Traitement événement type: ${eventType}`);

    switch (eventType) {
      case 'channel.subscribe':
        return await this.handleSubscription(event as TwitchSubEvent);

      case 'channel.cheer':
        return await this.handleCheer(event as TwitchBitsEvent);

      case 'channel.subscription.gift':
        return await this.handleGiftSubscription(event as TwitchGiftSubEvent);

      default:
        console.log(`Type d'événement non supporté: ${eventType}`);
        return true; // On retourne true pour ne pas causer d'erreur
    }
  }
}

/**
 * Vérifie la signature Twitch EventSub
 */
function verifyTwitchSignature(
  signature: string,
  messageId: string,
  timestamp: string,
  body: string,
  secret: string
): boolean {
  try {
    const message = messageId + timestamp + body;
    const expectedSignature = 'sha256=' + createHmac('sha256', secret)
      .update(message)
      .digest('hex');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('Erreur vérification signature:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérification de la méthode HTTP
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    // Récupération des headers Twitch
    const signature = req.headers.get('twitch-eventsub-message-signature');
    const messageId = req.headers.get('twitch-eventsub-message-id');
    const timestamp = req.headers.get('twitch-eventsub-message-timestamp');
    const messageType = req.headers.get('twitch-eventsub-message-type');

    if (!signature || !messageId || !timestamp || !messageType) {
      console.error('Headers Twitch manquants');
      return new Response('Missing Twitch headers', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Lecture du body
    const body = await req.text();
    let eventData: TwitchEventSubEvent;

    try {
      eventData = JSON.parse(body);
    } catch (error) {
      console.error('Erreur parsing JSON:', error);
      return new Response('Invalid JSON', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Vérification de la signature (optionnel en développement)
    const webhookSecret = Deno.env.get('TWITCH_WEBHOOK_SECRET');
    if (webhookSecret && !verifyTwitchSignature(signature, messageId, timestamp, body, webhookSecret)) {
      console.error('Signature Twitch invalide');
      return new Response('Invalid signature', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    // Gestion des différents types de messages
    switch (messageType) {
      case 'webhook_callback_verification':
        // Répondre avec le challenge pour vérifier le webhook
        const challenge = eventData.challenge;
        console.log('Vérification webhook, challenge:', challenge);
        return new Response(challenge, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain'
          }
        });

      case 'notification':
        // Traiter l'événement réel
        console.log('Événement reçu:', eventData.subscription.type);
        
        // Initialiser Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (!supabaseUrl || !supabaseServiceKey) {
          console.error('Configuration Supabase manquante');
          return new Response('Server configuration error', { 
            status: 500,
            headers: corsHeaders 
          });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const eventService = new TwitchEventService(supabase);

        // Traiter l'événement
        const success = await eventService.processEvent(eventData);
        
        if (success) {
          console.log('Événement traité avec succès');
          return new Response('OK', { 
            status: 200,
            headers: corsHeaders 
          });
        } else {
          console.error('Erreur traitement événement');
          return new Response('Event processing failed', { 
            status: 500,
            headers: corsHeaders 
          });
        }

      case 'revocation':
        // Subscription révoquée
        console.log('Subscription révoquée:', eventData.subscription.id);
        return new Response('OK', { 
          status: 200,
          headers: corsHeaders 
        });

      default:
        console.log('Type de message inconnu:', messageType);
        return new Response('Unknown message type', { 
          status: 400,
          headers: corsHeaders 
        });
    }

  } catch (error) {
    console.error('Erreur générale webhook:', error);
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});