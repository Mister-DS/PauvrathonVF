-- Supprimer les politiques RLS existantes sur user_tokens
DROP POLICY IF EXISTS "users_manage_own_tokens" ON public.user_tokens;

-- Créer des fonctions sécurisées pour gérer les tokens
-- Ces fonctions utilisent SECURITY DEFINER pour éviter l'exposition directe des données

-- Fonction pour obtenir un token valide (pour usage interne uniquement)
CREATE OR REPLACE FUNCTION public.get_user_token(p_user_id uuid)
RETURNS TABLE(
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expires_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    ut.encrypted_access_token,
    ut.encrypted_refresh_token, 
    ut.token_expires_at
  FROM public.user_tokens ut
  WHERE ut.user_id = p_user_id
    AND ut.user_id = auth.uid() -- Double vérification de sécurité
    AND (ut.token_expires_at IS NULL OR ut.token_expires_at > now())
  ORDER BY ut.created_at DESC
  LIMIT 1;
$$;

-- Fonction pour upsert un token de manière sécurisée
CREATE OR REPLACE FUNCTION public.upsert_user_token(
  p_encrypted_access_token text,
  p_encrypted_refresh_token text,
  p_token_expires_at timestamp with time zone DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  token_id uuid;
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Supprimer les anciens tokens de l'utilisateur pour éviter l'accumulation
  DELETE FROM public.user_tokens 
  WHERE user_id = auth.uid();

  -- Insérer le nouveau token
  INSERT INTO public.user_tokens (
    user_id,
    encrypted_access_token,
    encrypted_refresh_token,
    token_expires_at,
    created_at,
    updated_at
  ) VALUES (
    auth.uid(),
    p_encrypted_access_token,
    p_encrypted_refresh_token,
    p_token_expires_at,
    now(),
    now()
  ) RETURNING id INTO token_id;

  RETURN token_id;
END;
$$;

-- Fonction pour invalider les tokens d'un utilisateur
CREATE OR REPLACE FUNCTION public.invalidate_user_tokens()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  DELETE FROM public.user_tokens 
  WHERE user_id = auth.uid();
$$;

-- Fonction pour nettoyer les tokens expirés (pour maintenance système)
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH deleted AS (
    DELETE FROM public.user_tokens 
    WHERE token_expires_at IS NOT NULL 
      AND token_expires_at < now()
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM deleted;
$$;

-- Créer une nouvelle politique très restrictive qui bloque tout accès direct
CREATE POLICY "block_direct_access" ON public.user_tokens
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- Politique pour permettre l'accès aux fonctions système seulement
CREATE POLICY "system_functions_only" ON public.user_tokens
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Créer un trigger pour nettoyer automatiquement les tokens expirés
CREATE OR REPLACE FUNCTION public.auto_cleanup_expired_tokens()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Nettoyer les tokens expirés lors de chaque insertion
  DELETE FROM public.user_tokens 
  WHERE token_expires_at IS NOT NULL 
    AND token_expires_at < now();
  
  RETURN NEW;
END;
$$;

-- Appliquer le trigger
DROP TRIGGER IF EXISTS trigger_auto_cleanup_tokens ON public.user_tokens;
CREATE TRIGGER trigger_auto_cleanup_tokens
  AFTER INSERT ON public.user_tokens
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.auto_cleanup_expired_tokens();