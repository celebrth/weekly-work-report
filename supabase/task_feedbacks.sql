create table public.task_feedbacks (
  id uuid default uuid_generate_v4() primary key,
  report_item_id uuid references public.report_items(id) on delete cascade not null,
  leader_id uuid references public.profiles(id) not null,
  comment text,
  is_visible boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (report_item_id)
);

create trigger handle_task_feedbacks_updated_at
  before update on public.task_feedbacks
  for each row execute procedure public.handle_updated_at();

alter table public.task_feedbacks enable row level security;

-- Members: Can read task-level feedback for their own report items ONLY IF it's marked as visible
create policy "Members can read visible task feedback for their report items"
  on public.task_feedbacks for select
  using (
    is_visible = true and
    exists (
      select 1 from public.report_items
      join public.reports on reports.id = report_items.report_id
      where report_items.id = task_feedbacks.report_item_id and reports.user_id = auth.uid()
    )
  );

-- Leaders: Can create, read, and update task feedback
create policy "Leaders can create task feedback"
  on public.task_feedbacks for insert
  with check (
    leader_id = auth.uid() and
    public.get_current_user_role() = 'leader' and
    exists (
      select 1 from public.report_items
      join public.reports on reports.id = report_items.report_id
      where report_items.id = task_feedbacks.report_item_id and reports.status = 'submitted'
    )
  );

create policy "Leaders can read all task feedback"
  on public.task_feedbacks for select
  using (public.get_current_user_role() = 'leader');

create policy "Leaders can update own task feedback"
  on public.task_feedbacks for update
  using (
    leader_id = auth.uid() and
    public.get_current_user_role() = 'leader'
  );
