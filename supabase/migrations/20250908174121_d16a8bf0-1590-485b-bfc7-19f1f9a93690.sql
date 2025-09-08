-- Fix Security Definer issue by removing SECURITY DEFINER from get_safe_minigames
-- This function only reads public data and doesn't need elevated privileges

CREATE OR REPLACE FUNCTION public.get_safe_minigames()
RETURNS TABLE(id uuid, component_code text, description text, is_active boolean, created_at timestamp with time zone)
LANGUAGE sql
STABLE
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