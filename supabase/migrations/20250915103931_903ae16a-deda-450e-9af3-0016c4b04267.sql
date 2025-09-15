-- Fix the last security issue - add search_path to the sync_profile_email function
ALTER FUNCTION public.sync_profile_email() SET search_path = public;