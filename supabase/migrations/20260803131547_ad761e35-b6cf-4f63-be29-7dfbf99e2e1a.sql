create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  staff_emails text[] := array['admin@athros.dev'];
begin
  insert into public.profiles (id, full_name, company)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'company')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'client')
  on conflict (user_id, role) do nothing;

  if lower(coalesce(new.email, '')) = any (staff_emails) then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$function$;

insert into public.user_roles (user_id, role)
select id, 'admin'::app_role from auth.users where lower(email) = 'admin@athros.dev'
on conflict (user_id, role) do nothing;