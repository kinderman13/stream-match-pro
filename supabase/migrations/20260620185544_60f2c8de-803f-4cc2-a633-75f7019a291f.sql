
ALTER TABLE public.interactions DROP CONSTRAINT IF EXISTS interactions_action_check;
ALTER TABLE public.interactions ADD CONSTRAINT interactions_action_check
  CHECK (action IN ('like','dislike','watched','save','skip','watch_click','trailer_click'));
ALTER TABLE public.interactions ADD COLUMN IF NOT EXISTS provider_id INTEGER;
CREATE INDEX IF NOT EXISTS interactions_action_idx ON public.interactions(action);
