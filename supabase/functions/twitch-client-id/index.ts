const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWITCH_CLIENT_ID = Deno.env.get('TWITCH_CLIENT_ID');

    if (!TWITCH_CLIENT_ID) {
      throw new Error('Twitch Client ID not configured');
    }

    return new Response(JSON.stringify({ 
      client_id: TWITCH_CLIENT_ID 
    }), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      },
    });

  } catch (error) {
    console.error('Error getting Twitch Client ID:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
      },
    );
  }
});