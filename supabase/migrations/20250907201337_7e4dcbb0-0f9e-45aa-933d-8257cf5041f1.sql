-- Fix functions to use component_code instead of name
CREATE OR REPLACE FUNCTION public.get_safe_minigames()
RETURNS TABLE(id uuid, component_code text, description text, is_active boolean, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.get_safe_minigames_public()
RETURNS TABLE(id uuid, component_code text, description text, is_active boolean)
LANGUAGE sql
STABLE
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.get_minigame_code(minigame_id uuid)
RETURNS TABLE(id uuid, component_code text, description text, code text, is_active boolean)
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
    SELECT 
        m.id,
        m.component_code,
        m.description,
        m.component_code as code,
        m.is_active
    FROM public.minigames m
    WHERE m.id = minigame_id 
      AND m.is_active = true
      AND auth.role() = 'authenticated';
$$;