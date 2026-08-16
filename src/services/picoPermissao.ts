/**
 * Quem pode editar um pico.
 *
 * A permissão de verdade é a RLS (migration 0062): o autor e a moderação. Esta
 * função existe só para a interface não oferecer um botão que o banco vai
 * recusar — e para não abrir um formulário preenchido que não vai salvar.
 *
 * Nunca é a única barreira. Se alguém montar a URL de edição na mão, o UPDATE
 * ainda passa pela RLS e volta sem tocar em nada.
 */

import { restMeuPapel } from './supabase/rest'
import { carregarPico } from './picos'

const STAFF = ['admin', 'super_admin']

/** Uid da sessão, sem carregar o SDK à toa. */
async function meuId(): Promise<string | null> {
  try {
    const { restMinhaConta } = await import('./conta')
    return (await restMinhaConta()).id ?? null
  } catch {
    return null
  }
}

export async function podeEditarPico(picoId: string): Promise<boolean> {
  const [uid, papel, pico] = await Promise.all([
    meuId(),
    restMeuPapel().catch(() => 'user'),
    carregarPico(picoId).catch(() => undefined),
  ])
  if (!uid || !pico) return false
  return STAFF.includes(papel) || pico.criadoPor === uid
}
