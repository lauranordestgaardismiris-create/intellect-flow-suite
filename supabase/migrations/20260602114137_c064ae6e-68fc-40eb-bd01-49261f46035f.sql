
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('org_admin', 'employee');
CREATE TYPE public.entity_type AS ENUM ('company', 'department', 'team');
CREATE TYPE public.role_type AS ENUM ('individual_contributor', 'manager', 'executive');
CREATE TYPE public.disc_type AS ENUM ('D', 'I', 'S', 'C');
CREATE TYPE public.cognitive_style AS ENUM ('analytical', 'practical', 'relational', 'experimental');

-- ============ ORGANIZATIONS ============
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ USER_ROLES (separate from profile) ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id, role)
);

-- Security definer helpers — bypass RLS, safe in policies
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _org_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND org_id = _org_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.current_org(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND org_id = _org_id)
$$;

-- ============ ENTITIES (departments / teams within a company) ============
CREATE TABLE public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.entity_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_entities_org ON public.entities(org_id);
CREATE INDEX idx_entities_parent ON public.entities(parent_id);

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  religion TEXT,
  sexual_orientation TEXT,
  education_level TEXT,
  field_of_study TEXT,
  job_title TEXT,
  role_type public.role_type,
  department_entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  team_entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_org ON public.profiles(org_id);

-- ============ SKILLS & LANGUAGES ============
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT
);
CREATE TABLE public.profile_skills (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, skill_id)
);
CREATE TABLE public.languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);
CREATE TABLE public.profile_languages (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  language_id UUID NOT NULL REFERENCES public.languages(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, language_id)
);

-- ============ WORK STYLE ============
CREATE TABLE public.work_style (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  collaboration INTEGER NOT NULL DEFAULT 50,
  independent_work INTEGER NOT NULL DEFAULT 50,
  task_repetition INTEGER NOT NULL DEFAULT 50,
  idea_generation INTEGER NOT NULL DEFAULT 50,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ DISC & COGNITIVE ============
CREATE TABLE public.disc_results (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  d INTEGER NOT NULL DEFAULT 0,
  i INTEGER NOT NULL DEFAULT 0,
  s INTEGER NOT NULL DEFAULT 0,
  c INTEGER NOT NULL DEFAULT 0,
  dominant public.disc_type NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cognitive_results (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  analytical INTEGER NOT NULL DEFAULT 0,
  practical INTEGER NOT NULL DEFAULT 0,
  relational INTEGER NOT NULL DEFAULT 0,
  experimental INTEGER NOT NULL DEFAULT 0,
  dominant public.cognitive_style NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ CI SCORES / WEIGHTS / INSIGHTS ============
CREATE TABLE public.ci_scores (
  entity_id UUID PRIMARY KEY REFERENCES public.entities(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  sub_scores JSONB NOT NULL DEFAULT '{}'::JSONB,
  total_users INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ci_scores_org ON public.ci_scores(org_id);

CREATE TABLE public.ci_weights (
  org_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  weights JSONB NOT NULL DEFAULT '{
    "skill_diversity":0.20,
    "disc_diversity":0.15,
    "cognitive_diversity":0.15,
    "collaboration_balance":0.15,
    "innovation":0.20,
    "role_distribution":0.15
  }'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.insights_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lenses JSONB NOT NULL DEFAULT '["skill_radar","disc_pie","cognitive_pie","collab_innov","dept_heatmap","role_bar","automation"]'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_sugg_entity ON public.ai_suggestions(entity_id);

-- ============ ORG INVITES ============
CREATE TABLE public.org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'employee',
  created_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invites_token ON public.org_invites(token);
CREATE INDEX idx_invites_org ON public.org_invites(org_id);

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.skills TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.profile_skills TO authenticated;
GRANT SELECT ON public.languages TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.profile_languages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.work_style TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.disc_results TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cognitive_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_scores TO authenticated;
GRANT SELECT, UPDATE ON public.ci_weights TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.insights_preferences TO authenticated;
GRANT SELECT, INSERT ON public.ai_suggestions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_invites TO authenticated;
GRANT SELECT ON public.org_invites TO anon;  -- invite acceptance flow before sign-in

GRANT ALL ON public.organizations, public.user_roles, public.entities, public.profiles,
            public.skills, public.profile_skills, public.languages, public.profile_languages,
            public.work_style, public.disc_results, public.cognitive_results,
            public.ci_scores, public.ci_weights, public.insights_preferences,
            public.ai_suggestions, public.org_invites TO service_role;

-- ============ ENABLE RLS ============
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_style ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disc_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cognitive_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============

-- Organizations: members can see their org; admins can update; anyone can create one (becomes admin)
CREATE POLICY "org_select_member" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), id));
CREATE POLICY "org_insert_any" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "org_update_admin" ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), id, 'org_admin'));

