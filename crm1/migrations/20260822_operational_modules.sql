-- Aaroogyam CRM1 operational modules schema
-- Additive migration: does not replace existing working CRM tables or data.
-- Run in Supabase SQL Editor after taking a database backup.

alter table if exists public.orders
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verified_by uuid null,
  add column if not exists verified_at timestamptz null,
  add column if not exists lead_status text null,
  add column if not exists next_followup_at timestamptz null;

create table if not exists public.followups (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  assigned_to uuid null,
  followup_at timestamptz not null,
  note text null,
  status text not null default 'pending' check (status in ('pending','completed','cancelled')),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  created_by uuid null
);
create index if not exists followups_assigned_when_idx on public.followups(assigned_to,followup_at);
create index if not exists followups_order_idx on public.followups(order_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  action text not null,
  entity_type text not null,
  entity_id uuid null,
  old_data jsonb null,
  new_data jsonb null,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type,entity_id,created_at desc);

create table if not exists public.crm_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  title text not null,
  message text null,
  severity text not null default 'info' check (severity in ('info','success','warning','danger')),
  entity_type text null,
  entity_id uuid null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz null
);
create index if not exists crm_notifications_user_idx on public.crm_notifications(user_id,is_read,created_at desc);

create table if not exists public.pin_assignment_rules (
  id uuid primary key default gen_random_uuid(),
  pincode text not null check (pincode ~ '^[0-9]{6}$'),
  partner_id uuid not null,
  priority integer not null default 1 check (priority between 1 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid null,
  unique(pincode,partner_id)
);
create index if not exists pin_assignment_rules_lookup_idx on public.pin_assignment_rules(pincode,is_active,priority);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  qty_in numeric not null default 0 check (qty_in >= 0),
  qty_out numeric not null default 0 check (qty_out >= 0),
  reference_type text null,
  reference_id uuid null,
  remarks text null,
  created_by uuid null,
  created_at timestamptz not null default now()
);
create index if not exists inventory_movements_product_idx on public.inventory_movements(product_id,created_at desc);

-- Safe partner performance view. Supports both dealer and courier assignments
-- when the corresponding columns exist in the current CRM orders table.
create or replace view public.v_partner_performance as
select
  coalesce(d.id::text,c.courier_manager_id::text) as partner_key,
  coalesce(d.business_name,p.full_name,'Unassigned') as partner_name,
  case when d.id is not null then 'dealer' when c.courier_manager_id is not null then 'courier' else 'unassigned' end as partner_type,
  count(o.id) as total_orders,
  count(o.id) filter (where o.order_status='delivered') as delivered_orders,
  count(o.id) filter (where o.order_status in ('rto','returned','cancelled')) as rto_orders,
  coalesce(sum(o.total_amount) filter (where o.order_status='delivered'),0) as delivered_value
from public.orders o
left join public.dealers d on d.id=o.dealer_id
left join public.profiles p on p.id=o.courier_manager_id
cross join lateral (select o.courier_manager_id) c
where coalesce(o.remarks,'') not ilike '%[ENQUIRY]%'
group by d.id,d.business_name,c.courier_manager_id,p.full_name;

-- Telephony bridge metadata: no credentials are stored here.
create table if not exists public.crm_telephony_agents (
  user_id uuid primary key,
  extension text unique null,
  dialer_user text unique null,
  sip_enabled boolean not null default false,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_call_events (
  id uuid primary key default gen_random_uuid(),
  call_id text not null,
  user_id uuid null,
  lead_id uuid null,
  customer_id uuid null,
  mobile text null,
  event_type text not null,
  event_at timestamptz not null default now(),
  payload jsonb null
);
create index if not exists crm_call_events_call_idx on public.crm_call_events(call_id,event_at);

-- Verify the migration after execution:
-- select to_regclass('public.followups'),to_regclass('public.audit_logs'),to_regclass('public.crm_notifications'),to_regclass('public.pin_assignment_rules'),to_regclass('public.inventory_movements'),to_regclass('public.crm_telephony_agents'),to_regclass('public.crm_call_events');
