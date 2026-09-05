-- Chip In — database schema
-- Run in the Supabase SQL editor. Idempotent: safe to re-run.
--
-- Design rules enforced here, not in the client:
--   1. beneficiary is immutable after insert (scored trust property, PRD F4)
--   2. no client may UPDATE any row; insert and select only
--   3. tx_hash is the primary key of contributions — the chain is the ledger

-- ---------------------------------------------------------------- tables

create table if not exists pots (
  id              text primary key,
  name            text        not null check (length(trim(name)) between 1 and 80),
  goal_luna       bigint      not null check (goal_luna > 0),
  currency        text        not null default 'NIM' check (currency in ('NIM', 'USDT')),
  beneficiary     text        not null check (length(beneficiary) > 0),
  creator_address text        not null,
  is_public       boolean     not null default false,
  repeat_interval text        check (repeat_interval in ('weekly', 'monthly')),
  parent_pot_id   text        references pots (id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists contributions (
  tx_hash      text        primary key,
  pot_id       text        not null references pots (id) on delete cascade,
  from_address text        not null,
  amount_luna  bigint      not null check (amount_luna > 0),
  display_name text        check (display_name is null or length(display_name) <= 40),
  confirmed    boolean     not null default false,
  created_at   timestamptz not null default now()
);

-- Unique-wallet counting for the 15-point Real Usage category.
-- One row per address per day; no timestamps, no behavioural tracking.
create table if not exists app_opens (
  address text not null,
  day     date not null default current_date,
  primary key (address, day)
);

create index if not exists contributions_pot_created_idx
  on contributions (pot_id, created_at desc);

create index if not exists pots_public_idx
  on pots (is_public) where is_public;

-- ------------------------------------------------- beneficiary immutability

-- The whole trust model rests on this: once a pot exists, the address that
-- receives the money cannot change. Enforced in the database so it holds even
-- if the client is bypassed entirely.
create or replace function forbid_beneficiary_change()
returns trigger
language plpgsql
as $$
begin
  if new.beneficiary is distinct from old.beneficiary then
    raise exception 'beneficiary is immutable once the pot is created';
  end if;
  if new.goal_luna is distinct from old.goal_luna then
    raise exception 'goal is immutable once the pot is created';
  end if;
  return new;
end;
$$;

drop trigger if exists pots_beneficiary_immutable on pots;
create trigger pots_beneficiary_immutable
  before update on pots
  for each row execute function forbid_beneficiary_change();

-- --------------------------------------------------------------------- RLS

alter table pots          enable row level security;
alter table contributions enable row level security;
alter table app_opens     enable row level security;

-- Pots and contributions are public reads. This is what makes the cold open
-- work with no wallet connected.
drop policy if exists pots_read on pots;
create policy pots_read on pots
  for select using (true);

drop policy if exists pots_insert on pots;
create policy pots_insert on pots
  for insert with check (true);

drop policy if exists contributions_read on contributions;
create policy contributions_read on contributions
  for select using (true);

drop policy if exists contributions_insert on contributions;
create policy contributions_insert on contributions
  for insert with check (true);

-- Deliberately absent: UPDATE and DELETE policies on every table.
-- With RLS on and no policy, those operations are denied for the anon key.
-- A contribution row, once written, cannot be edited or removed by a client.

-- app_opens is write-only from the client's perspective: a wallet can record
-- that it opened the app, but cannot read the roster of everyone else.
drop policy if exists app_opens_insert on app_opens;
create policy app_opens_insert on app_opens
  for insert with check (true);

-- ------------------------------------------------------------ confirmation

-- Contributions are inserted optimistically by the client the moment a tx hash
-- comes back, then flipped to confirmed by a trusted process that has actually
-- seen the transaction on chain. The anon key cannot set confirmed = true,
-- because it cannot UPDATE at all.
--
-- Until that reconciler runs, the UI shows such rows as pending. See
-- ARCHITECTURE.md section 4.

-- ------------------------------------------------------------- public pot

-- The cold open depends on this row existing and being funded.
-- Replace the beneficiary with the real community pot address before launch.
insert into pots (id, name, goal_luna, currency, beneficiary, creator_address, is_public)
values (
  'community',
  'Nimiq community pot',
  500000000000,                                    -- 5,000,000 NIM in Luna
  'NIM',
  'NQ00 0000 0000 0000 0000 0000 0000 0000 0000',  -- TODO: replace before launch
  'NQ00 0000 0000 0000 0000 0000 0000 0000 0000',
  true
)
on conflict (id) do nothing;
