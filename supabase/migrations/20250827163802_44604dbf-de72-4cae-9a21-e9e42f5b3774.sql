-- Ensure admins and authenticated users can still access minigames properly
-- The previous policies should already allow this, but let's make sure

-- Update the admin policy to be more explicit
DROP POLICY IF EXISTS "Admins can manage minigames" ON public.minigames;

-- Recreate clear admin access
CREATE POLICY "Admins have full access to minigames" 
ON public.minigames 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow authenticated users to view active minigames (including code for gameplay)
CREATE POLICY "Authenticated users can view active minigames with code" 
ON public.minigames 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Note: Anonymous users are still completely blocked by the "Block all anonymous access to minigames" policy