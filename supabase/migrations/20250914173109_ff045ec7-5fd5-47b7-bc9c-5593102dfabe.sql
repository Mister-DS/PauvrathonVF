-- Fix critical security vulnerability in subscribers table
-- The current insert policy allows anyone to insert records with 'true' condition
-- This needs to be restricted to prevent unauthorized access to subscription data

-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;

-- Create a new restricted insert policy that only allows service role operations
-- This ensures only our Stripe webhook (running with service role) can insert subscription data
CREATE POLICY "service_role_insert_subscription" 
ON public.subscribers 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Also create a policy for authenticated users to insert their own subscription records
-- This allows users to create subscription records if needed from the frontend
CREATE POLICY "users_insert_own_subscription" 
ON public.subscribers 
FOR INSERT 
TO authenticated
WITH CHECK (
  (user_id = auth.uid()) OR 
  (email = auth.email() AND user_id IS NULL)
);