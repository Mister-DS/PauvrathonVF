-- Fix critical security vulnerability in subscribers table RLS policies
-- Remove email-based access which could expose customer payment information

-- Drop the current policies that allow email-based access
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

-- Create secure policies that only allow user_id-based access
-- Users can only see their own subscription data by user_id
CREATE POLICY "users_select_own_subscription" 
ON public.subscribers 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Users can only update their own subscription data by user_id
CREATE POLICY "users_update_own_subscription" 
ON public.subscribers 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Service role can still access all data (needed for Stripe webhook operations)
CREATE POLICY "service_role_full_access" 
ON public.subscribers 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);