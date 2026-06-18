
CREATE TABLE IF NOT EXISTS public.dna_results (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_title text,
  animal_key text,
  character_key text,
  rarity text,
  percentile_analytics numeric,
  percentile_quality numeric,
  percentile_rarity numeric,
  total_interactions int,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dna_results TO authenticated;
GRANT ALL ON public.dna_results TO service_role;
ALTER TABLE public.dna_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own dna result" ON public.dna_results FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.dna_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL,
  animal_key text,
  character_key text,
  rarity text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.dna_shares TO authenticated;
GRANT ALL ON public.dna_shares TO service_role;
ALTER TABLE public.dna_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own dna shares" ON public.dna_shares FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users read own dna shares" ON public.dna_shares FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS dna_shares_user_idx ON public.dna_shares(user_id);
CREATE INDEX IF NOT EXISTS dna_results_animal_idx ON public.dna_results(animal_key);
CREATE INDEX IF NOT EXISTS dna_results_rarity_idx ON public.dna_results(rarity);
