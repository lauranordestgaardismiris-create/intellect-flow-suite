
-- Profile educations: up to N degrees per user (UI enforces 2)
CREATE TABLE public.profile_educations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL DEFAULT 0,
  degree_level TEXT,
  degree_type TEXT,
  field_of_study TEXT,
  university TEXT,
  graduation_year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_educations TO authenticated;
GRANT ALL ON public.profile_educations TO service_role;

ALTER TABLE public.profile_educations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pe_select" ON public.profile_educations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_educations.profile_id
        AND (p.id = auth.uid() OR public.has_role(auth.uid(), p.org_id, 'org_admin'::public.app_role))
    )
  );

CREATE POLICY "pe_write_self" ON public.profile_educations
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE INDEX idx_profile_educations_profile ON public.profile_educations(profile_id);

-- Seed new skills with category taxonomy used by the nested picker.
-- ON CONFLICT NOTHING via NOT EXISTS pattern.
INSERT INTO public.skills (name, category)
SELECT v.name, v.category FROM (VALUES
  -- Programming
  ('Python','Programming'),('JavaScript','Programming'),('TypeScript','Programming'),
  ('Java','Programming'),('C++','Programming'),('Go','Programming'),('Rust','Programming'),
  ('SQL','Programming'),('R','Programming'),
  -- Data & Analytics
  ('Excel','Data & Analytics'),('SQL (Analytics)','Data & Analytics'),('Power BI','Data & Analytics'),
  ('Tableau','Data & Analytics'),('Machine Learning','Data & Analytics'),
  ('Statistics','Data & Analytics'),('Data Engineering','Data & Analytics'),
  -- Design
  ('Figma','Design'),('Adobe Creative Suite','Design'),('UX Research','Design'),
  ('Prototyping','Design'),('Brand Design','Design'),
  -- Communication
  ('Public Speaking','Communication'),('Writing','Communication'),
  ('Negotiation','Communication'),('Presentation','Communication'),
  -- Project Management
  ('Agile','Project Management'),('Scrum','Project Management'),
  ('Kanban','Project Management'),('Stakeholder Management','Project Management'),
  -- Leadership
  ('Coaching','Leadership'),('Strategic Planning','Leadership'),
  ('Change Management','Leadership'),('People Management','Leadership'),
  -- Finance
  ('Accounting','Finance'),('Financial Modeling','Finance'),
  ('Valuation','Finance'),('Auditing','Finance'),
  -- Marketing
  ('Content','Marketing'),('SEO','Marketing'),('Performance Marketing','Marketing'),
  ('Brand','Marketing'),('Social Media','Marketing'),
  -- Sales
  ('Prospecting','Sales'),('Account Management','Sales'),
  -- Operations
  ('Process Optimization','Operations'),('Supply Chain','Operations'),('Logistics','Operations')
) AS v(name, category)
WHERE NOT EXISTS (
  SELECT 1 FROM public.skills s WHERE lower(s.name) = lower(v.name)
);
