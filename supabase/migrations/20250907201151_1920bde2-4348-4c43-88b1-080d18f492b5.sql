-- Fix functions with correct minigames table structure
-- The minigames table doesn't have a 'name' column

CREATE OR REPLACE FUNCTION public.get_safe_minigames()
RETURNS TABLE(id uuid, description text, is_active boolean, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    m.id,
    m.description,
    m.is_active,
    m.created_at
  FROM minigames m
  WHERE m.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_safe_minigames_public()
RETURNS TABLE(id uuid, description text, is_active boolean)
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
    SELECT 
        m.id,
        m.description,
        m.is_active
    FROM public.minigames m
    WHERE m.is_active = true
    ORDER BY m.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_minigame_code(minigame_id uuid)
RETURNS TABLE(id uuid, description text, component_code text, is_active boolean)
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
    SELECT 
        m.id,
        m.description,
        m.component_code,
        m.is_active
    FROM public.minigames m
    WHERE m.id = minigame_id 
      AND m.is_active = true
      AND auth.role() = 'authenticated';
$$;

-- Fix other functions with correct search_path
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