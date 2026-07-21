-- Champion Equipment — hire management schema

create extension if not exists "pgcrypto";

-- Business settings (sole trader details for invoices / remittance)
create table business_settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'Champion Equipment',
  trading_as text not null default 'Craig R Champion',
  abn text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  bank_name text not null default '',
  bsb text not null default '',
  account_number text not null default '',
  account_name text not null default '',
  gst_registered boolean not null default true,
  invoice_prefix text not null default 'CE',
  next_invoice_number integer not null default 1001,
  updated_at timestamptz not null default now()
);

insert into business_settings (id) values ('00000000-0000-0000-0000-000000000001');

-- Editable legal templates
create table document_templates (
  id uuid primary key default gen_random_uuid(),
  type text not null unique check (type in ('terms_of_trade', 'hire_agreement')),
  title text not null,
  body text not null,
  updated_at timestamptz not null default now()
);

insert into document_templates (type, title, body) values
(
  'terms_of_trade',
  'Terms of Trade',
  E'TERMS OF TRADE — CHAMPION EQUIPMENT\n\nThese Terms of Trade apply to all plant and equipment hire from Champion Equipment (Craig R Champion).\n\n1. Hire charges apply from the agreed pickup date until the equipment is returned and accepted.\n2. The hirer is responsible for the equipment while it is in their possession, including theft, loss, and damage (fair wear and tear excepted).\n3. Equipment must be used only for its intended purpose by competent operators and in accordance with all laws and site requirements.\n4. Fuel, consumables, and ordinary operating costs are the hirer''s responsibility unless otherwise agreed in writing.\n5. Payment is due as stated on the invoice. Overdue amounts may attract recovery costs.\n6. Champion Equipment may terminate the hire and recover equipment if these terms are breached.\n7. Nothing in these terms limits rights that cannot be excluded under Australian Consumer Law.\n\nBy accepting, the hirer agrees to these Terms of Trade.'
),
(
  'hire_agreement',
  'Hire Agreement',
  E'HIRE AGREEMENT — CHAMPION EQUIPMENT\n\nThis Hire Agreement is between Champion Equipment (Craig R Champion) and the Client named in the booking.\n\n1. Equipment, pickup date, and drop-off date are as stated in the booking confirmation.\n2. Day and week rates are as quoted for the selected equipment. GST applies if Champion Equipment is GST-registered.\n3. The Client must inspect the equipment on pickup and report any defects immediately.\n4. The Client must return the equipment in clean, workable condition on the agreed drop-off date/time unless an extension is approved.\n5. Late returns may be charged at the applicable day rate.\n6. The Client must not sub-hire, lend, or modify the equipment without written consent.\n7. Acceptance of this agreement (typed full name, timestamp, and IP) constitutes the Client''s signature for this hire.\n\nBy accepting, the Client agrees to this Hire Agreement together with the Terms of Trade.'
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text not null,
  abn text,
  email text not null,
  phone text,
  billing_address text,
  notes text,
  created_at timestamptz not null default now()
);

create table equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  make_model text,
  day_rate numeric(12,2) not null default 0,
  week_rate numeric(12,2) not null default 0,
  status text not null default 'available'
    check (status in ('available', 'booked', 'out', 'returned', 'service')),
  notes text,
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  equipment_id uuid not null references equipment(id) on delete restrict,
  pickup_date date not null,
  dropoff_date date not null,
  status text not null default 'enquiry'
    check (status in (
      'enquiry', 'terms_sent', 'confirmed', 'out',
      'returned', 'invoiced', 'paid', 'cancelled'
    )),
  accept_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  needs_service boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  constraint bookings_dates_ok check (dropoff_date >= pickup_date)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  type text not null check (type in ('terms_of_trade', 'hire_agreement', 'acceptance_snapshot')),
  sent_at timestamptz,
  accepted_at timestamptz,
  accepted_name text,
  accepted_ip text,
  pdf_url text,
  created_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete restrict,
  invoice_number text not null unique,
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  gst numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  due_date date,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'paid', 'overdue')),
  pdf_url text,
  created_at timestamptz not null default now()
);

create index bookings_client_idx on bookings(client_id);
create index bookings_equipment_idx on bookings(equipment_id);
create index bookings_status_idx on bookings(status);
create index bookings_dates_idx on bookings(pickup_date, dropoff_date);
create index documents_booking_idx on documents(booking_id);
create index invoices_booking_idx on invoices(booking_id);

-- Storage bucket for PDFs
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- RLS: authenticated operators have full access; public accept uses service role
alter table business_settings enable row level security;
alter table document_templates enable row level security;
alter table clients enable row level security;
alter table equipment enable row level security;
alter table bookings enable row level security;
alter table documents enable row level security;
alter table invoices enable row level security;

create policy "operators all business_settings"
  on business_settings for all to authenticated
  using (true) with check (true);

create policy "operators all document_templates"
  on document_templates for all to authenticated
  using (true) with check (true);

create policy "operators all clients"
  on clients for all to authenticated
  using (true) with check (true);

create policy "operators all equipment"
  on equipment for all to authenticated
  using (true) with check (true);

create policy "operators all bookings"
  on bookings for all to authenticated
  using (true) with check (true);

create policy "operators all documents"
  on documents for all to authenticated
  using (true) with check (true);

create policy "operators all invoices"
  on invoices for all to authenticated
  using (true) with check (true);

create policy "operators read documents bucket"
  on storage.objects for select to authenticated
  using (bucket_id = 'documents');

create policy "operators write documents bucket"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents');

create policy "operators update documents bucket"
  on storage.objects for update to authenticated
  using (bucket_id = 'documents');

-- Seed sample equipment (optional starter row)
insert into equipment (name, make_model, day_rate, week_rate, status, notes)
values ('1.8T Excavator', 'Kubota / equivalent', 320.00, 1400.00, 'available', 'Starter plant record');
