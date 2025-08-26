-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('viewer', 'streamer', 'admin');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  twitch_id TEXT,
  twitch_username TEXT,
  twitch_display_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create streamer requests table
CREATE TABLE public.streamer_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  twitch_username TEXT NOT NULL,
  stream_link TEXT NOT NULL,
  motivation TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Create streamers table for validated streamers
CREATE TABLE public.streamers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  twitch_id TEXT NOT NULL,
  time_increment INTEGER DEFAULT 30,
  clicks_required INTEGER DEFAULT 100,
  cooldown_seconds INTEGER DEFAULT 300,
  active_minigames TEXT[] DEFAULT ARRAY['guess_number', 'hangman'],
  current_clicks INTEGER DEFAULT 0,
  total_time_added INTEGER DEFAULT 0,
  is_live BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subathon stats table
CREATE TABLE public.subathon_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID NOT NULL REFERENCES public.streamers(id) ON DELETE CASCADE,
  player_twitch_username TEXT,
  clicks_contributed INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  time_contributed INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create minigames table
CREATE TABLE public.minigames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create game sessions table
CREATE TABLE public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID NOT NULL REFERENCES public.streamers(id) ON DELETE CASCADE,
  player_twitch_username TEXT,
  minigame_name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  game_data JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streamer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streamers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subathon_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minigames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for streamer requests
CREATE POLICY "Users can view their own requests" ON public.streamer_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own requests" ON public.streamer_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all requests" ON public.streamer_requests FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);
CREATE POLICY "Admins can update requests" ON public.streamer_requests FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);

-- Create policies for streamers
CREATE POLICY "Anyone can view streamers" ON public.streamers FOR SELECT USING (true);
CREATE POLICY "Streamers can update their own data" ON public.streamers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage streamers" ON public.streamers FOR ALL USING (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);

-- Create policies for subathon stats
CREATE POLICY "Anyone can view stats" ON public.subathon_stats FOR SELECT USING (true);
CREATE POLICY "Anyone can insert stats" ON public.subathon_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Streamers can update their stats" ON public.subathon_stats FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.streamers WHERE id = streamer_id AND user_id = auth.uid())
);

-- Create policies for minigames
CREATE POLICY "Anyone can view active minigames" ON public.minigames FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage minigames" ON public.minigames FOR ALL USING (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);

-- Create policies for game sessions
CREATE POLICY "Anyone can view game sessions" ON public.game_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can create game sessions" ON public.game_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update game sessions" ON public.game_sessions FOR UPDATE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_streamers_updated_at
  BEFORE UPDATE ON public.streamers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default minigames
INSERT INTO public.minigames (name, code, description) VALUES
('guess_number', 'number_guessing', 'Devinez un nombre entre 1 et 100'),
('hangman', 'word_guessing', 'Jeu du pendu avec des mots aléatoires');