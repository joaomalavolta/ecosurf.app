import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY } from './config'

/**
 * Cliente Supabase. Vive num chunk separado, carregado dinamicamente só
 * quando precisa (auth/upload/moderação) — o SDK não entra no bundle do Radar.
 */
let client: SupabaseClient | null = null

export function sb(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY)
  }
  return client
}
