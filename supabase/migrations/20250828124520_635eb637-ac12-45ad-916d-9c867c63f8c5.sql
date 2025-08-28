-- Add pause status to streamers table
ALTER TABLE public.streamers 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline' CHECK (status IN ('live', 'paused', 'offline', 'ended'));

-- Update existing records to have a default status
UPDATE public.streamers 
SET status = CASE 
  WHEN is_live = true THEN 'live'
  ELSE 'offline'
END
WHERE status IS NULL;