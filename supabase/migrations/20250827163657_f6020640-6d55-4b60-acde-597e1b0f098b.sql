-- Remove the dangerous policy that exposes game source code to anonymous users
DROP POLICY IF EXISTS "Public can view active minigames basic info" ON public.minigames;

-- Block all anonymous direct access to minigames table
CREATE POLICY "Block all anonymous access to minigames" 
ON public.minigames 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Create a secure function for public minigame discovery (NO CODE EXPOSURE)
CREATE OR REPLACE FUNCTION public.get_safe_minigames_public()
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    is_active boolean
)
LANGUAGE SQL
STABLE
SET search_path = public
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

-- Grant execution to anonymous users for basic info only
GRANT EXECUTE ON FUNCTION public.get_safe_minigames_public() TO anon;
GRANT EXECUTE ON FUNCTION public.get_safe_minigames_public() TO authenticated;

-- Create a secure function for authenticated users to get minigame code
CREATE OR REPLACE FUNCTION public.get_minigame_code(minigame_id uuid)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    code text,
    is_active boolean
)
LANGUAGE SQL
STABLE
SET search_path = public
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
      AND auth.role() = 'authenticated';  -- Only authenticated users can see code
$$;

-- Grant execution only to authenticated users for code access
GRANT EXECUTE ON FUNCTION public.get_minigame_code(uuid) TO authenticated;