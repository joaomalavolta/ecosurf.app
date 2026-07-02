/**
 * Monitor de erros do front. Captura erros de JavaScript não tratados e
 * promessas rejeitadas, e relata para a tabela `erros_front` do Supabase.
 *
 * Princípios:
 *  • LEVE: nada de SDK pesado; usa o cliente Supabase que o app já carrega
 *    sob demanda. Zero impacto no bundle inicial (import dinâmico).
 *  • DISCRETO: falha do monitor nunca vira erro visível — try/catch em tudo.
 *  • SEM DADOS PESSOAIS: só mensagem, stack encurtada, rota e user agent.
 *  • ANTI-FLOOD: deduplica erros repetidos e limita a 10 relatórios por sessão.
 */

const enviados = new Set<string>()
let contadorSessao = 0
const MAX_POR_SESSAO = 10

function assinatura(mensagem: string, stack?: string): string {
  return `${mensagem}::${(stack ?? '').slice(0, 120)}`
}

async function relatar(mensagem: string, stack?: string): Promise<void> {
  try {
    if (contadorSessao >= MAX_POR_SESSAO) return
    const chave = assinatura(mensagem, stack)
    if (enviados.has(chave)) return // mesmo erro repetido: relata uma vez
    enviados.add(chave)
    contadorSessao++

    const { temBackend } = await import('../services/api')
    if (!temBackend()) return
    const { sb } = await import('../services/supabase/client')
    await sb().from('erros_front').insert({
      mensagem: mensagem.slice(0, 500),
      stack: stack?.slice(0, 2000) ?? null,
      rota: location.pathname.slice(0, 200),
      user_agent: navigator.userAgent.slice(0, 300),
      versao_app: import.meta.env.VITE_APP_VERSION ?? null,
    })
  } catch {
    /* o monitor nunca pode causar erro — silêncio absoluto */
  }
}

/** Liga os ouvintes globais (chamado uma vez no boot). */
export function iniciarMonitorDeErros(): void {
  window.addEventListener('error', (ev) => {
    // Erros de carregamento de recurso (img/script) não têm error object útil.
    const msg = ev.error instanceof Error ? ev.error.message : ev.message
    const stack = ev.error instanceof Error ? ev.error.stack : undefined
    if (msg) void relatar(String(msg), stack)
  })

  window.addEventListener('unhandledrejection', (ev) => {
    const razao = ev.reason
    const msg = razao instanceof Error ? razao.message : String(razao ?? 'Promise rejeitada')
    const stack = razao instanceof Error ? razao.stack : undefined
    void relatar(msg, stack)
  })
}
