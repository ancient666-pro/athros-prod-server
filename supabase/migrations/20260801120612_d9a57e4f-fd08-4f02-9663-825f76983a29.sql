revoke all on function public.handle_new_user() from anon, authenticated;
revoke all on function public.has_role(uuid, public.app_role) from anon;
revoke all on function public.owns_project(uuid) from anon;