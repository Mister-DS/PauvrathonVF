-- Activer Supabase Realtime pour la table time_additions uniquement
-- La table streamers est déjà dans la publication realtime

-- Configurer la réplication pour time_additions
ALTER TABLE public.time_additions REPLICA IDENTITY FULL;

-- Ajouter la table time_additions à la publication realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_additions;