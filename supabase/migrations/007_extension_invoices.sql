-- Mid-term / extension invoices for overstay while machine is still out.
-- Multiple extension invoices per booking are allowed; hire + additional stay unique.

alter table invoices drop constraint if exists invoices_kind_check;

alter table invoices
  add constraint invoices_kind_check
  check (kind in ('hire', 'additional', 'extension'));

drop index if exists invoices_booking_kind_uidx;

create unique index if not exists invoices_booking_hire_uidx
  on invoices (booking_id)
  where kind = 'hire';

create unique index if not exists invoices_booking_additional_uidx
  on invoices (booking_id)
  where kind = 'additional';
