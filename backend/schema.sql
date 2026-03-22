-- ============================================================
-- Zenvest Supabase Database Schema
-- Run in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- Users table (extends Supabase auth.users)
-- ============================================================
create table if not exists public.users (
  id            uuid        primary key references auth.users(id) on delete cascade,
  email         text        not null,
  name          text,
  is_premium    boolean     default false,
  premium_ref   text,
  premium_activated boolean default false,
  email_reports boolean     default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- RLS
alter table public.users enable row level security;
create policy "Users can read own data"   on public.users for select using (auth.uid() = id);
create policy "Users can update own data" on public.users for update using (auth.uid() = id);
create policy "Users can insert own data" on public.users for insert with check (auth.uid() = id);

-- Auto-create user row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- User Profiles (onboarding quiz answers)
-- ============================================================
create table if not exists public.user_profiles (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null unique references public.users(id) on delete cascade,
  age_group       int         default 1 check (age_group between 0 and 3),
  income_range    int         default 1 check (income_range between 0 and 3),
  savings_level   int         default 1 check (savings_level between 0 and 2),
  risk_tolerance  int         default 3 check (risk_tolerance between 1 and 5),
  investment_goal int         default 1 check (investment_goal between 0 and 2),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.user_profiles enable row level security;
create policy "Users can CRUD own profile" on public.user_profiles
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Transactions
-- ============================================================
create table if not exists public.transactions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.users(id) on delete cascade,
  type        text        not null check (type in ('income', 'expense')),
  amount      numeric(12,2) not null check (amount > 0),
  category    text        not null,
  description text        default '',
  date        date        not null,
  created_at  timestamptz default now()
);

create index if not exists idx_transactions_user_date on public.transactions(user_id, date desc);

alter table public.transactions enable row level security;
create policy "Users can CRUD own transactions" on public.transactions
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Financial Goals
-- ============================================================
create table if not exists public.goals (
  id             uuid          primary key default gen_random_uuid(),
  user_id        uuid          not null references public.users(id) on delete cascade,
  name           text          not null,
  category       text          default 'Custom',
  target_amount  numeric(12,2) not null check (target_amount > 0),
  current_amount numeric(12,2) default 0 check (current_amount >= 0),
  deadline       date,
  is_completed   boolean       default false,
  created_at     timestamptz   default now(),
  updated_at     timestamptz   default now()
);

alter table public.goals enable row level security;
create policy "Users can CRUD own goals" on public.goals
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Net Worth Snapshots
-- ============================================================
create table if not exists public.net_worth_snapshots (
  id                uuid          primary key default gen_random_uuid(),
  user_id           uuid          not null references public.users(id) on delete cascade,
  snapshot_date     date          not null default current_date,
  savings           numeric(14,2) default 0,
  investments       numeric(14,2) default 0,
  crypto            numeric(14,2) default 0,
  property          numeric(14,2) default 0,
  loans             numeric(14,2) default 0,
  credit_cards      numeric(14,2) default 0,
  other_debt        numeric(14,2) default 0,
  total_assets      numeric(14,2) generated always as (savings + investments + crypto + property) stored,
  total_liabilities numeric(14,2) generated always as (loans + credit_cards + other_debt) stored,
  net_worth         numeric(14,2) generated always as (savings + investments + crypto + property - loans - credit_cards - other_debt) stored,
  created_at        timestamptz   default now()
);

create index if not exists idx_nw_user_date on public.net_worth_snapshots(user_id, snapshot_date);

alter table public.net_worth_snapshots enable row level security;
create policy "Users can CRUD own net worth" on public.net_worth_snapshots
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- AI Chat Logs (optional analytics)
-- ============================================================
create table if not exists public.ai_chat_logs (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(id) on delete cascade,
  message    text,
  response   text,
  created_at timestamptz default now()
);

alter table public.ai_chat_logs enable row level security;
create policy "Users can read own chat logs" on public.ai_chat_logs
  for select using (auth.uid() = user_id);
-- Service role inserts (backend only)
create policy "Service can insert chat logs" on public.ai_chat_logs
  for insert with check (true);
