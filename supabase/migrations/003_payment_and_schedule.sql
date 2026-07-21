-- Client readiness checklist for operator scheduling
alter table bookings
  add column if not exists payment_received_at timestamptz,
  add column if not exists payment_notes text,
  add column if not exists scheduled_at timestamptz;

comment on column bookings.payment_received_at is
  'When operator confirmed deposit/hire payment received from client';
comment on column bookings.scheduled_at is
  'When operator accepted readiness and scheduled the hire';
