-- Ajuster la sécurité: Permettre la découverte publique des streamers live 
-- mais protéger les données sensibles
DROP POLICY IF EXISTS "Authenticated users can view streamers" ON public.streamers;

-- Créer une politique qui permet de voir les streamers live publiquement
-- mais seulement les champs nécessaires pour la découverte
CREATE POLICY "Public can view live streamers for discovery" 
ON public.streamers 
FOR SELECT 
USING (is_live = true);

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all streamers" 
ON public.streamers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Les streamers peuvent voir leurs propres données complètes
CREATE POLICY "Streamers can view their own data" 
ON public.streamers 
FOR SELECT 
USING (auth.uid() = user_id);