
-- A1: admin_settings — restringir SELECT a admins
DROP POLICY IF EXISTS "anyone authenticated reads settings" ON public.admin_settings;
CREATE POLICY "admins read settings"
  ON public.admin_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- M1: revogar EXECUTE de touch_last_seen para authenticated
REVOKE EXECUTE ON FUNCTION public.touch_last_seen() FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO service_role;

-- M2: system_logs.user_id NOT NULL (tabela vazia, seguro)
ALTER TABLE public.system_logs ALTER COLUMN user_id SET NOT NULL;

-- M3: profiles — usuário não vê o próprio blocked_reason/blocked_at via Data API.
-- Mantém SELECT na linha mas restringe colunas sensíveis ao próprio usuário.
REVOKE SELECT (blocked_reason, blocked_at) ON public.profiles FROM authenticated;
-- admins continuam podendo ler tudo via service_role / policies de admin existentes

-- B1: índice para acelerar bloqueio de 15 dias em interactions
CREATE INDEX IF NOT EXISTS idx_interactions_user_created
  ON public.interactions (user_id, created_at DESC);
