import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase. Vive num chunk separado, carregado dinamicamente só
 * quando há backend configurado — o SDK não entra no bundle do Radar.
 */
let client: SupabaseClient | null = null

export function sb(): SupabaseClient {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Supabase não configurado (ver .env.example)')
    client = createClient(url, key)
  }
  return client
}
