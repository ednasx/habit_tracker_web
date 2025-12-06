alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.habit_stats enable row level security;

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

-- Enable RLS on friends
alter table public.friends enable row level security;

-- Users can view their own friendships
create policy "Users can view their own friendships"
on public.friends
for select
using (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can create friendships where they are the user_id
create policy "Users can create friendships"
on public.friends
for insert
with check (auth.uid() = user_id);

-- Users can delete their own friendships
create policy "Users can delete their own friendships"
on public.friends
for delete
using (auth.uid() = user_id);
