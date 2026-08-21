/**
 * O link para uma foto na página do pico — e a pergunta que ele carrega.
 *
 * Duas coisas diferentes viajam na mesma URL:
 *
 *   `?foto=ID`   qual foto interessa (seleciona e rola até ela)
 *   `&ver=1`     a pessoa tocou NA FOTO e quer vê-la em tela cheia
 *
 * A separação existe porque nem todo caminho até uma foto é um pedido para
 * ampliá-la. Num mosaico ou numa grade de perfil, o tile É a foto: tocar só
 * pode significar "quero ver". Num card de report, a foto divide o toque com
 * o nome do pico, o local e os selos — quem tocou ali pode estar indo para o
 * pico, e abrir tela cheia por cima disso é sequestrar a navegação.
 *
 * O padrão é NÃO abrir. Um link de origem desconhecida (compartilhado, colado,
 * antigo) cai no caso seguro: a foto fica selecionada e visível, a um toque de
 * ampliar. Forçar tela cheia é o que precisa ser pedido.
 */

/** Monta o link. `abrir` só quando o toque foi na foto em si. */
export function linkFoto(picoId: string, fotoId: string, abrir = false): string {
  return `/pico/${picoId}?foto=${fotoId}${abrir ? '&ver=1' : ''}`
}

/** Lê a intenção de volta na chegada. */
export function deveAbrirVisor(params: URLSearchParams): boolean {
  return params.get('ver') === '1'
}
