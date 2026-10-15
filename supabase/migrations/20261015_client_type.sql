begin;

alter table public.connects
  add column if not exists client_type text not null default 'unclassified';

alter table public.connects drop constraint if exists connects_client_type_check;
alter table public.connects add constraint connects_client_type_check
  check (client_type in ('unclassified', 'enterprise', 'potential'));

commit;
