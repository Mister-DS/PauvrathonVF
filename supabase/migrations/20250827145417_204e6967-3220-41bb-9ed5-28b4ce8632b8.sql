-- Fix security vulnerability: Restrict streamers table access to authenticated users only
-- Drop the overly permissive policy that allows anyone to view streamers
DROP POLICY IF EXISTS "Anyone can view streamers" ON public.streamers;

-- Create a new policy that only allows authenticated users to view streamers
CREATE POLICY "Authenticated users can view streamers" 
ON public.streamers 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Keep the existing secure policies:
-- - Admins can manage streamers (already secure) ✓
-- - Streamers can update their own data (already secure) ✓