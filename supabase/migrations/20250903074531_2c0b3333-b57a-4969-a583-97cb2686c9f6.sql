-- Add missing database functions
CREATE OR REPLACE FUNCTION public.upsert_user_stats(
  p_streamer_id text,
  p_player_twitch_username text,
  p_clicks_contributed integer DEFAULT 0,
  p_time_contributed integer DEFAULT 0,
  p_games_played integer DEFAULT 0,
  p_games_won integer DEFAULT 0
) RETURNS void AS $$
BEGIN
  INSERT INTO public.subathon_stats (
    streamer_id,
    player_twitch_username,
    clicks_contributed,
    time_contributed,
    games_played,
    games_won,
    last_activity
  ) VALUES (
    p_streamer_id,
    p_player_twitch_username,
    p_clicks_contributed,
    p_time_contributed,
    p_games_played,
    p_games_won,
    now()
  )
  ON CONFLICT (streamer_id, player_twitch_username)
  DO UPDATE SET
    clicks_contributed = subathon_stats.clicks_contributed + p_clicks_contributed,
    time_contributed = subathon_stats.time_contributed + p_time_contributed,
    games_played = subathon_stats.games_played + p_games_played,
    games_won = subathon_stats.games_won + p_games_won,
    last_activity = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.add_time_to_streamer(
  p_streamer_id text,
  p_time_to_add integer
) RETURNS void AS $$
BEGIN
  UPDATE public.streamers 
  SET 
    total_elapsed_time = total_elapsed_time + p_time_to_add,
    updated_at = now()
  WHERE id = p_streamer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_clicks(
  p_streamer_id text
) RETURNS void AS $$
BEGIN
  UPDATE public.streamers 
  SET 
    current_clicks = current_clicks + 1,
    total_clicks = total_clicks + 1,
    updated_at = now()
  WHERE id = p_streamer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create overlay_configs table
CREATE TABLE IF NOT EXISTS public.overlay_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID NOT NULL REFERENCES public.streamers(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on overlay_configs
ALTER TABLE public.overlay_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for overlay_configs
CREATE POLICY "Streamers can manage their overlay configs"
ON public.overlay_configs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.streamers s
    WHERE s.id = overlay_configs.streamer_id
    AND s.user_id = auth.uid()
  )
);

-- Add missing columns to minigames table
ALTER TABLE public.minigames 
ADD COLUMN IF NOT EXISTS component_code TEXT,
ADD COLUMN IF NOT EXISTS max_chances INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 12;