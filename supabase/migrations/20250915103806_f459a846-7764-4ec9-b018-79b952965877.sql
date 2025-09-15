-- Fix security issues with function search paths and correct the stripe webhook logic

-- Add search_path to functions that don't have it set for security
ALTER FUNCTION public.cleanup_expired_tokens() SET search_path = public;
ALTER FUNCTION public.auto_cleanup_expired_tokens() SET search_path = public;
ALTER FUNCTION public.delete_user_cascade(uuid) SET search_path = public;
ALTER FUNCTION public.revoke_expired_badges() SET search_path = public;
ALTER FUNCTION public.grant_monthly_badge(uuid) SET search_path = public;
ALTER FUNCTION public.add_time_to_streamer(uuid, integer, text, jsonb, text) SET search_path = public;
ALTER FUNCTION public.grant_role_badge(uuid, text) SET search_path = public;
ALTER FUNCTION public.handle_profile_role_change() SET search_path = public;
ALTER FUNCTION public.upsert_user_token(text, text, timestamp with time zone) SET search_path = public;
ALTER FUNCTION public.invalidate_user_tokens() SET search_path = public;
ALTER FUNCTION public.get_time_for_event(uuid, text, jsonb) SET search_path = public;
ALTER FUNCTION public.update_player_stats(uuid, text, integer, integer, integer, integer) SET search_path = public;
ALTER FUNCTION public.upsert_user_stats(text, text, integer, integer, integer, integer) SET search_path = public;
ALTER FUNCTION public.add_time_to_streamer(text, integer) SET search_path = public;
ALTER FUNCTION public.increment_clicks(text) SET search_path = public;
ALTER FUNCTION public.increment_clicks(uuid) SET search_path = public;
ALTER FUNCTION public.add_time_to_streamer(uuid, integer) SET search_path = public;
ALTER FUNCTION public.upsert_user_stats(uuid, text, integer, integer, integer, integer) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Add email column to profiles table if it doesn't exist
-- This is needed for the Stripe webhook to properly match users
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email text;
        CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
    END IF;
END $$;

-- Create a trigger to automatically populate email from auth.users
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sync email from auth.users when profile is created/updated
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles 
    SET email = (SELECT email FROM auth.users WHERE id = NEW.user_id)
    WHERE user_id = NEW.user_id AND email IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync email on profile changes
DROP TRIGGER IF EXISTS sync_profile_email_trigger ON public.profiles;
CREATE TRIGGER sync_profile_email_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email();

-- Populate existing profiles with emails
UPDATE public.profiles 
SET email = (SELECT email FROM auth.users WHERE id = profiles.user_id)
WHERE email IS NULL;

-- Fix the user_tokens table to have proper constraints
ALTER TABLE public.user_tokens ALTER COLUMN user_id SET NOT NULL;