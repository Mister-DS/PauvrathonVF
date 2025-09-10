-- Drop the existing function first to change its return type
DROP FUNCTION IF EXISTS public.get_user_badge_status(uuid);

-- Modify monthly_badges table to support different badge designs per month
ALTER TABLE public.monthly_badges 
ADD COLUMN IF NOT EXISTS badge_design jsonb DEFAULT '{"color": "gold", "icon": "crown", "label": "Abonné"}'::jsonb,
ADD COLUMN IF NOT EXISTS display_name text;

-- Update badge_type to support more types
ALTER TABLE public.monthly_badges 
DROP CONSTRAINT IF EXISTS monthly_badges_badge_type_check;

ALTER TABLE public.monthly_badges 
ADD CONSTRAINT monthly_badges_badge_type_check 
CHECK (badge_type IN ('subscriber', 'admin', 'streamer'));

-- Create function to get monthly badge design based on month
CREATE OR REPLACE FUNCTION public.get_monthly_badge_design(month_year text)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT CASE 
    WHEN month_year = '2025-01' THEN '{"color": "#FFD700", "icon": "crown", "label": "Abonné Janvier", "gradient": "from-yellow-400 to-yellow-600"}'::jsonb
    WHEN month_year = '2025-02' THEN '{"color": "#FF69B4", "icon": "heart", "label": "Abonné Février", "gradient": "from-pink-400 to-pink-600"}'::jsonb
    WHEN month_year = '2025-03' THEN '{"color": "#32CD32", "icon": "leaf", "label": "Abonné Mars", "gradient": "from-green-400 to-green-600"}'::jsonb
    WHEN month_year = '2025-04' THEN '{"color": "#87CEEB", "icon": "flower", "label": "Abonné Avril", "gradient": "from-blue-400 to-blue-600"}'::jsonb
    WHEN month_year = '2025-05' THEN '{"color": "#DDA0DD", "icon": "sparkles", "label": "Abonné Mai", "gradient": "from-purple-400 to-purple-600"}'::jsonb
    WHEN month_year = '2025-06' THEN '{"color": "#F0E68C", "icon": "sun", "label": "Abonné Juin", "gradient": "from-yellow-300 to-orange-500"}'::jsonb
    WHEN month_year = '2025-07' THEN '{"color": "#FF6347", "icon": "flame", "label": "Abonné Juillet", "gradient": "from-red-400 to-red-600"}'::jsonb
    WHEN month_year = '2025-08' THEN '{"color": "#40E0D0", "icon": "waves", "label": "Abonné Août", "gradient": "from-teal-400 to-teal-600"}'::jsonb
    WHEN month_year = '2025-09' THEN '{"color": "#DEB887", "icon": "maple-leaf", "label": "Abonné Septembre", "gradient": "from-amber-400 to-amber-600"}'::jsonb
    WHEN month_year = '2025-10' THEN '{"color": "#FF8C00", "icon": "ghost", "label": "Abonné Octobre", "gradient": "from-orange-400 to-orange-600"}'::jsonb
    WHEN month_year = '2025-11' THEN '{"color": "#8B4513", "icon": "turkey", "label": "Abonné Novembre", "gradient": "from-orange-600 to-red-700"}'::jsonb
    WHEN month_year = '2025-12' THEN '{"color": "#B22222", "icon": "gift", "label": "Abonné Décembre", "gradient": "from-red-500 to-green-600"}'::jsonb
    ELSE '{"color": "#FFD700", "icon": "crown", "label": "Abonné", "gradient": "from-yellow-400 to-yellow-600"}'::jsonb
  END;
$$;

