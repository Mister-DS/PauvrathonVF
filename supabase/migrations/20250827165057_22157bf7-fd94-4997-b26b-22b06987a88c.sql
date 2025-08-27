-- Enable real-time for streamers table
ALTER TABLE public.streamers REPLICA IDENTITY FULL;

-- Add streamers table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.streamers;