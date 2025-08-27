-- Drop the insecure view
DROP VIEW IF EXISTS public.safe_minigames;

-- Recreate the view with SECURITY INVOKER to respect RLS policies
CREATE VIEW public.safe_minigames 
WITH (security_invoker=on)
AS
SELECT 
  id,
  name,
  description,
  is_active,
  created_at
FROM minigames
WHERE is_active = true;

-- Grant access to the secure view
GRANT SELECT ON public.safe_minigames TO anon;
GRANT SELECT ON public.safe_minigames TO authenticated;