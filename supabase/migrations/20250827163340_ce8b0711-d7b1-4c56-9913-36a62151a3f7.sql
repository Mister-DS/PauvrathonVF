-- Remove the problematic SECURITY DEFINER view
DROP VIEW IF EXISTS public.streamers_public;

-- Update the function to not use SECURITY DEFINER which is flagged as risky
DROP FUNCTION IF EXISTS public.get_public_streamers();

-- Create a safer function that doesn't use SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_live_streamers_safe()
RETURNS TABLE (
    id uuid,
    stream_title text,
    is_live boolean,
    current_clicks integer,
    clicks_required integer,
    time_increment integer,
    active_minigames text[],
    created_at timestamp with time zone,
    twitch_display_name text,
    twitch_username text,
    avatar_url text
)
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
    SELECT 
        s.id,
        s.stream_title,
        s.is_live,
        s.current_clicks,
        s.clicks_required,
        s.time_increment,
        s.active_minigames,
        s.created_at,
        p.twitch_display_name,
        p.twitch_username,
        p.avatar_url
    FROM public.streamers s
    JOIN public.profiles p ON s.user_id = p.user_id
    WHERE s.is_live = true
    ORDER BY s.created_at DESC;
$$;

-- Grant execute permission to all users (anon and authenticated)
GRANT EXECUTE ON FUNCTION public.get_live_streamers_safe() TO anon;
GRANT EXECUTE ON FUNCTION public.get_live_streamers_safe() TO authenticated;

-- Add a restrictive policy to streamers table for any remaining direct access
CREATE POLICY "Streamers table - no public direct access" 
ON public.streamers 
FOR SELECT 
TO anon
USING (false);  -- Block all direct access for anonymous users