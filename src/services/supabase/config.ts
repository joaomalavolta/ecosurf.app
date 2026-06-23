/**
 * Config do Supabase. A URL e a publishable key são de CLIENTE (entram no
 * bundle do front por design; quem protege os dados é a RLS). Por isso ficam
 * embutidas como padrão — o app sai do "modo demo" sem depender de env no deploy.
 * Dá pra sobrescrever por VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY se precisar.
 */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://mdgttlgtrrmkmqttrxdq.supabase.co'

export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZ3R0bGd0cnJta21xdHRyeGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzQ3OTQsImV4cCI6MjA5NzY1MDc5NH0.q2LVxRcxugCL03izcHsRDHVquSy-_WLKr-Pu8uIvcg0'

export const TEM_BACKEND = Boolean(SUPABASE_URL && SUPABASE_KEY)
