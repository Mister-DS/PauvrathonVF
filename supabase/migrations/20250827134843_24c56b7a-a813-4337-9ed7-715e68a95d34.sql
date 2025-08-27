-- Fix the relationship between streamers and profiles tables
-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    -- Check if the foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'streamers_user_id_fkey'
        AND table_name = 'streamers'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE public.streamers 
        ADD CONSTRAINT streamers_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
    END IF;
END $$;