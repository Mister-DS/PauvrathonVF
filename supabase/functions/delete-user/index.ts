// supabase/functions/delete-user/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Gérer les requêtes CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Tente de supprimer l'utilisateur
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      // Gérer le cas où l'utilisateur n'est pas trouvé
      if (error.message.includes('not found')) {
        return new Response(JSON.stringify({ message: 'User already deleted or not found' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      throw error;
    }

    // La suppression en cascade s'occupe de la table 'profiles'
    console.log(`User ${userId} and associated data deleted successfully.`);

    return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
