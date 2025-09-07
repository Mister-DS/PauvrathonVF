-- Fix remaining security issues from the linter

-- 1. Fix the security definer view issue
-- Drop and recreate streamers_public view without SECURITY DEFINER
DROP VIEW IF EXISTS public.streamers_public;

CREATE VIEW public.streamers_public AS
SELECT 
    s.id,
    s.stream_title,
    s.current_clicks,
    s.clicks_required,
    s.total_time_added,
    s.is_live,
    s.status,
    s.twitch_id,
    s.stream_started_at,
    s.created_at,
    s.updated_at
FROM public.streamers s
WHERE s.is_live = true;

-- 2. Fix functions with mutable search paths
-- Update all functions to have SET search_path = 'public'

-- Update existing functions that are missing search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role::text FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.create_admin_streamer_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    admin_profile_record RECORD;
BEGIN
    -- Get the current admin profile
    SELECT * INTO admin_profile_record 
    FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin';
    
    -- Check if user is admin
    IF admin_profile_record.id IS NULL THEN
        RAISE EXCEPTION 'Only admins can create streamer profiles';
    END IF;
    
    -- Check if streamer profile already exists
    IF EXISTS (SELECT 1 FROM streamers WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Streamer profile already exists';
    END IF;
    
    -- Create streamer profile
    INSERT INTO streamers (
        user_id,
        twitch_id,
        stream_title,
        is_live
    ) VALUES (
        auth.uid(),
        admin_profile_record.twitch_id,
        'Subathon Admin Test Stream',
        true
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_cascade(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Vérifier que c'est bien l'utilisateur qui fait la demande
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Vous ne pouvez supprimer que votre propre compte';
  END IF;

  -- Supprimer les données en cascade (ordre important pour les contraintes FK)
  DELETE FROM public.subathon_stats WHERE streamer_id IN (
    SELECT id FROM public.streamers WHERE user_id = user_id
  );
  
  DELETE FROM public.game_sessions WHERE streamer_id IN (
    SELECT id FROM public.streamers WHERE user_id = user_id
  );
  
  DELETE FROM public.user_follows WHERE follower_user_id = user_id;
  DELETE FROM public.user_follows WHERE streamer_id IN (
    SELECT id FROM public.streamers WHERE user_id = user_id
  );
  
  DELETE FROM public.streamers WHERE user_id = user_id;
  DELETE FROM public.streamer_requests WHERE user_id = user_id;
  DELETE FROM public.profiles WHERE user_id = user_id;
END;
$$;