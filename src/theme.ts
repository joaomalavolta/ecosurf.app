/** Tema visual do app. Light Ocean UI é o padrão; dark é opcional (toggle). */
export type Tema = 'light' | 'dark'

const CHAVE = 'ecosurf:theme'

export function temaAtual(): Tema {
  try {
    return localStorage.getItem(CHAVE) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/** Aplica no <html data-theme> e persiste. O CSS reage via [data-theme]. */
export function aplicarTema(t: Tema): void {
  document.documentElement.dataset.theme = t
  try {
    localStorage.setItem(CHAVE, t)
  } catch {
    /* sem storage: aplica só nesta sessão */
  }
}
