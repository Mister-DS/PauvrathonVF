-- Create a table to manage user follows
CREATE TABLE public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_user_id UUID NOT NULL,
  streamer_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_user_id, streamer_id)
);

-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Policies for user_follows
CREATE POLICY "Users can view their own follows" 
ON public.user_follows 
FOR SELECT 
USING (auth.uid() = follower_user_id);

CREATE POLICY "Users can create their own follows" 
ON public.user_follows 
FOR INSERT 
WITH CHECK (auth.uid() = follower_user_id);

CREATE POLICY "Users can delete their own follows" 
ON public.user_follows 
FOR DELETE 
USING (auth.uid() = follower_user_id);

-- Streamers can see their followers count
CREATE POLICY "Streamers can view their followers" 
ON public.user_follows 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM streamers 
  WHERE streamers.id = user_follows.streamer_id 
  AND streamers.user_id = auth.uid()
));

-- Admins can view all follows
CREATE POLICY "Admins can view all follows" 
ON public.user_follows 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));