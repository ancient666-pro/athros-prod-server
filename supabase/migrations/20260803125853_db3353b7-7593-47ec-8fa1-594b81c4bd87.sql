CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role = _role
      and (_user_id = auth.uid() or auth.role() = 'service_role')
  )
$function$;

CREATE OR REPLACE FUNCTION public.owns_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  select exists (
    select 1 from public.projects p
    where p.id = _project_id
      and p.client_id = auth.uid()
      and auth.uid() is not null
  )
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owns_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.owns_project(uuid) TO authenticated, service_role;