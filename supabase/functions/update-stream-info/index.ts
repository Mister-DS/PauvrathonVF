import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fonction pour configurer EventSub automatiquement
async function setupEventSubForStreamer(twitchId: string) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    console.log(`🚀 Configuration automatique EventSub pour streamer ${twitchId}`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/setup-twitch-eventsub`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        action: 'setup',
        broadcasterUserId: twitchId
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ EventSub configuré automatiquement pour ${twitchId}:`, result.subscriptions);
    } else {
      console.error(`❌ Échec configuration EventSub pour ${twitchId}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Erreur lors de la configuration EventSub automatique:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting stream info update...');
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Twitch credentials
    const twitchClientId = Deno.env.get('TWITCH_CLIENT_ID');
    const twitchClientSecret = Deno.env.get('TWITCH_CLIENT_SECRET');

    if (!twitchClientId || !twitchClientSecret) {
      throw new Error('Missing Twitch credentials');
    }

    console.log('🔑 Getting Twitch app access token...');
    
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
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get Twitch access token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log('✅ Got access token, fetching streamers...');

    // Get all streamers from database
    const { data: streamers, error: streamersError } = await supabase
      .from('streamers')
      .select('id, twitch_id, is_live, status');

    if (streamersError) {
      throw streamersError;
    }

    if (!streamers || streamers.length === 0) {
      console.log('ℹ️ No streamers found in database');
      return new Response(
        JSON.stringify({ message: 'No streamers found', updated: 0 }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`📊 Found ${streamers.length} streamers, checking their status...`);

    // Get stream info from Twitch for all streamers
    const twitchIds = streamers.map(s => s.twitch_id).filter(Boolean);
    
    if (twitchIds.length === 0) {
      console.log('⚠️ No valid Twitch IDs found');
      return new Response(
        JSON.stringify({ message: 'No valid Twitch IDs', updated: 0 }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Batch request for stream data (max 100 per request)
    const batchSize = 100;
    const allStreamData = [];

    for (let i = 0; i < twitchIds.length; i += batchSize) {
      const batch = twitchIds.slice(i, i + batchSize);
      const userIdParams = batch.map(id => `user_id=${id}`).join('&');
      
      console.log(`🔍 Fetching batch ${Math.floor(i/batchSize) + 1}...`);
      
      const streamsResponse = await fetch(
        `https://api.twitch.tv/helix/streams?${userIdParams}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Client-Id': twitchClientId,
          },
        }
      );

      if (!streamsResponse.ok) {
        console.error('❌ Failed to fetch stream data:', await streamsResponse.text());
        continue;
      }

      const streamsData = await streamsResponse.json();
      allStreamData.push(...(streamsData.data || []));
    }

    console.log(`📺 Found ${allStreamData.length} live streams`);

    // Update streamers in database and setup EventSub for newly live streamers
    let updatedCount = 0;
    let eventSubSetupCount = 0;
    
    for (const streamer of streamers) {
      const twitchStream = allStreamData.find(stream => stream.user_id === streamer.twitch_id);
      const isCurrentlyLive = !!twitchStream;
      const wasLive = streamer.is_live || streamer.status === 'live';
      
      // Déterminer le nouveau statut
      let newStatus = streamer.status;
      if (isCurrentlyLive && !wasLive) {
        newStatus = 'live';
        console.log(`🟢 ${streamer.twitch_id} vient de passer en live`);
      } else if (!isCurrentlyLive && wasLive) {
        newStatus = 'offline';
        console.log(`🔴 ${streamer.twitch_id} n'est plus en live`);
      }

      const updateData = {
        is_live: isCurrentlyLive,
        status: newStatus,
        stream_title: twitchStream?.title || null,
      };

      // Si le streamer vient de passer en live, ajouter les timestamps
      if (isCurrentlyLive && !wasLive) {
        updateData.stream_started_at = new Date().toISOString();
        updateData.pause_started_at = null;
      }

      const { error: updateError } = await supabase
        .from('streamers')
        .update(updateData)
        .eq('id', streamer.id);

      if (updateError) {
        console.error(`❌ Failed to update streamer ${streamer.id}:`, updateError);
      } else {
        updatedCount++;
        if (twitchStream) {
          console.log(`✅ Updated ${streamer.twitch_id}: "${twitchStream.title}"`);
        }

        // 🚀 NOUVEAU: Configuration automatique EventSub pour les nouveaux streams live
        if (isCurrentlyLive && !wasLive && streamer.twitch_id) {
          console.log(`🎯 Nouveau stream détecté, configuration EventSub...`);
          const eventSubResult = await setupEventSubForStreamer(streamer.twitch_id);
          if (eventSubResult.success) {
            eventSubSetupCount++;
          }
        }
      }
    }

    console.log(`🎉 Updated ${updatedCount} streamers successfully`);
    if (eventSubSetupCount > 0) {
      console.log(`🔔 EventSub configuré pour ${eventSubSetupCount} nouveaux streams`);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Stream info updated successfully',
        updated: updatedCount,
        liveStreams: allStreamData.length,
        totalStreamers: streamers.length,
        eventSubConfigured: eventSubSetupCount
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('💥 Error updating stream info:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});