-- 1. Create the security definer function to bypass RLS safely
create or replace function public.get_current_user_role()
returns text as $$
declare
  user_role text;
begin
  select role into user_role from public.profiles where id = auth.uid();
  return user_role;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Update Profiles Policies
drop policy if exists "Leaders can read all profiles" on public.profiles;

create policy "Leaders can read all profiles"
  on public.profiles for select
  using (public.get_current_user_role() = 'leader');

-- 3. Update Reports Policies
drop policy if exists "Leaders can select submitted reports" on public.reports;

create policy "Leaders can select submitted reports"
  on public.reports for select
  using (
    status = 'submitted' and
    public.get_current_user_role() = 'leader'
  );

-- 4. Update Report Items Policies
drop policy if exists "Leaders can select items of submitted reports" on public.report_items;

create policy "Leaders can select items of submitted reports"
  on public.report_items for select
  using (
    exists (
      select 1 from public.reports
      where id = report_items.report_id and status = 'submitted'
    ) and
    public.get_current_user_role() = 'leader'
  );

-- 5. Update Feedbacks Policies
drop policy if exists "Leaders can create feedback" on public.feedbacks;
drop policy if exists "Leaders can read all feedback" on public.feedbacks;
drop policy if exists "Leaders can update own feedback" on public.feedbacks;

create policy "Leaders can create feedback"
  on public.feedbacks for insert
  with check (
    leader_id = auth.uid() and
    public.get_current_user_role() = 'leader' and
    exists (
      select 1 from public.reports
      where id = feedbacks.report_id and status = 'submitted'
    )
  );

create policy "Leaders can read all feedback"
  on public.feedbacks for select
  using (public.get_current_user_role() = 'leader');

create policy "Leaders can update own feedback"
  on public.feedbacks for update
  using (
    leader_id = auth.uid() and
    public.get_current_user_role() = 'leader'
  );
