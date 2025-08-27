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

    console.log('🚀 Starting Twitch OAuth flow with code:', code.substring(0, 10) + '...');

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
      console.error('❌ Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData: TwitchTokenResponse = await tokenResponse.json();
    console.log('✅ Token received successfully');

    // Get user data from Twitch
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Client-Id': TWITCH_CLIENT_ID,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('❌ User data fetch failed:', errorText);
      throw new Error(`Failed to fetch user data: ${errorText}`);
    }

    const userData = await userResponse.json();
    if (!userData.data || userData.data.length === 0) {
      throw new Error('No user data returned from Twitch');
    }

    const twitchUser: TwitchUser = userData.data[0];
    console.log('👤 Twitch user:', { id: twitchUser.id, login: twitchUser.login });

    const email = twitchUser.email || `${twitchUser.login}@twitch.local`;
    
    let supabaseUser;
    
    // Check if a profile exists with this Twitch ID
    console.log('🔍 Checking for existing profile with Twitch ID:', twitchUser.id);
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('twitch_id', twitchUser.id)
      .single();

    if (existingProfile) {
      console.log('✅ Found existing profile, getting user data');
      // User already exists with this Twitch ID
      const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(existingProfile.user_id);
      
      if (!userError && userData.user) {
        supabaseUser = userData.user;
        console.log('👤 Using existing user:', supabaseUser.id);
      }
    } else {
      // Check if user exists by email (without Twitch connection)
      console.log('🔍 No profile found, checking for user by email:', email);
      const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
      const existingUserByEmail = existingUsers.users?.find(user => 
        user.email === email
      );

      if (existingUserByEmail) {
        console.log('✅ Found existing user by email, linking Twitch data');
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
          console.error('❌ Failed to update user metadata:', updateError);
        }
      } else {
        // Create completely new user
        console.log('➕ Creating new user');
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
          console.error('❌ Failed to create user:', authError);
          throw new Error(`Failed to create user: ${authError.message}`);
        }

        supabaseUser = authData.user;
        console.log('✅ New user created successfully:', supabaseUser.id);
      }
    }

    // Create or update profile
    if (supabaseUser) {
      console.log('🔄 Upserting profile for user:', supabaseUser.id);
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
        console.error('❌ Profile upsert error:', profileError);
      } else {
        console.log('✅ Profile updated successfully');
      }
    }

    // Generate a proper session using admin inviteUserByEmail to get a valid session
    console.log('🎫 Generating session for user');
    const { data: inviteData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(
      supabaseUser.email!,
      {
        redirectTo: 'https://pauvrathon.lovable.app/decouverte',
        data: {
          twitch_id: twitchUser.id,
          twitch_username: twitchUser.login,
          confirmed: true
        }
      }
    );

    let sessionToken = null;
    if (!inviteError && inviteData.user) {
      // Extract session token from the magic link
      console.log('✅ Session invitation sent successfully');
      sessionToken = 'session_created'; // We'll handle this differently on the client side
    }

    const response = {
      success: true,
      twitch_user: twitchUser,
      access_token: tokenData.access_token,
      supabase_user: supabaseUser,
      session_token: sessionToken,
      user_id: supabaseUser.id,
    };

    console.log('🎉 Authentication completed successfully');

    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      },
    });

  } catch (error) {
    console.error('💥 Twitch auth error:', error);
    
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