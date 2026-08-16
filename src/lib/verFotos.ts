/**
 * Mostrar ou recolher a grade de fotos de um perfil.
 *
 * NÃO confundir com as chaves `mostrar_*` de `perfis` (migration 0061). Aquilo
 * é privacidade: o dono decide o que os OUTROS veem, e mora no banco porque
 * quem precisa obedecer a regra é o visitante. Isto aqui é conforto de
 * leitura: quem está olhando recolhe as fotos para o mapa ocupar o palco, na
 * própria tela, sem mudar nada para ninguém.
 *
 * Por isso vive no localStorage e vale para qualquer perfil: é uma preferência
 * de quem lê, não um atributo de quem é lido. Quem gosta do perfil compacto
 * gosta em todos.
 */

const CHAVE = 'ecosurf.perfil-fotos'

/** Padrão: fotos à mostra. Recolher é uma escolha. */
export function fotosVisiveis(): boolean {
  try {
    return localStorage.getItem(CHAVE) !== 'ocultas'
  } catch {
    return true // modo privado: nada quebra por causa disto
  }
}

export function gravarFotosVisiveis(visiveis: boolean): void {
  try {
    localStorage.setItem(CHAVE, visiveis ? 'visiveis' : 'ocultas')
  } catch { /* modo privado ou cota cheia */ }
}
