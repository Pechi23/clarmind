-- In-app account deletion (required by Apple 5.1.1(v) and Google Play policy when
-- the app lets users create accounts).
--
-- A SECURITY DEFINER function so a signed-in user can delete THEIR OWN account:
-- it removes their synced data and their auth user. The client calls it with
-- supabase.rpc('delete_user'); auth.uid() guarantees a user can only delete self.
--
-- Apply once in the Supabase dashboard: SQL Editor -> paste -> Run.

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  -- Remove the user's synced blob first, then the auth user itself.
  delete from public.user_data where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

-- Only a signed-in user may call it (never anon / public).
revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
