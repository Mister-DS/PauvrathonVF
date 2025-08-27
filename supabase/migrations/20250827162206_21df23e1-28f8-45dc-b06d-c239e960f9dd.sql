-- Add function for admin to auto-create streamer profile
CREATE OR REPLACE FUNCTION public.create_admin_streamer_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    admin_profile_record RECORD;
BEGIN
    -- Get the current admin profile
    SELECT * INTO admin_profile_record 
    FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin';
    
    -- Check if user is admin
    IF admin_profile_record.id IS NULL THEN
        RAISE EXCEPTION 'Only admins can create streamer profiles';
    END IF;
    
    -- Check if streamer profile already exists
    IF EXISTS (SELECT 1 FROM streamers WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Streamer profile already exists';
    END IF;
    
    -- Create streamer profile
    INSERT INTO streamers (
        user_id,
        twitch_id,
        stream_title,
        is_live
    ) VALUES (
        auth.uid(),
        admin_profile_record.twitch_id,
        'Subathon Admin Test Stream',
        true
    );
    
    -- Update profile role to include streamer capabilities (keep admin)
    -- Admin should have both admin and streamer access
END;
$$;