-- user_roles: members can read roles in their org; only admins can assign new roles; bootstrap allowed for self
CREATE POLICY "roles_select_org" ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "roles_insert_self_or_admin" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), org_id, 'org_admin'));
CREATE POLICY "roles_delete_admin" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), org_id, 'org_admin'));

-- entities
CREATE POLICY "entities_select_org" ON public.entities FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "entities_write_admin" ON public.entities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), org_id, 'org_admin'))
  WITH CHECK (public.has_role(auth.uid(), org_id, 'org_admin'));

-- profiles: see own; admins see all in org; anyone in org can read aggregate data via server functions
CREATE POLICY "profiles_select_org" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), org_id, 'org_admin'));
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), org_id, 'org_admin'));

-- skills/languages catalogs are global, readable by all authenticated
CREATE POLICY "skills_read_all" ON public.skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "languages_read_all" ON public.languages FOR SELECT TO authenticated USING (true);

-- profile_skills / languages: only owner manages
CREATE POLICY "ps_select" ON public.profile_skills FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id
    AND (p.id = auth.uid() OR public.has_role(auth.uid(), p.org_id, 'org_admin'))));
CREATE POLICY "ps_write_self" ON public.profile_skills FOR ALL TO authenticated
  USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "pl_select" ON public.profile_languages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id
    AND (p.id = auth.uid() OR public.has_role(auth.uid(), p.org_id, 'org_admin'))));
CREATE POLICY "pl_write_self" ON public.profile_languages FOR ALL TO authenticated
  USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- work_style / disc / cognitive: owner write; owner + admin read
CREATE POLICY "ws_select" ON public.work_style FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id
    AND (p.id = auth.uid() OR public.has_role(auth.uid(), p.org_id, 'org_admin'))));
CREATE POLICY "ws_write_self" ON public.work_style FOR ALL TO authenticated
  USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "disc_select" ON public.disc_results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id
    AND (p.id = auth.uid() OR public.has_role(auth.uid(), p.org_id, 'org_admin'))));
CREATE POLICY "disc_write_self" ON public.disc_results FOR ALL TO authenticated
  USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "cog_select" ON public.cognitive_results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id
    AND (p.id = auth.uid() OR public.has_role(auth.uid(), p.org_id, 'org_admin'))));
CREATE POLICY "cog_write_self" ON public.cognitive_results FOR ALL TO authenticated
  USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- ci_scores / weights / insights / ai_suggestions: org members read; admins write
CREATE POLICY "ci_select" ON public.ci_scores FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "ci_write_admin" ON public.ci_scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), org_id, 'org_admin'))
  WITH CHECK (public.has_role(auth.uid(), org_id, 'org_admin'));

CREATE POLICY "ciw_select" ON public.ci_weights FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "ciw_update_admin" ON public.ci_weights FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), org_id, 'org_admin'));

CREATE POLICY "ip_self" ON public.insights_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "ais_select" ON public.ai_suggestions FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "ais_insert_member" ON public.ai_suggestions FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), org_id));

-- invites: admins manage; anyone (incl anon) can lookup by token for accept flow
CREATE POLICY "inv_select_admin_or_token" ON public.org_invites FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), org_id, 'org_admin'));
CREATE POLICY "inv_select_anon_token" ON public.org_invites FOR SELECT TO anon USING (true);
CREATE POLICY "inv_write_admin" ON public.org_invites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), org_id, 'org_admin'))
  WITH CHECK (public.has_role(auth.uid(), org_id, 'org_admin'));

-- ============ SEED CATALOGS ============
INSERT INTO public.skills (name, category) VALUES
  ('Strategy','leadership'),('Leadership','leadership'),('Project Management','operations'),
  ('Data Analysis','analytics'),('Statistics','analytics'),('Machine Learning','engineering'),
  ('Software Engineering','engineering'),('Frontend Development','engineering'),('Backend Development','engineering'),
  ('DevOps','engineering'),('Product Design','design'),('UX Research','design'),('Visual Design','design'),
  ('Marketing','marketing'),('Brand','marketing'),('Content Writing','marketing'),('SEO','marketing'),
  ('Sales','sales'),('Business Development','sales'),('Negotiation','sales'),
  ('Finance','finance'),('Accounting','finance'),('Risk Management','finance'),('Forecasting','finance'),
  ('Human Resources','hr'),('Recruiting','hr'),('Coaching','hr'),
  ('Operations','operations'),('Logistics','operations'),('Process Improvement','operations'),
  ('Communication','soft'),('Public Speaking','soft'),('Critical Thinking','soft'),
  ('Systems Thinking','soft'),('Creativity','soft'),('Innovation','soft'),
  ('Customer Support','operations'),('Legal','legal'),('Compliance','legal');

INSERT INTO public.languages (name) VALUES
  ('English'),('Spanish'),('French'),('German'),('Portuguese'),('Italian'),
  ('Dutch'),('Mandarin'),('Japanese'),('Korean'),('Arabic'),('Hindi'),
  ('Russian'),('Polish'),('Swedish'),('Danish'),('Norwegian'),('Finnish');
