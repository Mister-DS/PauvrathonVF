-- Fix the overly permissive RLS policy on subathon_stats table
-- Remove the "Anyone can view stats" policy that allows unrestricted access
DROP POLICY IF EXISTS "Anyone can view stats" ON public.subathon_stats;

-- Create proper privacy-respecting RLS policies
-- Policy 1: Players can view their own stats
CREATE POLICY "Players can view their own stats" 
ON public.subathon_stats 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.twitch_username = subathon_stats.player_twitch_username
  )
);

-- Policy 2: Streamers can view stats for their streams
CREATE POLICY "Streamers can view their stream stats" 
ON public.subathon_stats 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.streamers 
    WHERE streamers.id = subathon_stats.streamer_id 
    AND streamers.user_id = auth.uid()
  )
);

-- Policy 3: Admins can view all stats (for moderation)
CREATE POLICY "Admins can view all stats" 
ON public.subathon_stats 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'::user_role
  )
);