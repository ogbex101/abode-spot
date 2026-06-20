-- Tighten advisor warnings after the initial schema push.

-- Public buckets can serve object URLs without a broad SELECT policy that lets
-- clients list every object in the bucket.
drop policy if exists property_images_public_read on storage.objects;

-- This function existed in the project before this migration. If present, it
-- should not be callable through the Data API as a SECURITY DEFINER function.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from anon;
    revoke execute on function public.rls_auto_enable() from authenticated;
    revoke execute on function public.rls_auto_enable() from public;
  end if;
end $$;
