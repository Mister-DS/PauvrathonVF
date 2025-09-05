-- Ajouter une politique pour permettre à tous les utilisateurs authentifiés de voir les streamers
CREATE POLICY "authenticated_users_view_streamers" ON public.streamers
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Optionnel : créer une vue publique pour encore plus de flexibilité
DROP VIEW IF EXISTS public.streamers_public;
CREATE VIEW public.streamers_public AS 
SELECT 
  s.id,
  s.is_live,
  s.stream_title,
  s.current_clicks,
  s.clicks_required,
  s.total_time_added,
  s.status,
  s.created_at,
  s.updated_at,
  s.stream_started_at,
  s.twitch_id
FROM public.streamers s
WHERE s.is_live = true OR s.status IN ('live', 'paused');