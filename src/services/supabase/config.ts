/**
 * Config do Supabase. A URL e a publishable key são de CLIENTE (entram no
 * bundle do front por design; quem protege os dados é a RLS). Por isso ficam
 * embutidas como padrão — o app sai do "modo demo" sem depender de env no deploy.
 * Dá pra sobrescrever por VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY se precisar.
 */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://mdgttlgtrrmkmqttrxdq.supabase.co'

export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_sBt8PiCkmD1BUzKlNbd6zg_mzoTjFFU'

export const TEM_BACKEND = Boolean(SUPABASE_URL && SUPABASE_KEY)
