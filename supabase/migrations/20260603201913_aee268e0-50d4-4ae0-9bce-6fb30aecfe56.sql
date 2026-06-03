
-- 1. Remove anonymous SELECT on org_invites
DROP POLICY IF EXISTS inv_select_anon_token ON public.org_invites;

-- 2. Restrict user_roles INSERT to admins only (remove self-insert privilege escalation)
DROP POLICY IF EXISTS roles_insert_self_or_admin ON public.user_roles;
CREATE POLICY roles_insert_admin ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), org_id, 'org_admin'::public.app_role));

-- 3. Restrict column-level SELECT on profiles: remove direct access to religion and sexual_orientation
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (
  id, org_id, email, full_name, age, gender, education_level, field_of_study,
  updated_at, created_at, onboarding_complete, team_entity_id, department_entity_id,
  role_type, job_title
) ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Security-definer accessor so the owner can still read their own sensitive fields
CREATE OR REPLACE FUNCTION public.get_my_sensitive_profile()
RETURNS TABLE(religion text, sexual_orientation text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT religion, sexual_orientation FROM public.profiles WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.get_my_sensitive_profile() TO authenticated;
