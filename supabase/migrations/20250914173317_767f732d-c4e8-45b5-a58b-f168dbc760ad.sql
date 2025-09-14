-- Fix security issues with functions that don't need SECURITY DEFINER
-- Convert appropriate functions to SECURITY INVOKER to follow principle of least privilege

-- The get_current_user_role function can be SECURITY INVOKER since it only reads the user's own role
DROP FUNCTION IF EXISTS public.get_current_user_role();
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE 
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE user_id = auth.uid();
$$;

-- The is_admin function can be SECURITY INVOKER since it only checks the calling user's role
DROP FUNCTION IF EXISTS public.is_admin();
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::user_role
  );
$$;

-- The get_safe_minigames functions can be SECURITY INVOKER since they only read public data
DROP FUNCTION IF EXISTS public.get_safe_minigames();
CREATE OR REPLACE FUNCTION public.get_safe_minigames()
RETURNS TABLE(id uuid, component_code text, description text, is_active boolean, created_at timestamp with time zone)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT 
    m.id,
    m.component_code,
    m.description,
    m.is_active,
    m.created_at
  FROM minigames m
  WHERE m.is_active = true;
$$;

DROP FUNCTION IF EXISTS public.get_safe_minigames_public();
CREATE OR REPLACE FUNCTION public.get_safe_minigames_public()
RETURNS TABLE(id uuid, component_code text, description text, is_active boolean)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT 
        m.id,
        m.component_code,
        m.description,
        m.is_active
    FROM public.minigames m
    WHERE m.is_active = true
    ORDER BY m.created_at DESC;
$$;

-- The get_discovery_streamers function can be SECURITY INVOKER since it reads public streamer data
DROP FUNCTION IF EXISTS public.get_discovery_streamers();
CREATE OR REPLACE FUNCTION public.get_discovery_streamers()
RETURNS TABLE(id uuid, stream_title text, current_clicks integer, clicks_required integer, time_increment integer, active_minigames text[], twitch_display_name text, twitch_username text, avatar_url text)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT 
        s.id,
        s.stream_title,
        s.current_clicks,
        s.clicks_required,
        s.time_increment,
        s.active_minigames,
        p.twitch_display_name,
        p.twitch_username,
        p.avatar_url
    FROM public.streamers s
    JOIN public.profiles p ON s.user_id = p.user_id
    WHERE s.is_live = true
      AND auth.role() = 'authenticated'  -- Only for authenticated users
    ORDER BY s.created_at DESC;
$$;