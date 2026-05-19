-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Trigger function for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- 1. Profiles Table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text,
  role text default 'member' check (role in ('member', 'leader')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

alter table public.profiles enable row level security;

-- Security Definer function to get current user's role safely (prevents infinite recursion)
create or replace function public.get_current_user_role()
returns text as $$
declare
  user_role text;
begin
  select role into user_role from public.profiles where id = auth.uid();
  return user_role;
end;
$$ language plpgsql security definer set search_path = public;

-- Policy: Users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Policy: Leaders can read all profiles
create policy "Leaders can read all profiles"
  on public.profiles for select
  using (public.get_current_user_role() = 'leader');

-- Trigger to create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'member');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Reports Table
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  week_start_date date not null,
  status text default 'draft' check (status in ('draft', 'submitted')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, week_start_date)
);

create trigger handle_reports_updated_at
  before update on public.reports
  for each row execute procedure public.handle_updated_at();

alter table public.reports enable row level security;

-- Members: Manage own reports
create policy "Members can insert own reports"
  on public.reports for insert
  with check (auth.uid() = user_id);

create policy "Members can select own reports"
  on public.reports for select
  using (auth.uid() = user_id);

create policy "Members can update own reports"
  on public.reports for update
  using (auth.uid() = user_id);

create policy "Members can delete own reports"
  on public.reports for delete
  using (auth.uid() = user_id);

-- Leaders: Can only read SUBMITTED reports (drafts remain private to members)
create policy "Leaders can select submitted reports"
  on public.reports for select
  using (
    status = 'submitted' and
    public.get_current_user_role() = 'leader'
  );


-- 3. Report Items Table
create table public.report_items (
  id uuid default uuid_generate_v4() primary key,
  report_id uuid references public.reports(id) on delete cascade not null,
  category text not null check (category in ('Completed This Week', 'Next Week Plan', 'Assigned Tasks')),
  title text not null,
  description text,
  status text not null check (status in ('Planned', 'In Progress', 'Completed', 'On Hold', 'Delayed')),
  progress integer default 0 check (progress >= 0 and progress <= 100),
  issues text,
  support_requested text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create trigger handle_report_items_updated_at
  before update on public.report_items
  for each row execute procedure public.handle_updated_at();

alter table public.report_items enable row level security;

-- Members: Manage their own report items
create policy "Members can insert report items"
  on public.report_items for insert
  with check (
    exists (
      select 1 from public.reports
      where id = report_items.report_id and user_id = auth.uid()
    )
  );

create policy "Members can select own report items"
  on public.report_items for select
  using (
    exists (
      select 1 from public.reports
      where id = report_items.report_id and user_id = auth.uid()
    )
  );

create policy "Members can update own report items"
  on public.report_items for update
  using (
    exists (
      select 1 from public.reports
      where id = report_items.report_id and user_id = auth.uid()
    )
  );

create policy "Members can delete own report items"
  on public.report_items for delete
  using (
    exists (
      select 1 from public.reports
      where id = report_items.report_id and user_id = auth.uid()
    )
  );

-- Leaders: Can read report items of SUBMITTED reports only
create policy "Leaders can select items of submitted reports"
  on public.report_items for select
  using (
    exists (
      select 1 from public.reports
      where id = report_items.report_id and status = 'submitted'
    ) and
    public.get_current_user_role() = 'leader'
  );


-- 4. Feedbacks Table
create table public.feedbacks (
  id uuid default uuid_generate_v4() primary key,
  report_id uuid references public.reports(id) on delete cascade not null,
  leader_id uuid references public.profiles(id) not null,
  overall_feedback text,
  strengths text,
  improvements text,
  next_focus text,
  is_visible boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (report_id)
);

create trigger handle_feedbacks_updated_at
  before update on public.feedbacks
  for each row execute procedure public.handle_updated_at();

alter table public.feedbacks enable row level security;

-- Members: Can read feedback for their own reports ONLY IF it's marked as visible
create policy "Members can read visible feedback for their reports"
  on public.feedbacks for select
  using (
    is_visible = true and
    exists (
      select 1 from public.reports
      where id = feedbacks.report_id and user_id = auth.uid()
    )
  );

-- Leaders: Can create, read, and update feedback
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
