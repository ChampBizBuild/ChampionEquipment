-- Two invoices per booking: hire (pre-schedule) + additional (on return)
alter table invoices add column if not exists kind text;

update invoices set kind = 'hire' where kind is null;

alter table invoices alter column kind set default 'hire';

do $$
begin
  alter table invoices alter column kind set not null;
exception
  when others then null;
end $$;

do $$
begin
  alter table invoices
    add constraint invoices_kind_check
    check (kind in ('hire', 'additional'));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists invoices_booking_kind_uidx
  on invoices (booking_id, kind);
