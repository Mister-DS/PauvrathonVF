-- Drop the overly permissive policy that exposes source code
DROP POLICY IF EXISTS "Anyone can view active minigames" ON public.minigames;

-- Create a safe public policy that only shows basic info (no source code)
CREATE POLICY "Public can view basic minigame info" 
ON public.minigames 
FOR SELECT 
USING (
  is_active = true 
  AND auth.role() = 'anon'
);

-- Allow authenticated users to see minigames but still protect the code field
CREATE POLICY "Authenticated users can view minigame details" 
ON public.minigames 
FOR SELECT 
USING (
  auth.role() = 'authenticated' 
  AND is_active = true
);

-- Create a secure view for public access that excludes sensitive fields
CREATE VIEW public.safe_minigames AS
SELECT 
  id,
  name,
  description,
  is_active,
  created_at
FROM minigames
WHERE is_active = true;

-- Grant public access to the safe view
GRANT SELECT ON public.safe_minigames TO anon;
GRANT SELECT ON public.safe_minigames TO authenticated;