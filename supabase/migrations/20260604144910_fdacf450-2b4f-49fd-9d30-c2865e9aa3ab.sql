-- 1. Add new profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nationalities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS neurodivergence text,
  ADD COLUMN IF NOT EXISTS disability text,
  ADD COLUMN IF NOT EXISTS years_experience_total integer,
  ADD COLUMN IF NOT EXISTS years_in_role integer;

-- 2. Add 'intern' to role_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'intern'
      AND enumtypid = 'public.role_type'::regtype
  ) THEN
    ALTER TYPE public.role_type ADD VALUE 'intern';
  END IF;
END$$;

-- 3. Seed Languages as a skill category (idempotent)
INSERT INTO public.skills (name, category)
SELECT v.name, 'Languages'
FROM (VALUES
  ('English'),
  ('Spanish'),
  ('French'),
  ('German'),
  ('Italian'),
  ('Greek')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.skills s
  WHERE s.category = 'Languages' AND s.name = v.name
);