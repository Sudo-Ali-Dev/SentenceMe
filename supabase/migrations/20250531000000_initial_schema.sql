-- SentenceMe initial schema

-- profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  words_per_day int not null default 5 check (words_per_day between 1 and 20),
  level text not null default 'intermediate',
  categories text[] not null default array['general', 'academic'],
  timezone text not null default 'UTC',
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- words
create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  term text not null,
  definition text not null,
  part_of_speech text not null default 'noun',
  example text not null default '',
  source text not null default 'ai' check (source in ('ai', 'custom')),
  week_start date not null,
  added_date date not null default current_date,
  mastery int not null default 0 check (mastery between 0 and 3),
  times_correct int not null default 0,
  times_incorrect int not null default 0,
  status text not null default 'learning' check (status in ('learning', 'mastered')),
  next_review_date date,
  learned_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, term)
);

create index if not exists words_user_id_idx on public.words(user_id);
create index if not exists words_user_status_review_idx on public.words(user_id, status, next_review_date);
create index if not exists words_user_week_start_idx on public.words(user_id, week_start);

-- attempts
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  sentence text not null,
  is_correct boolean not null,
  feedback text not null default '',
  correction text,
  context text not null default 'daily' check (context in ('daily', 'sunday', 'review')),
  created_at timestamptz not null default now()
);

create index if not exists attempts_user_id_idx on public.attempts(user_id);
create index if not exists attempts_word_id_idx on public.attempts(word_id);

-- daily_sessions
create table if not exists public.daily_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  completed_at timestamptz,
  word_ids uuid[] not null default array[]::uuid[],
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists daily_sessions_user_id_idx on public.daily_sessions(user_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.words enable row level security;
alter table public.attempts enable row level security;
alter table public.daily_sessions enable row level security;

-- profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- words policies
create policy "Users can view own words"
  on public.words for select
  using (auth.uid() = user_id);

create policy "Users can insert own words"
  on public.words for insert
  with check (auth.uid() = user_id);

create policy "Users can update own words"
  on public.words for update
  using (auth.uid() = user_id);

create policy "Users can delete own words"
  on public.words for delete
  using (auth.uid() = user_id);

-- attempts policies
create policy "Users can view own attempts"
  on public.attempts for select
  using (auth.uid() = user_id);

create policy "Users can insert own attempts"
  on public.attempts for insert
  with check (auth.uid() = user_id);

-- daily_sessions policies
create policy "Users can view own daily sessions"
  on public.daily_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own daily sessions"
  on public.daily_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own daily sessions"
  on public.daily_sessions for update
  using (auth.uid() = user_id);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at trigger for profiles
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
