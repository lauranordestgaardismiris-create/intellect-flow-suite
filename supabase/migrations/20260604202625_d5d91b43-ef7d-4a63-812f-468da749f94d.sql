ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS insights_summary_short text,
ADD COLUMN IF NOT EXISTS insights_summary_long text;