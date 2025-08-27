-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Selective profile visibility" ON public.profiles;

-- Create more restrictive policies
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

-- Create a public view for safe streamer discovery (no sensitive data)
CREATE VIEW public.public_streamer_profiles AS
SELECT 
  p.id,
  p.twitch_display_name,
  p.avatar_url,
  p.role,
  s.is_live,
  s.stream_title
FROM profiles p
LEFT JOIN streamers s ON p.user_id = s.user_id
WHERE p.role = 'streamer'::user_role 
  AND s.is_live = true;

-- Allow public access to the safe view
CREATE POLICY "Public can view live streamer basic info" 
ON public.public_streamer_profiles 
FOR SELECT 
USING (true);