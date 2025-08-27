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

// Generate a secure random password
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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

    console.log('🚀 Starting Twitch OAuth with code:', code.substring(0, 10) + '...');

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

    const email = twitchUser.email || `${twitchUser.login}@pauvrathon.twitch`;
    let supabaseUser;
    let userPassword = '';
    
    // Check if a profile exists with this Twitch ID
    console.log('🔍 Checking for existing profile with Twitch ID:', twitchUser.id);
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('twitch_id', twitchUser.id)
      .single();

    if (existingProfile) {
      console.log('✅ Found existing profile, getting user');
      // Get existing user
      const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(existingProfile.user_id);
      
      if (!userError && userData.user) {
        supabaseUser = userData.user;
        console.log('👤 Using existing user:', supabaseUser.id);
        
        // Generate a new password for this session
        userPassword = generateSecurePassword();
        
        // Update user password
        const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
          supabaseUser.id,
          { password: userPassword }
        );
        
        if (updateError) {
          console.error('❌ Failed to update password:', updateError);
          throw new Error('Failed to update user password');
        }
        
        console.log('✅ Password updated for existing user');
      }
    } else {
      // Check if user exists by email
      console.log('🔍 No profile found, checking by email:', email);
      const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
      const existingUserByEmail = existingUsers.users?.find(user => user.email === email);

      if (existingUserByEmail) {
        console.log('✅ Found existing user by email, linking Twitch');
        supabaseUser = existingUserByEmail;
        
        // Generate password and update user
        userPassword = generateSecurePassword();
        
        const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
          existingUserByEmail.id,
          {
            password: userPassword,
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
          console.error('❌ Failed to update user:', updateError);
          throw new Error('Failed to update user');
        }
        
        console.log('✅ User updated with Twitch data');
      } else {
        // Create new user
        console.log('➕ Creating new user');
        userPassword = generateSecurePassword();
        
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
          email: email,
          password: userPassword,
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
        console.log('✅ New user created:', supabaseUser.id);
      }
    }

    // Create or update profile
    if (supabaseUser) {
      console.log('🔄 Upserting profile...');
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

    // Return the credentials for direct sign-in
    const response = {
      success: true,
      twitch_user: twitchUser,
      supabase_user: supabaseUser,
      // Return credentials for direct authentication
      credentials: {
        email: supabaseUser.email,
        password: userPassword
      }
    };

    console.log('🎉 Authentication data prepared successfully');

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