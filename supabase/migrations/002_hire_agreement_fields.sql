-- Hire agreement fillable fields on bookings
alter table bookings
  add column if not exists hire_details jsonb not null default '{}'::jsonb;

comment on column bookings.hire_details is
  'Fillable Machine Hire Agreement fields (site, attachments, operator, insurance, etc.)';
