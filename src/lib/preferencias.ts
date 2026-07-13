/**
 * Preferências do app aplicadas como data-attributes no <html> para o CSS
 * reagir. Duas sementes de acessibilidade que funcionam de verdade:
 *  · texto grande: +10% na base tipográfica (rem-cascata)
 *  · reduzir animações: corta transições e o voo cinematográfico do mapa
 *
 * A fonte da verdade agora é o serviço de preferências por conta (memória +
 * cache + Supabase). As chaves antigas de localStorage seguem como fallback
 * de leitura — quem já tinha escolhido não perde nada na migração.
 */
import { lerPreferencia, gravarPreferencia, carregarPreferencias, restaurarCategoria } from '../services/preferencias-conta'
import { aplicarTema, type Tema } from '../theme'

const CH_TEXTO = 'ecosurf.texto-grande'
const CH_ANIM = 'ecosurf.reduz-animacao'
const CH_SO_FOTOS = 'ecosurf.timeline-so-com-fotos'

function lerLegado(chave: string): boolean {
  try { return localStorage.getItem(chave) === '1' } catch { return false }
}

export const textoGrandeAtivo = (): boolean =>
  lerPreferencia('aparencia', 'textoGrande', lerLegado(CH_TEXTO))
export const reduzAnimacaoAtivo = (): boolean =>
  lerPreferencia('aparencia', 'reduzAnimacao', lerLegado(CH_ANIM))

export function aplicarPreferencias(): void {
  const html = document.documentElement
  if (textoGrandeAtivo()) html.dataset.textoGrande = '1'
  else delete html.dataset.textoGrande
  if (reduzAnimacaoAtivo()) html.dataset.reduzAnimacao = '1'
  else delete html.dataset.reduzAnimacao
}

export function setTextoGrande(v: boolean): void {
  gravarPreferencia('aparencia', 'textoGrande', v)
  aplicarPreferencias()
}

export function setReduzAnimacao(v: boolean): void {
  gravarPreferencia('aparencia', 'reduzAnimacao', v)
  aplicarPreferencias()
}

/** Toggle "só dias com fotos" da timeline — mesma preferência do botão da régua. */
export const soComFotosAtivo = (): boolean =>
  lerPreferencia('timeline', 'soComFotos', lerLegado(CH_SO_FOTOS))
export function setSoComFotos(v: boolean): void {
  gravarPreferencia('timeline', 'soComFotos', v)
}

/**
 * Restaura aparência e timeline ao padrão — na conta E nas chaves locais
 * antigas (senão o fallback de migração ressuscitaria a escolha antiga).
 */
export async function restaurarPreferenciasDoApp(): Promise<void> {
  await restaurarCategoria('aparencia')
  await restaurarCategoria('timeline')
  try {
    localStorage.removeItem(CH_TEXTO)
    localStorage.removeItem(CH_ANIM)
    localStorage.removeItem(CH_SO_FOTOS)
  } catch { /* modo privado */ }
  aplicarTema('light', false)
  aplicarPreferencias()
}

/**
 * Sincroniza com a conta e reaplica o que mudou (chamar no boot; como o
 * login recarrega a página, cobre também o pós-login). Fire-and-forget.
 */
export async function sincronizarPreferenciasDaConta(): Promise<void> {
  const p = await carregarPreferencias()
  const tema = p.aparencia?.tema
  if (tema === 'dark' || tema === 'light') aplicarTema(tema as Tema, false)
  aplicarPreferencias()
}
