import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EventSubSubscription {
  type: string;
  condition: {
    broadcaster_user_id: string;
  };
  transport: {
    method: string;
    callback: string;
  };
}

// Fonction pour créer un abonnement EventSub
async function createEventSubSubscription(
  twitchClientId: string,
  twitchAccessToken: string,
  subscription: EventSubSubscription
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
  try {
    const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${twitchAccessToken}`,
        'Client-Id': twitchClientId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erreur création EventSub:', data);
      return { 
        success: false, 
        error: `Erreur ${response.status}: ${data.message || 'Erreur inconnue'}` 
      };
    }

    console.log('EventSub créé avec succès:', data.data[0]);
    return { 
      success: true, 
      subscriptionId: data.data[0].id 
    };

  } catch (error) {
    console.error('Erreur lors de la création EventSub:', error);
    return { 
      success: false, 
      error: `Erreur réseau: ${error.message}` 
    };
  }
}

// Fonction principale pour configurer tous les événements d'un streamer
async function setupStreamerEventSub(
  twitchClientId: string,
  twitchAccessToken: string,
  broadcasterUserId: string,
  webhookUrl: string
): Promise<{ success: boolean; subscriptions: string[]; errors: string[] }> {
  const results = {
    success: true,
    subscriptions: [] as string[],
    errors: [] as string[]
  };

  // Types d'événements à surveiller
  const eventTypes = [
    'channel.subscribe',           // Abonnements normaux
    'channel.subscription.gift',   // Abonnements offerts
    'channel.cheer'               // Bits/Cheers
  ];

  for (const eventType of eventTypes) {
    const subscription: EventSubSubscription = {
      type: eventType,
      condition: {
        broadcaster_user_id: broadcasterUserId
      },
      transport: {
        method: 'webhook',
        callback: webhookUrl
      }
    };

    const result = await createEventSubSubscription(twitchClientId, twitchAccessToken, subscription);
    
    if (result.success && result.subscriptionId) {
      results.subscriptions.push(result.subscriptionId);
      console.log(`✅ EventSub créé: ${eventType} -> ${result.subscriptionId}`);
    } else {
      results.success = false;
      results.errors.push(`❌ ${eventType}: ${result.error}`);
      console.error(`Échec EventSub pour ${eventType}:`, result.error);
    }

    // Petite pause entre les appels API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    // Récupération des paramètres
    const { action, broadcasterUserId } = await req.json();

    // Variables d'environnement
    const twitchClientId = Deno.env.get('TWITCH_CLIENT_ID');
    const twitchAccessToken = Deno.env.get('TWITCH_ACCESS_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const webhookUrl = `${supabaseUrl}/functions/v1/twitch-eventsub`;

    if (!twitchClientId || !twitchAccessToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuration Twitch manquante (CLIENT_ID ou ACCESS_TOKEN)'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'setup') {
      if (!broadcasterUserId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'broadcaster_user_id requis'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`🚀 Configuration EventSub pour broadcaster: ${broadcasterUserId}`);
      console.log(`📡 Webhook URL: ${webhookUrl}`);

      const setupResult = await setupStreamerEventSub(
        twitchClientId,
        twitchAccessToken,
        broadcasterUserId,
        webhookUrl
      );

      // Sauvegarder les IDs d'abonnement en base
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supabaseServiceKey && setupResult.subscriptions.length > 0) {
        const supabase = createClient(supabaseUrl!, supabaseServiceKey);
        try {
          const { error: dbError } = await supabase
            .from('streamers')
            .update({
              twitch_eventsub_subscriptions: setupResult.subscriptions,
              updated_at: new Date().toISOString()
            })
            .eq('twitch_id', broadcasterUserId);

          if (dbError) {
            console.warn('Impossible de sauvegarder les IDs d\'abonnement:', dbError);
          } else {
            console.log('✅ IDs EventSub sauvegardés en base');
          }
        } catch (error) {
          console.warn('Erreur sauvegarde base:', error);
        }
      }

      return new Response(JSON.stringify(setupResult), {
        status: setupResult.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Action non supportée'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erreur générale:', error);
    return new Response(JSON.stringify({
      success: false,
      error: `Erreur serveur: ${error.message}`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});