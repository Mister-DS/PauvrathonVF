-- Create subscribers table for Stripe subscription management
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  subscription_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create monthly_badges table to track user badges
CREATE TABLE public.monthly_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: "2024-01", "2024-02", etc.
  badge_type TEXT NOT NULL DEFAULT 'subscriber',
  is_active BOOLEAN NOT NULL DEFAULT true,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year, badge_type)
);

-- Enable RLS on both tables
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_badges ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscribers table
CREATE POLICY "select_own_subscription" ON public.subscribers
FOR SELECT
USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "update_own_subscription" ON public.subscribers
FOR UPDATE
USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "insert_subscription" ON public.subscribers
FOR INSERT
WITH CHECK (true);

-- RLS policies for monthly_badges table
CREATE POLICY "users_view_own_badges" ON public.monthly_badges
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "public_view_active_badges" ON public.monthly_badges
FOR SELECT
USING (is_active = true);

CREATE POLICY "system_manage_badges" ON public.monthly_badges
FOR ALL
USING (true)
WITH CHECK (true);

-- Function to grant monthly badge to subscriber
CREATE OR REPLACE FUNCTION public.grant_monthly_badge(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month TEXT;
  next_month_start TIMESTAMPTZ;
BEGIN
  -- Get current month in YYYY-MM format
  current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  
  -- Calculate next month start date for expiration
  next_month_start := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
  
  -- Insert or update the badge for current month
  INSERT INTO public.monthly_badges (
    user_id,
    month_year,
    badge_type,
    is_active,
    expires_at
  ) VALUES (
    p_user_id,
    current_month,
    'subscriber',
    true,
    next_month_start
  )
  ON CONFLICT (user_id, month_year, badge_type)
  DO UPDATE SET
    is_active = true,
    expires_at = next_month_start,
    granted_at = now();
END;
$$;

-- Function to revoke badges for expired subscriptions
CREATE OR REPLACE FUNCTION public.revoke_expired_badges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark badges as inactive for users whose subscription has expired
  UPDATE public.monthly_badges 
  SET is_active = false
  WHERE user_id NOT IN (
    SELECT user_id 
    FROM public.subscribers 
    WHERE subscribed = true 
    AND (subscription_end IS NULL OR subscription_end > now())
  )
  AND is_active = true;
END;
$$;

-- Function to get user's current badge status
CREATE OR REPLACE FUNCTION public.get_user_badge_status(p_user_id UUID)
RETURNS TABLE(
  has_active_badge BOOLEAN,
  current_month_badge BOOLEAN,
  badge_expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    EXISTS (
      SELECT 1 FROM public.monthly_badges 
      WHERE user_id = p_user_id 
      AND is_active = true 
      AND expires_at > now()
    ) as has_active_badge,
    EXISTS (
      SELECT 1 FROM public.monthly_badges 
      WHERE user_id = p_user_id 
      AND month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
      AND is_active = true
    ) as current_month_badge,
    (
      SELECT expires_at FROM public.monthly_badges 
      WHERE user_id = p_user_id 
      AND is_active = true 
      ORDER BY expires_at DESC 
      LIMIT 1
    ) as badge_expires_at;
$$;