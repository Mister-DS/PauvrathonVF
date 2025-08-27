-- Fix security vulnerability: Implement selective profile visibility
-- Drop the current policy that allows all authenticated users to view all profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create a more restrictive policy that allows users to:
-- 1. View their own profile
-- 2. View profiles of users with 'streamer' role (for discovery)
-- 3. View profiles of users with 'admin' role (for transparency)
CREATE POLICY "Selective profile visibility" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id OR  -- Users can view their own profile
  role IN ('streamer', 'admin')  -- Anyone can view streamer and admin profiles for discovery
);

-- Keep the existing secure policies for insert and update unchanged