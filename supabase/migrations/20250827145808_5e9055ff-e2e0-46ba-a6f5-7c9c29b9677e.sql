-- Fix critical security vulnerability: Prevent falsified game statistics
-- Drop the dangerous policy that allows anyone to insert stats
DROP POLICY IF EXISTS "Anyone can insert stats" ON public.subathon_stats;

-- Create secure policies for inserting statistics
-- Only authenticated users can insert stats, and only for valid scenarios

-- 1. System can insert stats (for game completions via edge functions)
CREATE POLICY "System can insert stats" 
ON public.subathon_stats 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND
  -- Ensure the streamer exists and the player is authentic
  EXISTS (
    SELECT 1 FROM public.streamers 
    WHERE streamers.id = subathon_stats.streamer_id 
    AND streamers.is_live = true
  )
);

-- 2. Streamers can insert stats for their own streams
CREATE POLICY "Streamers can insert stats for their streams" 
ON public.subathon_stats 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.streamers 
    WHERE streamers.id = subathon_stats.streamer_id 
    AND streamers.user_id = auth.uid()
  )
);

-- 3. Admins can insert stats for any stream
CREATE POLICY "Admins can insert stats" 
ON public.subathon_stats 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Keep the existing view and update policies - they seem appropriate