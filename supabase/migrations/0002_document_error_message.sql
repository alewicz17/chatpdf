
alter table public.documents
  add column if not exists error_message text;
