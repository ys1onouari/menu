-- =====================================
-- Migration v3 : Table keepalive (anti-pause Free Tier)
-- =====================================
-- Crée une table dédiée pour le endpoint /api/ping qui exécute
-- une vraie requête PostgREST (SELECT) générant une activité réelle
-- sur la base de données, contrairement à l'ancien appel /auth/v1/health
-- qui ne touchait pas Postgres.
--
-- Lié à : api/ping.js (SUPABASE_QUERY_PATH)
-- Ref    : docs/SUPABASE_KEEPALIVE_FIX.md
-- Date   : 2026-07-08

CREATE TABLE IF NOT EXISTS public.keepalive (
  id serial primary key,
  created_at timestamptz default now()
);

INSERT INTO public.keepalive DEFAULT VALUES;

ALTER TABLE public.keepalive ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_anon_select
ON public.keepalive
FOR SELECT
TO anon
USING (true);
