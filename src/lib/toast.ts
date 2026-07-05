/**
 * Toast do design system — aposenta os alert() nativos, que congelam a
 * tela e parecem erro até quando anunciam sucesso. Singleton em DOM puro:
 * funciona de qualquer lugar (páginas, serviços, callbacks) sem provider.
 *
 * O tipo é auto-classificado pelo conteúdo quando não informado — sucesso
 * (verde), erro (vermelho) ou info (turquesa) — e só decide a cor da
 * borda; pode ser passado explícito quando a mensagem enganar a heurística.
 */

type TipoToast = 'sucesso' | 'erro' | 'info'

const RE_ERRO = /^(erro|não foi possível|falha)|inválid/i
const RE_SUCESSO = /sucesso|salv[oa]|apagad[oa]|excluíd[oa]|copiad[oa]|atualizad[oa]|exportad[oa]|publicad[oa]|enviado/i

function classificar(msg: string): TipoToast {
  if (RE_ERRO.test(msg)) return 'erro'
  if (RE_SUCESSO.test(msg)) return 'sucesso'
  return 'info'
}

let recipiente: HTMLDivElement | null = null

function garantirRecipiente(): HTMLDivElement {
  if (recipiente && document.body.contains(recipiente)) return recipiente
  recipiente = document.createElement('div')
  recipiente.className = 'toast-recipiente'
  recipiente.setAttribute('aria-live', 'polite')
  document.body.appendChild(recipiente)
  return recipiente
}

export function toast(mensagem: string, tipo?: TipoToast): void {
  try {
    const t = tipo ?? classificar(mensagem)
    const box = garantirRecipiente()
    const el = document.createElement('div')
    el.className = `toast toast-${t}`
    el.textContent = mensagem
    box.appendChild(el)
    // entra, respira, sai — e limpa o próprio rastro
    requestAnimationFrame(() => el.classList.add('visivel'))
    const dur = Math.min(6000, Math.max(3200, mensagem.length * 55))
    setTimeout(() => {
      el.classList.remove('visivel')
      setTimeout(() => el.remove(), 350)
    }, dur)
  } catch {
    // último recurso: nunca engolir a mensagem em silêncio
    alert(mensagem)
  }
}
