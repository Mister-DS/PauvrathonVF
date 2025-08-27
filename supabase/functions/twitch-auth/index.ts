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
    // Initialize Supabase client with service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

    // Create or get existing user using Twitch ID as unique identifier
    const email = twitchUser.email || `${twitchUser.login}@twitch.local`;
    
    // Try to find existing user by Twitch ID first
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('twitch_id', twitchUser.id)
      .single();

    let supabaseUser;
    let magicLinkData;
    
    if (existingProfile) {
      // User already exists, get their info
      const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(existingProfile.user_id);
      
      if (!userError && userData.user) {
        supabaseUser = userData.user;
        
        // Generate a magic link for automatic sign-in
        const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
          type: 'magiclink',
          email: userData.user.email!,
          options: {
            redirectTo: redirect_uri.replace('/auth/callback', '/decouverte')
          }
        });

        if (!linkError && linkData.properties?.action_link) {
          magicLinkData = linkData;
          console.log('Magic link generated for existing user');
        }
      }
    } else {
      // Create new user
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          twitch_id: twitchUser.id,
          twitch_username: twitchUser.login,
          twitch_display_name: twitchUser.display_name,
          avatar_url: twitchUser.profile_image_url,
        }
      });

      if (authError) {
        console.error('Failed to create user:', authError);
        throw new Error(`Failed to create user: ${authError.message}`);
      }

      supabaseUser = authData.user;
      
      // Generate a magic link for the new user
      const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: redirect_uri.replace('/auth/callback', '/decouverte')
        }
      });

      if (!linkError && linkData.properties?.action_link) {
        magicLinkData = linkData;
        console.log('Magic link generated for new user');
      }

      console.log('New user created successfully');
    }

    // Create or update profile
    if (supabaseUser) {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert({
          user_id: supabaseUser.id,
          twitch_id: twitchUser.id,
          twitch_username: twitchUser.login,
          twitch_display_name: twitchUser.display_name,
          avatar_url: twitchUser.profile_image_url,
        });

      if (profileError) {
        console.error('Profile upsert error:', profileError);
      }
    }

    const response = {
      success: true,
      twitch_user: twitchUser,
      access_token: tokenData.access_token,
      supabase_user: supabaseUser,
      magic_link: magicLinkData?.properties?.action_link,
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
})