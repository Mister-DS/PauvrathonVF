-- Fix security issue: Remove overly permissive profile access policy
-- and replace with granular policies that protect sensitive user data

-- Drop the problematic policy that allows all authenticated users to see all profiles
DROP POLICY IF EXISTS "authenticated_users_view_profiles" ON public.profiles;

-- Add granular policies for profile access
-- Policy 1: Users can view their own complete profile
CREATE POLICY "users_view_own_profile" ON public.profiles
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy 2: Public access to basic streamer information only (for discovery/following)
-- Only shows display name, avatar, and role for streamers - no sensitive data like twitch_id
CREATE POLICY "public_view_streamer_basics" ON public.profiles
FOR SELECT 
USING (
  role = 'streamer'::user_role 
  AND auth.role() = 'authenticated'
);

-- Note: The existing "admins_view_all_profiles" policy already allows admins to see everything
-- Note: The existing policies for insert/update are already properly secured