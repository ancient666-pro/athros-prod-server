create or replace function public.safe_uuid(_value text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
begin
  return _value::uuid;
exception when others then
  return null;
end;
$$;

revoke all on function public.safe_uuid(text) from public, anon;
grant execute on function public.safe_uuid(text) to authenticated, service_role;

-- avatars: owner-scoped folder
create policy "avatar owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar owner write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- project-scoped buckets: first folder segment is the project id
create policy "project files read" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('requirements','enhancements','deliveries','documents','meeting-recordings','project-assets')
    and public.safe_uuid((storage.foldername(name))[1]) is not null
    and public.auth_can_read_project(public.safe_uuid((storage.foldername(name))[1]))
  );
create policy "project files insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('requirements','enhancements','deliveries','documents','meeting-recordings','project-assets')
    and public.safe_uuid((storage.foldername(name))[1]) is not null
    and public.auth_can_write_project(public.safe_uuid((storage.foldername(name))[1]))
  );
create policy "project files update" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('requirements','enhancements','deliveries','documents','meeting-recordings','project-assets')
    and public.safe_uuid((storage.foldername(name))[1]) is not null
    and public.auth_can_write_project(public.safe_uuid((storage.foldername(name))[1]))
  );
create policy "project files delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('requirements','enhancements','deliveries','documents','meeting-recordings','project-assets')
    and public.safe_uuid((storage.foldername(name))[1]) is not null
    and public.auth_can_write_project(public.safe_uuid((storage.foldername(name))[1]))
  );
