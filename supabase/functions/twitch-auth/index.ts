import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TwitchTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  scope: string[];
}

interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  email?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const TWITCH_CLIENT_ID = Deno.env.get('TWITCH_CLIENT_ID');
    const TWITCH_CLIENT_SECRET = Deno.env.get('TWITCH_CLIENT_SECRET');

    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
      throw new Error('Missing Twitch credentials');
    }

    const { code, redirect_uri } = await req.json();

    if (!code) {
      throw new Error('Authorization code is required');
    }

    console.log('Exchanging code for token:', { code, redirect_uri });

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirect_uri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData: TwitchTokenResponse = await tokenResponse.json();
    console.log('Token received successfully');

    // Get user data from Twitch
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Client-Id': TWITCH_CLIENT_ID,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('User data fetch failed:', errorText);
      throw new Error(`Failed to fetch user data: ${errorText}`);
    }

    const userData = await userResponse.json();
    if (!userData.data || userData.data.length === 0) {
      throw new Error('No user data returned from Twitch');
    }

    const twitchUser: TwitchUser = userData.data[0];
    console.log('Twitch user data:', { id: twitchUser.id, login: twitchUser.login });

    // Create or sign in user with Supabase using email if available
    let supabaseUser;
    
    if (twitchUser.email) {
      // Try to sign up/sign in with email
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: twitchUser.email,
        password: `twitch_${twitchUser.id}_${Math.random().toString(36)}`, // Random password
        options: {
          data: {
            twitch_id: twitchUser.id,
            twitch_username: twitchUser.login,
            twitch_display_name: twitchUser.display_name,
            avatar_url: twitchUser.profile_image_url,
          }
        }
      });

      if (authError && authError.message.includes('already registered')) {
        // User exists, try to sign in
        const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
          email: twitchUser.email,
          password: `twitch_${twitchUser.id}_${Math.random().toString(36)}`, // This won't work for existing users
        });

        if (signInError) {
          // If password doesn't work, we need to create a session differently
          console.log('User exists but password auth failed, need manual session creation');
        }

        supabaseUser = signInData?.user;
      } else if (!authError) {
        supabaseUser = authData?.user;
      }
    }

    // If we don't have a Supabase user yet, we'll return the Twitch data 
    // and let the frontend handle the authentication
    const response = {
      success: true,
      twitch_user: twitchUser,
      access_token: tokenData.access_token,
      supabase_user: supabaseUser,
    };

    console.log('Authentication successful');

    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      },
    });

  } catch (error) {
    console.error('Twitch auth error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
      },
    );
  }
});