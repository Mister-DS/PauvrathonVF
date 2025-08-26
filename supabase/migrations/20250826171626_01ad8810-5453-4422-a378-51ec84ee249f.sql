-- Add stream title and time configuration to streamers table
ALTER TABLE public.streamers 
ADD COLUMN stream_title TEXT,
ADD COLUMN time_mode TEXT DEFAULT 'fixed' CHECK (time_mode IN ('fixed', 'random')),
ADD COLUMN max_random_time INTEGER DEFAULT 60;

-- Update existing streamers with default time mode
UPDATE public.streamers 
SET time_mode = 'fixed', max_random_time = 60
WHERE time_mode IS NULL;