-- Activer Supabase Realtime pour les tables time_additions et streamers
-- Cela permet aux clients de recevoir les mises à jour en temps réel

-- Configurer la réplication pour time_additions
ALTER TABLE public.time_additions REPLICA IDENTITY FULL;

-- Configurer la réplication pour streamers  
ALTER TABLE public.streamers REPLICA IDENTITY FULL;

-- Ajouter les tables à la publication realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_additions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.streamers;