-- Update grant_monthly_badge function to include badge design
CREATE OR REPLACE FUNCTION public.grant_monthly_badge(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_month TEXT;
  next_month_start TIMESTAMPTZ;
  badge_design_data jsonb;
BEGIN
  -- Get current month in YYYY-MM format
  current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  
  -- Calculate next month start date for expiration
  next_month_start := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
  
  -- Get badge design for current month
  badge_design_data := get_monthly_badge_design(current_month);
  
  -- Insert or update the badge for current month
  INSERT INTO public.monthly_badges (
    user_id,
    month_year,
    badge_type,
    badge_design,
    display_name,
    is_active,
    expires_at
  ) VALUES (
    p_user_id,
    current_month,
    'subscriber',
    badge_design_data,
    badge_design_data->>'label',
    true,
    next_month_start
  )
  ON CONFLICT (user_id, month_year, badge_type)
  DO UPDATE SET
    is_active = true,
    expires_at = next_month_start,
    badge_design = badge_design_data,
    display_name = badge_design_data->>'label',
    granted_at = now();
END;
$$;

-- Function to grant role badges (admin, streamer)
CREATE OR REPLACE FUNCTION public.grant_role_badge(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  badge_design_data jsonb;
  role_display_name text;
BEGIN
  -- Define badge design based on role
  CASE p_role
    WHEN 'admin' THEN
      badge_design_data := '{"color": "#DC143C", "icon": "shield", "label": "Admin", "gradient": "from-red-500 to-red-700"}'::jsonb;
      role_display_name := 'Admin';
    WHEN 'streamer' THEN
      badge_design_data := '{"color": "#9146FF", "icon": "video", "label": "Streamer", "gradient": "from-purple-500 to-purple-700"}'::jsonb;
      role_display_name := 'Streamer';
    ELSE
      RETURN; -- Invalid role, do nothing
  END CASE;
  
  -- Insert or update the role badge (no expiration for role badges)
  INSERT INTO public.monthly_badges (
    user_id,
    month_year,
    badge_type,
    badge_design,
    display_name,
    is_active,
    expires_at
  ) VALUES (
    p_user_id,
    'permanent',
    p_role,
    badge_design_data,
    role_display_name,
    true,
    NULL -- Role badges don't expire
  )
  ON CONFLICT (user_id, month_year, badge_type)
  DO UPDATE SET
    is_active = true,
    badge_design = badge_design_data,
    display_name = role_display_name,
    granted_at = now();
END;
$$;

-- Create new get_user_badge_status function with updated return type
CREATE OR REPLACE FUNCTION public.get_user_badge_status(p_user_id uuid)
RETURNS TABLE(
  has_active_badge boolean, 
  current_month_badge boolean, 
  badge_expires_at timestamp with time zone,
  current_display_badge jsonb,
  all_badges jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH user_badges AS (
    SELECT 
      mb.*,
      CASE 
        WHEN mb.badge_type IN ('admin', 'streamer') THEN 999999 -- High priority for role badges
        WHEN mb.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM') AND mb.is_active = true THEN 100 -- Current month subscriber badge
        WHEN mb.is_active = true AND mb.expires_at > now() THEN 50 -- Other active badges
        ELSE 0 -- Inactive badges
      END as display_priority
    FROM public.monthly_badges mb
    WHERE mb.user_id = p_user_id
  ),
  current_badge AS (
    SELECT * FROM user_badges 
    WHERE display_priority > 0
    ORDER BY display_priority DESC, granted_at DESC
    LIMIT 1
  )
  SELECT 
    EXISTS (SELECT 1 FROM user_badges WHERE is_active = true AND (expires_at > now() OR expires_at IS NULL)) as has_active_badge,
    EXISTS (SELECT 1 FROM user_badges WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM') AND badge_type = 'subscriber' AND is_active = true) as current_month_badge,
    (SELECT expires_at FROM user_badges WHERE is_active = true AND badge_type = 'subscriber' ORDER BY expires_at DESC LIMIT 1) as badge_expires_at,
    (SELECT to_jsonb(cb.*) FROM current_badge cb) as current_display_badge,
    (SELECT jsonb_agg(to_jsonb(ub.*) ORDER BY ub.granted_at DESC) FROM user_badges ub WHERE ub.is_active = true) as all_badges;
$$;

-- Trigger to automatically grant role badges when profile role changes
CREATE OR REPLACE FUNCTION public.handle_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Grant role badge if role is admin or streamer
  IF NEW.role IN ('admin', 'streamer') THEN
    PERFORM grant_role_badge(NEW.user_id, NEW.role::text);
  END IF;
  
  -- Revoke role badges if role changed from admin/streamer to something else
  IF OLD.role IN ('admin', 'streamer') AND NEW.role NOT IN ('admin', 'streamer') THEN
    UPDATE public.monthly_badges 
    SET is_active = false 
    WHERE user_id = NEW.user_id 
    AND badge_type IN ('admin', 'streamer');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for profile role changes
DROP TRIGGER IF EXISTS profile_role_change_trigger ON public.profiles;
CREATE TRIGGER profile_role_change_trigger
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role)
EXECUTE FUNCTION public.handle_profile_role_change();