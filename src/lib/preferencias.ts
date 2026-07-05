/**
 * Preferências do app — locais ao aparelho (localStorage), aplicadas como
 * data-attributes no <html> para o CSS reagir. Duas sementes de
 * acessibilidade que funcionam de verdade:
 *  · texto grande: +10% na base tipográfica (rem-cascata)
 *  · reduzir animações: corta transições e o voo cinematográfico do mapa
 */

const CH_TEXTO = 'ecosurf.texto-grande'
const CH_ANIM = 'ecosurf.reduz-animacao'

function ler(chave: string): boolean {
  try { return localStorage.getItem(chave) === '1' } catch { return false }
}

function gravar(chave: string, v: boolean): void {
  try {
    if (v) localStorage.setItem(chave, '1')
    else localStorage.removeItem(chave)
  } catch { /* modo privado */ }
}

export function aplicarPreferencias(): void {
  const html = document.documentElement
  if (ler(CH_TEXTO)) html.dataset.textoGrande = '1'
  else delete html.dataset.textoGrande
  if (ler(CH_ANIM)) html.dataset.reduzAnimacao = '1'
  else delete html.dataset.reduzAnimacao
}

export const textoGrandeAtivo = () => ler(CH_TEXTO)
export const reduzAnimacaoAtivo = () => ler(CH_ANIM)

export function setTextoGrande(v: boolean): void {
  gravar(CH_TEXTO, v)
  aplicarPreferencias()
}

export function setReduzAnimacao(v: boolean): void {
  gravar(CH_ANIM, v)
  aplicarPreferencias()
}
