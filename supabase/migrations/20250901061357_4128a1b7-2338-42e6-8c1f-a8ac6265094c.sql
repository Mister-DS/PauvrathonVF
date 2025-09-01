-- Add rejection_reason column to streamer_requests table
ALTER TABLE public.streamer_requests 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;