revoke all on function public.handle_new_user() from public;
revoke all on function public.has_role(uuid, public.app_role) from public;
revoke all on function public.owns_project(uuid) from public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.owns_project(uuid) to authenticated, service_role;
grant execute on function public.handle_new_user() to service_role;