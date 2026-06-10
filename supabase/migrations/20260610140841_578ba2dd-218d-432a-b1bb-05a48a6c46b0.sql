-- Grant EXECUTE on security definer functions used in RLS
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, uuid, public.app_role) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.current_org(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_sensitive_profile() TO authenticated, service_role;

-- Make Laura superadmin & mark onboarding complete
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'laura.nordestgaard.ismiris@gmail.com' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, org_id)
    VALUES (v_uid, 'superadmin'::public.app_role, NULL)
    ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET onboarding_complete = true WHERE id = v_uid;
  END IF;
END $$;