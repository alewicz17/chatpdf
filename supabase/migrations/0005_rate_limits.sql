-- Limiti di abuso: vincoli sul bucket dei PDF e rate limiting per utente.
-- Esegui questo file nell'SQL Editor di Supabase.

-- 1. Il bucket applica da solo i limiti che finora esistevano solo nel browser.
-- Senza questi, `supabase.storage.upload()` chiamata a mano con la anon key
-- accetta qualsiasi file di qualsiasi dimensione. 10 MB = MAX_FILE_SIZE_MB in
-- src/components/pdf-dropzone.tsx: i due valori vanno tenuti allineati.
update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf']
where id = 'pdfs';

-- 2. Contatori del rate limiting.
-- Una riga per (utente, bucket): `window_start` e' l'inizio della finestra
-- corrente, `count` le richieste consumate al suo interno.
create table if not exists public.rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null default now(),
  count integer not null default 0,
  primary key (user_id, bucket)
);

-- Nessuna policy: RLS attiva senza policy nega tutto: la tabella e'
-- raggiungibile solo dal service role, che le RLS le bypassa.
alter table public.rate_limits enable row level security;

-- 3. Consumo di una richiesta, atomico.
-- Incremento e rotazione della finestra stanno in una sola INSERT ... ON
-- CONFLICT: due invocazioni concorrenti (su Vercel sono lambda diverse) non
-- possono leggere lo stesso contatore e scrivere entrambe lo stesso valore.
create or replace function public.consume_rate_limit (
  p_user_id uuid,
  p_bucket text,
  p_limit int,
  p_window_seconds int
)
returns table (
  allowed boolean,
  remaining int,
  retry_after int
)
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_window timestamptz;
  v_count int;
begin
  insert into public.rate_limits as rl (user_id, bucket, window_start, count)
  values (p_user_id, p_bucket, v_now, 1)
  on conflict (user_id, bucket) do update
    set
      -- Finestra scaduta: riparte da adesso, altrimenti resta quella in corso.
      window_start = case
        when rl.window_start <= v_now - make_interval(secs => p_window_seconds)
          then v_now
        else rl.window_start
      end,
      count = case
        when rl.window_start <= v_now - make_interval(secs => p_window_seconds)
          then 1
        else rl.count + 1
      end
  returning rl.window_start, rl.count into v_window, v_count;

  return query
  select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    case
      when v_count <= p_limit then 0
      else greatest(
        ceil(
          extract(
            epoch from (v_window + make_interval(secs => p_window_seconds) - v_now)
          )
        )::int,
        1
      )
    end;
end;
$$;

-- La funzione la chiama solo il service role dalle API Route. Senza questa
-- revoca sarebbe esposta da PostgREST anche ad anon, che potrebbe gonfiare il
-- contatore di un utente qualsiasi conoscendone l'id.
revoke all on function public.consume_rate_limit(uuid, text, int, int)
  from public, anon, authenticated;
