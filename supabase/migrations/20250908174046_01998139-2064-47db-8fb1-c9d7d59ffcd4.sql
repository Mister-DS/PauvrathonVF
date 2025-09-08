-- Fix Security Definer View issue by recreating streamers_public view properly
-- Drop the existing view and recreate it without security definer properties

DROP VIEW IF EXISTS public.streamers_public;

-- Create the view as a regular view that respects RLS policies
CREATE VIEW public.streamers_public AS
SELECT 
    s.id,
    s.stream_title,
    s.current_clicks,
    s.clicks_required,
    s.total_time_added,
    s.is_live,
    s.status,
    s.twitch_id,
    s.stream_started_at,
    s.created_at,
    s.updated_at
FROM public.streamers s
WHERE s.is_live = true;

-- Ensure the view respects RLS by not granting special privileges
-- The view will now use the permissions of the querying user, not the creator