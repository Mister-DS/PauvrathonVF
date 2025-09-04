// supabase/functions/delete-user/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Gérer les requêtes CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  // Vérifier l'authentification
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        persistSession: false,
      },
    },
  );

  // Client avec token utilisateur pour vérifier l'auth
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { authorization: authHeader }
      }
    }
  );

  try {
    // Vérifier que l'utilisateur est bien connecté
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Vérifier que l'utilisateur supprime bien son propre compte
    if (userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Can only delete your own account' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Starting deletion process for user: ${userId}`);

    // Récupérer le profil utilisateur
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
      return new Response(JSON.stringify({ error: 'Error fetching user profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Si streamer, vérifier qu'il n'est pas en live
    if (profile?.role === 'streamer') {
      const { data: streamerData, error: streamerError } = await supabaseAdmin
        .from('streamers')
        .select('status, id')
        .eq('user_id', userId)
        .single();

      if (!streamerError && streamerData?.status === 'live') {
        return new Response(JSON.stringify({ error: 'Cannot delete account while streaming live' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Si c'est un streamer, supprimer les données liées
      if (streamerData?.id) {
        const streamerId = streamerData.id;
        
        console.log('Deleting streamer-related data...');

        // Supprimer les time_additions
        await supabaseAdmin.from('time_additions').delete().eq('streamer_id', streamerId);

        // Supprimer les game_sessions
        await supabaseAdmin.from('game_sessions').delete().eq('streamer_id', streamerId);

        // Supprimer les overlay_configs
        await supabaseAdmin.from('overlay_configs').delete().eq('streamer_id', streamerId);

        // Supprimer les subathon_stats
        await supabaseAdmin.from('subathon_stats').delete().eq('streamer_id', streamerId);

        // Supprimer les user_follows
        await supabaseAdmin.from('user_follows').delete().eq('streamer_id', streamerId);

        // Supprimer les streamer_event_time_settings
        await supabaseAdmin.from('streamer_event_time_settings').delete().eq('streamer_id', streamerId);

        // Supprimer le streamer
        await supabaseAdmin.from('streamers').delete().eq('id', streamerId);
      }
    }

    // Supprimer les données utilisateur générales
    console.log('Deleting user-related data...');

    // Supprimer user_follows (en tant que follower)
    if (profile?.id) {
      await supabaseAdmin.from('user_follows').delete().eq('follower_user_id', userId);
    }

    // Supprimer streamer_requests
    if (profile?.id) {
      await supabaseAdmin.from('streamer_requests').delete().eq('user_id', profile.id);
    }

    // Supprimer user_tokens
    await supabaseAdmin.from('user_tokens').delete().eq('user_id', userId);

    // Supprimer les références dans minigames
    await supabaseAdmin.from('minigames').delete().eq('created_by', userId);

    // Supprimer le profil
    await supabaseAdmin.from('profiles').delete().eq('user_id', userId);

    // Finalement, supprimer l'utilisateur de l'auth
    console.log('Deleting user from auth...');
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      // Si l'utilisateur n'existe pas déjà, c'est OK
      if (deleteUserError.message.includes('not found')) {
        console.log('User already deleted from auth');
      } else {
        console.error('Error deleting user from auth:', deleteUserError);
        return new Response(JSON.stringify({ error: 'Failed to delete user account' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    console.log(`User ${userId} and associated data deleted successfully.`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'User account and all associated data have been deleted' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});