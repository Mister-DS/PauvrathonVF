-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Selective profile visibility" ON public.profiles;

-- Create more restrictive policies for profiles table
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view basic streamer info" 
ON public.profiles 
FOR SELECT 
USING (
  auth.role() = 'authenticated' 
  AND role = 'streamer'::user_role
);

-- Create admin policy for full access
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.user_id = auth.uid() 
    AND p2.role = 'admin'::user_role
  )
);