-- ChatPDF clone - schema iniziale
-- Esegui questo file nell'SQL Editor di Supabase (o con `supabase db push`).

-- 1. Estensione per la ricerca vettoriale
create extension if not exists vector with schema extensions;

-- 2. Documenti caricati
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  file_name text not null,
  storage_path text not null,
  file_url text,
  page_count int,
  status text not null default 'pending' -- pending | processing | ready | error
);

-- 3. Chunk di testo + embedding (768 dimensioni = text-embedding-004)
create table if not exists public.document_chunks (
  id bigserial primary key,
  document_id uuid not null references public.documents(id) on delete cascade,
  content text not null,
  page_number int,
  chunk_index int,
  embedding extensions.vector(768)
);

create index if not exists document_chunks_document_id_idx
  on public.document_chunks (document_id);

-- Indice ANN per la similarita' coseno
create index if not exists document_chunks_embedding_idx
  on public.document_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- 4. Funzione di similarity search richiamata da /api/chat
create or replace function public.match_document_chunks (
  query_embedding extensions.vector(768),
  match_document_id uuid,
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
  where dc.document_id = match_document_id
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

-- 5. RLS: per ora accesso pubblico in lettura, scrittura solo via service role.
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;

drop policy if exists "documents pubblici in lettura" on public.documents;
create policy "documents pubblici in lettura"
  on public.documents for select using (true);

drop policy if exists "chunks pubblici in lettura" on public.document_chunks;
create policy "chunks pubblici in lettura"
  on public.document_chunks for select using (true);

-- 6. Storage bucket per i PDF
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', true)
on conflict (id) do nothing;

drop policy if exists "upload pdf pubblico" on storage.objects;
create policy "upload pdf pubblico"
  on storage.objects for insert
  with check (bucket_id = 'pdfs');

drop policy if exists "lettura pdf pubblica" on storage.objects;
create policy "lettura pdf pubblica"
  on storage.objects for select
  using (bucket_id = 'pdfs');
