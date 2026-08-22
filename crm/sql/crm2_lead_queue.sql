-- CRM2 isolated lead import / assignment schema
create table if not exists public.lead_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  total_records integer not null default 0,
  valid_records integer not null default 0,
  invalid_records integer not null default 0,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.lead_batches(id) on delete set null,
  mobile text not null,
  customer_name text,
  product_name text,
  address text,
  city text,
  state text,
  pincode text,
  lead_status text not null default 'pending' check (lead_status in ('pending','assigned','worked','callback','ordered','invalid','duplicate','closed')),
  assigned_to uuid references auth.users(id),
  assigned_at timestamptz,
  worked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_mobile_check check (mobile ~ '^[6-9][0-9]{9}$')
);

create index if not exists leads_assigned_status_idx on public.leads(assigned_to,lead_status,created_at desc);
create index if not exists leads_mobile_idx on public.leads(mobile);
create index if not exists leads_batch_idx on public.leads(batch_id);

create table if not exists public.lead_assignments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  agent_id uuid not null references auth.users(id),
  assigned_by uuid references auth.users(id),
  assignment_date date not null default current_date,
  status text not null default 'assigned' check (status in ('assigned','in_progress','worked','reassigned','cancelled')),
  created_at timestamptz not null default now(),
  unique(lead_id, assignment_date)
);

-- RLS is intentionally not enabled here until CRM2 role mapping is connected.
-- Apply this schema in Supabase SQL editor only on the CRM2 project/database.
