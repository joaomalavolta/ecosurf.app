/**
 * Apagar o próprio registro (alerta ou pico). A RLS é a lei: o servidor só
 * aceita se você for o autor — e, no caso do pico, se ele não tiver fotos
 * de outras pessoas (pico com vida comunitária é patrimônio coletivo).
 */
export async function excluirAlertaProprio(id: string): Promise<boolean> {
  const { sb } = await import('./supabase/client')
  const { error, count } = await sb().from('ameacas').delete({ count: 'exact' }).eq('id', id)
  return !error && (count ?? 0) > 0
}

export async function excluirPicoProprio(id: string): Promise<boolean> {
  const { sb } = await import('./supabase/client')
  const { error, count } = await sb().from('picos').delete({ count: 'exact' }).eq('id', id)
  return !error && (count ?? 0) > 0
}
