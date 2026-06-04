
-- Extend role_type enum (preserves existing values)
ALTER TYPE public.role_type ADD VALUE IF NOT EXISTS 'senior_management';
ALTER TYPE public.role_type ADD VALUE IF NOT EXISTS 'team_lead';
ALTER TYPE public.role_type ADD VALUE IF NOT EXISTS 'specialist';
ALTER TYPE public.role_type ADD VALUE IF NOT EXISTS 'consultant';
ALTER TYPE public.role_type ADD VALUE IF NOT EXISTS 'freelancer';
ALTER TYPE public.role_type ADD VALUE IF NOT EXISTS 'other';

-- Profile measurement fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS problem_solving_style jsonb,
  ADD COLUMN IF NOT EXISTS information_processing_style jsonb,
  ADD COLUMN IF NOT EXISTS meta_cognition_score numeric,
  ADD COLUMN IF NOT EXISTS disc_interpretation text;

-- Optional subcategory for skills
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS subcategory text;
