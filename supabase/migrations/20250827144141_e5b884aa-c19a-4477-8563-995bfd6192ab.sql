-- Fix security vulnerability: Restrict profile access to authenticated users only
-- Drop the overly permissive policy that allows anyone to view all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a new policy that only allows authenticated users to view profiles
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Keep the existing policies for insert and update (they're already secure)
-- Users can insert their own profile: auth.uid() = user_id ✓
-- Users can update their own profile: auth.uid() = user_id ✓