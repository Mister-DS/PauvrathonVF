import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      .select('id, twitch_id, is_live');

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

    // Update streamers in database
    let updatedCount = 0;
    
    for (const streamer of streamers) {
      const twitchStream = allStreamData.find(stream => stream.user_id === streamer.twitch_id);
      
      const updateData = {
        is_live: !!twitchStream,
        stream_title: twitchStream?.title || null,
      };

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
      }
    }

    console.log(`🎉 Updated ${updatedCount} streamers successfully`);

    return new Response(
      JSON.stringify({ 
        message: 'Stream info updated successfully',
        updated: updatedCount,
        liveStreams: allStreamData.length,
        totalStreamers: streamers.length
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