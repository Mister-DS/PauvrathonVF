-- Remove overly permissive public policy
DROP POLICY IF EXISTS "Public can view live streamers for discovery" ON public.streamers;

-- Create a secure view for public streamer discovery
CREATE OR REPLACE VIEW public.streamers_public AS
SELECT 
    s.id,
    s.stream_title,
    s.is_live,
    s.current_clicks,
    s.clicks_required,
    s.time_increment,
    s.active_minigames,
    s.created_at,
    -- Join with profiles for public display info only
    p.twitch_display_name,
    p.twitch_username,
    p.avatar_url
FROM public.streamers s
JOIN public.profiles p ON s.user_id = p.user_id
WHERE s.is_live = true;

-- Enable RLS on the view
ALTER VIEW public.streamers_public SET (security_barrier = true);

-- Create a security definer function for safe public access
CREATE OR REPLACE FUNCTION public.get_public_streamers()
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
SECURITY DEFINER
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

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.get_public_streamers() TO anon;

-- Update existing streamers policies to be more restrictive
-- Keep the existing policies for authenticated users, streamers, and admins
-- But remove any public access to the main streamers table