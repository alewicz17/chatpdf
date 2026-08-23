-- Auth: ogni documento appartiene a un utente e resta visibile solo a lui.
-- Esegui questo file nell'SQL Editor di Supabase.

-- 1. Proprietario del documento.
-- La colonna e' nullable perche' le righe caricate prima dell'auth non hanno un
-- proprietario: restano nel database ma nessuno le vede piu' (le policy sotto
-- richiedono user_id = auth.uid()). Per rimuoverle:
--   delete from public.documents where user_id is null;
alter table public.documents
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists documents_user_id_idx
  on public.documents (user_id, created_at desc);

-- 2. RLS: lettura solo dei propri documenti (la scrittura resta al service role).
drop policy if exists "documents pubblici in lettura" on public.documents;
drop policy if exists "documents del proprietario in lettura" on public.documents;
create policy "documents del proprietario in lettura"
  on public.documents for select
  using (auth.uid() = user_id);

drop policy if exists "chunks pubblici in lettura" on public.document_chunks;
drop policy if exists "chunks del proprietario in lettura" on public.document_chunks;
create policy "chunks del proprietario in lettura"
  on public.document_chunks for select
  using (
    exists (
      select 1
      from public.documents d
      where d.id = document_chunks.document_id
        and d.user_id = auth.uid()
    )
  );

-- 3. La similarity search verifica il proprietario.
-- La RPC e' chiamata con il service role, che bypassa la RLS: l'utente arriva
-- come parametro esplicito, altrimenti auth.uid() sarebbe null e il controllo
-- non filtrerebbe nulla.
drop function if exists public.match_document_chunks (
  extensions.vector(768), uuid, int
);

create or replace function public.match_document_chunks (
  query_embedding extensions.vector(768),
  match_document_id uuid,
  match_user_id uuid,
  match_count int default 5
)
returns table (
  id bigint,
  content text,
  page_number int,
  similarity float
)
language sql stable
as $$
  select
    dc.id,
    dc.content,
    dc.page_number,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  join public.documents d on d.id = dc.document_id
  where dc.document_id = match_document_id
    and d.user_id = match_user_id
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

-- 4. Storage: bucket privato, i PDF si leggono solo con una signed URL.
update storage.buckets set public = false where id = 'pdfs';

-- Il primo segmento del path e' l'id dell'utente: e' cosi' che si riconosce il
-- proprietario di un oggetto senza una tabella di appoggio.
drop policy if exists "upload pdf pubblico" on storage.objects;
drop policy if exists "lettura pdf pubblica" on storage.objects;

drop policy if exists "upload pdf del proprietario" on storage.objects;
create policy "upload pdf del proprietario"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "lettura pdf del proprietario" on storage.objects;
create policy "lettura pdf del proprietario"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "cancellazione pdf del proprietario" on storage.objects;
create policy "cancellazione pdf del proprietario"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
