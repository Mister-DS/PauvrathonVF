-- Fix security vulnerability: Remove public access to user_tokens table
-- The existing policy "Allow users to view their own tokens" allows public access
-- which could be exploited. The "users_manage_own_tokens" policy already 
-- provides proper authenticated access.

-- Drop the potentially vulnerable public policy
DROP POLICY IF EXISTS "Allow users to view their own tokens" ON public.user_tokens;

-- Ensure the secure authenticated-only policy remains
-- (This policy already exists and is properly configured)
-- It only allows authenticated users to manage their own tokens