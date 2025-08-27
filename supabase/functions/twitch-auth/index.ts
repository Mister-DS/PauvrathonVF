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

    const email = twitchUser.email || `${twitchUser.login}@twitch.local`;
    
    let supabaseUser;
    let sessionToken;
    
    // Step 1: Check if a profile exists with this Twitch ID
    console.log('Checking for existing profile with Twitch ID:', twitchUser.id);
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('twitch_id', twitchUser.id)
      .single();

    if (existingProfile) {
      console.log('Found existing profile, getting user data');
      // User already exists with this Twitch ID
      const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(existingProfile.user_id);
      
      if (!userError && userData.user) {
        supabaseUser = userData.user;
        console.log('Using existing user:', supabaseUser.id);
        
        // Generate a session for existing user by creating a magic link
        const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
          type: 'magiclink',
          email: supabaseUser.email!,
        });
        
        if (!linkError && linkData.properties?.hashed_token) {
          // Extract the access token from the magic link
          const url = new URL(linkData.properties.action_link);
          sessionToken = url.searchParams.get('access_token') || url.hash.split('access_token=')[1]?.split('&')[0];
          console.log('Generated session token for existing user');
        }
      }
    } else {
      // Step 2: Check if user exists by email (without Twitch connection)
      console.log('No profile found, checking for user by email:', email);
      const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
      const existingUserByEmail = existingUsers.users?.find(user => 
        user.email === email || 
        (user.email && user.email.includes(twitchUser.login))
      );

      if (existingUserByEmail) {
        console.log('Found existing user by email, updating with Twitch data');
        supabaseUser = existingUserByEmail;
        
        // Update existing user with Twitch metadata
        const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
          existingUserByEmail.id,
          {
            user_metadata: {
              ...existingUserByEmail.user_metadata,
              twitch_id: twitchUser.id,
              twitch_username: twitchUser.login,
              twitch_display_name: twitchUser.display_name,
              avatar_url: twitchUser.profile_image_url,
            }
          }
        );

        if (updateError) {
          console.error('Failed to update user metadata:', updateError);
        }

        // Generate session token
        const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
          type: 'magiclink',
          email: existingUserByEmail.email!,
        });
        
        if (!linkError && linkData.properties?.hashed_token) {
          const url = new URL(linkData.properties.action_link);
          sessionToken = url.searchParams.get('access_token') || url.hash.split('access_token=')[1]?.split('&')[0];
          console.log('Generated session token for updated user');
        }
      } else {
        // Step 3: Create completely new user
        console.log('Creating new user');
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
        console.log('New user created successfully:', supabaseUser.id);

        // Generate session token for new user  
        const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
        });
        
        if (!linkError && linkData.properties?.hashed_token) {
          const url = new URL(linkData.properties.action_link);
          sessionToken = url.searchParams.get('access_token') || url.hash.split('access_token=')[1]?.split('&')[0];
          console.log('Generated session token for new user');
        }
      }
    }

    // Create or update profile
    if (supabaseUser) {
      console.log('Upserting profile for user:', supabaseUser.id);
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
      } else {
        console.log('Profile updated successfully');
      }
    }

    const response = {
      success: true,
      twitch_user: twitchUser,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token, // Include Twitch refresh token
      supabase_user: supabaseUser,
      session_token: sessionToken, // This will be used to establish the session
    };

    console.log('Authentication completed successfully with session token');

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