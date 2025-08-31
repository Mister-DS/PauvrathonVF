-- Créer une fonction pour supprimer un utilisateur et toutes ses données en cascade
CREATE OR REPLACE FUNCTION public.delete_user_cascade(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Vérifier que c'est bien l'utilisateur qui fait la demande
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Vous ne pouvez supprimer que votre propre compte';
  END IF;

  -- Supprimer les données en cascade (ordre important pour les contraintes FK)
  DELETE FROM public.subathon_stats WHERE streamer_id IN (
    SELECT id FROM public.streamers WHERE user_id = user_id
  );
  
  DELETE FROM public.game_sessions WHERE streamer_id IN (
    SELECT id FROM public.streamers WHERE user_id = user_id
  );
  
  DELETE FROM public.user_follows WHERE follower_user_id = user_id;
  DELETE FROM public.user_follows WHERE streamer_id IN (
    SELECT id FROM public.streamers WHERE user_id = user_id
  );
  
  DELETE FROM public.streamers WHERE user_id = user_id;
  DELETE FROM public.streamer_requests WHERE user_id = user_id;
  DELETE FROM public.profiles WHERE user_id = user_id;
  
  -- Note: L'utilisateur auth.users sera supprimé automatiquement côté client
END;
$$;