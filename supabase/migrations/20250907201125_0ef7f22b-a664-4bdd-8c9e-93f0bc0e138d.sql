-- Fix all remaining functions with missing search_path parameter

-- Update all remaining functions that need search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH deleted AS (
    DELETE FROM public.user_tokens 
    WHERE token_expires_at IS NOT NULL 
      AND token_expires_at < now()
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM deleted;
$$;

CREATE OR REPLACE FUNCTION public.auto_cleanup_expired_tokens()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Nettoyer les tokens expirés lors de chaque insertion
  DELETE FROM public.user_tokens 
  WHERE token_expires_at IS NOT NULL 
    AND token_expires_at < now();
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_safe_minigames()
RETURNS TABLE(id uuid, name text, description text, is_active boolean, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    m.id,
    m.name,
    m.description,
    m.is_active,
    m.created_at
  FROM minigames m
  WHERE m.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_discovery_streamers()
RETURNS TABLE(id uuid, stream_title text, current_clicks integer, clicks_required integer, time_increment integer, active_minigames text[], twitch_display_name text, twitch_username text, avatar_url text)
LANGUAGE sql
STABLE
SET search_path = 'public'
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
      AND auth.role() = 'authenticated'
    ORDER BY s.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_safe_minigames_public()
RETURNS TABLE(id uuid, name text, description text, is_active boolean)
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
    SELECT 
        m.id,
        m.name,
        m.description,
        m.is_active
    FROM public.minigames m
    WHERE m.is_active = true
    ORDER BY m.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_minigame_code(minigame_id uuid)
RETURNS TABLE(id uuid, name text, description text, code text, is_active boolean)
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
    SELECT 
        m.id,
        m.name,
        m.description,
        m.code,
        m.is_active
    FROM public.minigames m
    WHERE m.id = minigame_id 
      AND m.is_active = true
      AND auth.role() = 'authenticated';
$$;

-- Update remaining functions with search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;