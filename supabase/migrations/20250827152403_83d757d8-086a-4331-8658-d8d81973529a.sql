-- Fix the missing relationship between streamers and profiles
-- Add proper foreign key constraint
ALTER TABLE public.streamers 
ADD CONSTRAINT streamers_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);