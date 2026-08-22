
-- Numero totale di chunk previsti per il documento: e' il denominatore della
-- barra di avanzamento e la condizione di completamento dell'ingestion, che
-- avviene una slice per volta su piu' invocazioni della route.
alter table public.documents
  add column if not exists total_chunks integer;

-- L'ingestion riparte dal numero di chunk gia' salvati: questo vincolo rende
-- l'inserimento idempotente e blocca i doppioni se due tentativi si sovrappongono.
create unique index if not exists document_chunks_document_id_chunk_index_key
  on public.document_chunks (document_id, chunk_index);
