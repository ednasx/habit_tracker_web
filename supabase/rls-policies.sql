alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "Users can view their own habits"
on public.habits
for select
using (auth.uid() = user_id);

create policy "Users can insert their own habits"
on public.habits
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own habits"
on public.habits
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own habits"
on public.habits
for delete
using (auth.uid() = user_id);

create policy "Users can view their own habit logs"
on public.habit_logs
for select
using (auth.uid() = user_id);

create policy "Users can insert their own habit logs"
on public.habit_logs
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own habit logs"
on public.habit_logs
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own habit logs"
on public.habit_logs
for delete
using (auth.uid() = user_id);
