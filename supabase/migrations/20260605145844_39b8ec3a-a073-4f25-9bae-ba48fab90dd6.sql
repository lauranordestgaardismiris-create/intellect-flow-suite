ALTER TABLE public.ci_scores
  ADD COLUMN IF NOT EXISTS score_a integer,
  ADD COLUMN IF NOT EXISTS score_b integer,
  ADD COLUMN IF NOT EXISTS score_c integer;