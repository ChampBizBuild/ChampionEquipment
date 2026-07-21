-- Equipment plant IDs + condition inspections (outbound / return)

alter table equipment add column if not exists asset_id text;

update equipment
set asset_id = 'MRX371'
where asset_id is null
  and (
    name ilike '%1.8%'
    or name ilike '%1.8T%'
    or name ilike '%excavator%'
  );

update equipment
set asset_id = 'MRX364'
where asset_id is null
  and (
    name ilike '%259%'
    or name ilike '%259D%'
    or make_model ilike '%259%'
  );

create table if not exists condition_inspections (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  equipment_id uuid not null references equipment(id) on delete restrict,
  phase text not null check (phase in ('outbound', 'return')),
  hours_reading numeric(12,1),
  fuel_level text not null check (fuel_level in ('empty', '1/4', '1/2', '3/4', 'full')),
  photo_front_url text,
  photo_rear_url text,
  photo_left_url text,
  photo_right_url text,
  notes text,
  needs_service boolean not null default false,
  inspected_at timestamptz not null default now(),
  inspected_by text,
  client_ack_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  client_ack_name text,
  client_ack_at timestamptz,
  client_ack_ip text,
  created_at timestamptz not null default now(),
  unique (booking_id, phase)
);

create index if not exists condition_inspections_booking_idx
  on condition_inspections (booking_id);

create index if not exists condition_inspections_token_idx
  on condition_inspections (client_ack_token);

alter table condition_inspections enable row level security;

drop policy if exists "operators all condition_inspections" on condition_inspections;
create policy "operators all condition_inspections"
  on condition_inspections for all to authenticated
  using (true) with check (true);

-- Public read of inspection rows is done via service role in API (token lookup)
