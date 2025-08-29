-- Add initial_duration column to streamers table
ALTER TABLE public.streamers 
ADD COLUMN IF NOT EXISTS initial_duration INTEGER DEFAULT 7200;