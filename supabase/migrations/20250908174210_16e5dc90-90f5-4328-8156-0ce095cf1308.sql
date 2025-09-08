-- Fix Security Definer View issue by changing get_user_token function
-- Create a custom type instead of using TABLE return type

-- Create a custom type for user tokens
CREATE TYPE public.user_token_type AS (
    encrypted_access_token text,
    encrypted_refresh_token text,
    token_expires_at timestamp with time zone
);

-- Recreate the function to return the custom type instead of TABLE
CREATE OR REPLACE FUNCTION public.get_user_token(p_user_id uuid)
RETURNS public.user_token_type
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    ut.encrypted_access_token,
    ut.encrypted_refresh_token, 
    ut.token_expires_at
  FROM public.user_tokens ut
  WHERE ut.user_id = p_user_id
    AND ut.user_id = auth.uid() -- Double vérification de sécurité
    AND (ut.token_expires_at IS NULL OR ut.token_expires_at > now())
  ORDER BY ut.created_at DESC
  LIMIT 1;
$$;