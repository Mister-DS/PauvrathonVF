-- Fix profiles table RLS policy to restrict access to authenticated users only
-- This addresses the security vulnerability where anonymous users can access all profile data

-- Drop the existing public policy that allows anyone to view profiles
DROP POLICY IF EXISTS "public_profiles_viewable" ON public.profiles;

-- Create new restricted policy for authenticated users only
CREATE POLICY "authenticated_users_view_profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Add policy for users to view their own profile specifically
CREATE POLICY "users_view_own_profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Create policy for admins to view all profiles
CREATE POLICY "admins_view_all_profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);