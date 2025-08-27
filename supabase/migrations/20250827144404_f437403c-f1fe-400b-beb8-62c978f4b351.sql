-- Fix security vulnerability: Restrict game_sessions access
-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can create game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Anyone can update game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Anyone can view game sessions" ON public.game_sessions;

-- Create secure policies for game_sessions

-- 1. Players can view their own game sessions (match by Twitch username)
CREATE POLICY "Players can view their own game sessions" 
ON public.game_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.twitch_username = game_sessions.player_twitch_username
  )
);

-- 2. Streamers can view game sessions for their streams
CREATE POLICY "Streamers can view their stream sessions" 
ON public.game_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.streamers 
    WHERE streamers.id = game_sessions.streamer_id 
    AND streamers.user_id = auth.uid()
  )
);

-- 3. Admins can view all game sessions
CREATE POLICY "Admins can view all game sessions" 
ON public.game_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 4. Authenticated users can create game sessions (system needs this for minigames)
CREATE POLICY "Authenticated users can create game sessions" 
ON public.game_sessions 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 5. Players can update their own game sessions
CREATE POLICY "Players can update their own game sessions" 
ON public.game_sessions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.twitch_username = game_sessions.player_twitch_username
  )
);

-- 6. Streamers can update game sessions for their streams
CREATE POLICY "Streamers can update their stream sessions" 
ON public.game_sessions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.streamers 
    WHERE streamers.id = game_sessions.streamer_id 
    AND streamers.user_id = auth.uid()
  )
);

-- 7. Admins can update all game sessions
CREATE POLICY "Admins can update all game sessions" 
ON public.game_sessions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);