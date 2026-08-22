-- Aaroogyam CRM1 next-sequence compatibility migration
-- Additive only. Existing working CRM tables and data remain intact.

-- Existing Professional Modules use followups.note while the current database
-- already has followups.notes. Keep both compatible without changing old data.
alter table public.followups add column if not exists note text null;
update public.followups set note=notes where note is null and notes is not null;

create or replace function public.crm1_sync_followup_note()
returns trigger language plpgsql as $$
begin
  if new.note is null and new.notes is not null then new.note:=new.notes; end if;
  if new.notes is null and new.note is not null then new.notes:=new.note; end if;
  return new;
end $$;

drop trigger if exists crm1_sync_followup_note_before_write on public.followups;
create trigger crm1_sync_followup_note_before_write
before insert or update on public.followups
for each row execute function public.crm1_sync_followup_note();

-- Telephony lifecycle bridge. No SIP/Asterisk/VICIdial secret is stored here.
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
create index if not exists crm_call_events_user_idx on public.crm_call_events(user_id,event_at desc);

-- Verify:
-- select column_name from information_schema.columns
-- where table_schema='public' and table_name='followups' and column_name='note';
-- select to_regclass('public.crm_call_events');
