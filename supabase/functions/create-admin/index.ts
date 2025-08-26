import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { email } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    // Specific admin email
    const ADMIN_EMAIL = 'dierickxsimon198@gmail.com';
    
    if (email !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized: Only the main admin can use this function' 
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Creating admin account for:', email);

    // Find user by email
    const { data: users, error: userError } = await supabaseClient.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error listing users:', userError);
      throw userError;
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      throw new Error(`User with email ${email} not found. Please sign up first.`);
    }

    console.log('Found user:', user.id);

    // Update or create profile with admin role
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        user_id: user.id,
        role: 'admin'
      });

    if (profileError) {
      console.error('Error updating profile:', profileError);
      throw profileError;
    }

    console.log('Admin profile created/updated successfully');

    return new Response(JSON.stringify({ 
      success: true,
      message: `Admin role granted to ${email}`,
      user_id: user.id
    }), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      },
    });

  } catch (error) {
    console.error('Create admin error:', error);
    
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