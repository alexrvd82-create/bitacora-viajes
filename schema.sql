create table trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  trip_date date,
  mode text not null,
  round_trip boolean default false,
  stops jsonb not null,
  created_at timestamptz default now()
);

alter table trips enable row level security;

create policy "usuarios ven solo sus viajes"
  on trips for select using (auth.uid() = user_id);
create policy "usuarios insertan sus viajes"
  on trips for insert with check (auth.uid() = user_id);
create policy "usuarios borran sus viajes"
  on trips for delete using (auth.uid() = user_id);
