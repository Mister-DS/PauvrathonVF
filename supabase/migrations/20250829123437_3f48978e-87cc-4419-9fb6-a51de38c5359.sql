-- Add missing columns to streamers table
ALTER TABLE public.streamers 
ADD COLUMN IF NOT EXISTS stream_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pause_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_paused_duration INTEGER DEFAULT 0;