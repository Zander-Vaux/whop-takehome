-- CreatorJobs marketplace schema

create table if not exists sellers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  whop_company_id text unique,

  kyc_status text not null default 'unverified',
  payout_method_linked boolean not null default false,
  payout_eligible boolean not null default false,

  kyc_verified_at timestamptz,
  whop_payout_account_id text,
  created_at timestamptz not null default now()
);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers(id),

  title text not null,
  description text,
  price_cents integer not null check (price_cents > 0),
  currency text not null default 'usd',
  active boolean not null default true,

  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id),
  seller_id uuid not null references sellers(id),

  buyer_email text not null,

  state text not null default 'pending_payment',

  whop_checkout_config_id text,
  whop_plan_id text,
  whop_payment_id text,

  amount_cents integer not null,
  application_fee_cents integer not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),

  whop_message_id text unique not null,
  event_type text not null,
  company_id text,

  payload jsonb not null,

  status text not null default 'received',
  error text,

  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.enforce_verified_seller_on_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seller_status text;
begin
  select kyc_status
  into seller_status
  from public.sellers
  where id = new.seller_id;

  if seller_status is null or seller_status != 'verified' then
    raise exception 'Seller must complete KYC verification before receiving orders';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_verified_seller_on_order on public.orders;

create trigger trg_enforce_verified_seller_on_order
before insert on public.orders
for each row
execute function public.enforce_verified_seller_on_order();

create index if not exists idx_orders_state on public.orders(state);
create index if not exists idx_webhook_events_status on public.webhook_events(status);
create index if not exists idx_webhook_events_received_at on public.webhook_events(received_at desc);
