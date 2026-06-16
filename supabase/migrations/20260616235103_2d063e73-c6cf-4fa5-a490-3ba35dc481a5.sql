
-- Fase 3: rastreamento de atividade
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Fase 4: bloqueio de usuários
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_reason text;

-- Fase 4: logs do sistema
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category text NOT NULL,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.system_logs TO authenticated;
GRANT ALL ON public.system_logs TO service_role;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own logs" ON public.system_logs
  FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "admins read all logs" ON public.system_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS system_logs_created_idx ON public.system_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS system_logs_category_idx ON public.system_logs (category, created_at DESC);

-- Fase 4: configurações administrativas
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authenticated reads settings" ON public.admin_settings
  FOR SELECT TO authenticated USING (true);

-- Defaults do algoritmo
INSERT INTO public.admin_settings (key, value) VALUES
  ('min_ratings_for_recs', '3'::jsonb),
  ('recs_to_generate', '20'::jsonb),
  ('weight_like', '1.0'::jsonb),
  ('weight_watched', '1.5'::jsonb),
  ('weight_dislike', '-1.0'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Função para marcar last_seen sem RLS
CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.touch_last_seen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;
