-- Drop the unprotected view
DROP VIEW IF EXISTS public.safe_minigames;

-- Enable RLS on minigames table if not already enabled
ALTER TABLE public.minigames ENABLE ROW LEVEL SECURITY;

-- Create a more secure approach: use the existing minigames table with proper policies
-- First, let's check what policies exist and recreate them properly

-- Drop existing policies to recreate them securely
DROP POLICY IF EXISTS "Public can view basic minigame info" ON public.minigames;
DROP POLICY IF EXISTS "Authenticated users can view minigame details" ON public.minigames;

-- Create secure policies for minigames table
CREATE POLICY "Public can view active minigames basic info" 
ON public.minigames 
FOR SELECT 
USING (
  is_active = true 
  AND auth.role() = 'anon'
);

CREATE POLICY "Authenticated users can view active minigames" 
ON public.minigames 
FOR SELECT 
USING (
  auth.role() = 'authenticated' 
  AND is_active = true
);

-- Admins can manage all minigames (this policy should already exist)
-- But let's ensure it's properly set
CREATE POLICY "Admins can manage all minigames" 
ON public.minigames 
FOR ALL
USING (public.get_current_user_role() = 'admin');

-- Now create a secure function instead of a view for safe minigame access
CREATE OR REPLACE FUNCTION public.get_safe_minigames()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  is_active boolean,
  created_at timestamptz
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
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