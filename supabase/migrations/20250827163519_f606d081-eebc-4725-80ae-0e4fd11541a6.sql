-- The function is still allowing anonymous access to sensitive data
-- Remove the function completely to prevent any data exposure
DROP FUNCTION IF EXISTS public.get_live_streamers_safe();

-- Revoke any remaining permissions for anonymous users
REVOKE ALL ON public.streamers FROM anon;
REVOKE ALL ON public.profiles FROM anon;

-- Ensure the restrictive policy is correctly blocking anonymous access
DROP POLICY IF EXISTS "Streamers table - no public direct access" ON public.streamers;

-- Create a new, more explicit policy that completely blocks anonymous access
CREATE POLICY "Block all anonymous access to streamers" 
ON public.streamers 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Also add a policy to block anonymous access to sensitive profile data
CREATE POLICY "Block anonymous access to all profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Create a secure function that only authenticated users can use
CREATE OR REPLACE FUNCTION public.get_discovery_streamers()
RETURNS TABLE (
    id uuid,
    stream_title text,
    current_clicks integer,
    clicks_required integer,
    time_increment integer,
    active_minigames text[],
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
        s.current_clicks,
        s.clicks_required,
        s.time_increment,
        s.active_minigames,
        p.twitch_display_name,
        p.twitch_username,
        p.avatar_url
    FROM public.streamers s
    JOIN public.profiles p ON s.user_id = p.user_id
    WHERE s.is_live = true
      AND auth.role() = 'authenticated'  -- Only for authenticated users
    ORDER BY s.created_at DESC;
$$;

-- Only grant to authenticated users, NOT to anonymous
GRANT EXECUTE ON FUNCTION public.get_discovery_streamers() TO authenticated;