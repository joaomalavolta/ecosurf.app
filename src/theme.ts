/** Tema visual do app. Light Ocean UI é o padrão; dark é opcional (toggle). */
import { gravarPreferencia } from './services/preferencias-conta'

export type Tema = 'light' | 'dark'

const CHAVE = 'ecosurf:theme'

export function temaAtual(): Tema {
  try {
    return localStorage.getItem(CHAVE) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/**
 * Aplica no <html data-theme> e persiste (cache local para o boot ser
 * instantâneo + conta, para o tema seguir o usuário entre aparelhos).
 * `sincronizar=false` quando a escolha VEM da conta — evita eco.
 */
export function aplicarTema(t: Tema, sincronizar = true): void {
  document.documentElement.dataset.theme = t
  try {
    localStorage.setItem(CHAVE, t)
  } catch {
    /* sem storage: aplica só nesta sessão */
  }
  if (sincronizar) gravarPreferencia('aparencia', 'tema', t)
}
