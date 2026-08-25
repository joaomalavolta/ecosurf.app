/**
 * Onde o mapa deve abrir.
 *
 * O mapa abria em Itanhaém/SP para todo mundo — a coordenada estava fixa no
 * código. Quem entra de Tramandaí ou de Imbituba via a costa paulista e
 * concluía, com razão, que o app não conhece a praia dele.
 *
 * A resposta certa quase nunca exige GPS. Em ordem de certeza:
 *
 *  1. a última posição que a pessoa olhou — quem já usou o mapa mostrou onde
 *     mora melhor do que qualquer palpite, e isso não custa permissão nenhuma;
 *  2. o que ela mesma publicou — quem cadastrou dois picos em Tramandaí está
 *     no litoral gaúcho, ponto;
 *  3. a cidade do perfil, casada com os pontos que o app já conhece;
 *  4. o GPS, que continua sendo o mais verdadeiro quando a permissão já existe
 *     (isso fica no MapView, que é quem fala com o navegador);
 *  5. o Brasil inteiro.
 *
 * O passo 5 importa tanto quanto os outros: quando não dá para saber, mostrar
 * o país é honesto e ainda diz "isto é uma rede nacional". Mostrar São Paulo
 * para quem está no Sul é só estar errado com confiança.
 *
 * Este arquivo é a parte pura — sem rede, sem navegador, sem MapLibre.
 */

export interface Local {
  lng: number
  lat: number
  zoom?: number
}

/** O país inteiro: o enquadramento de quando não se sabe. */
export const BRASIL: Local = { lng: -52.5, lat: -14.5, zoom: 3.2 }

/**
 * A coordenada faz sentido para este app?
 *
 * O Brasil cabe, com folga, nesta caixa. Não é o recorte do país — inclui
 * pedaços de vizinhos e de mar aberto — e é de propósito: serve para pegar o
 * erro grosseiro, não para desenhar fronteira.
 *
 * Existe porque um mutirão de Tramandaí foi parar a 1.058 km dali, no mar da
 * Argentina, e ficou meses invisível. Num mapa afastado, um toque de poucos
 * pixels vale centenas de quilômetros. O banco tem a mesma checagem (migration
 * 0060); esta aqui é para avisar a pessoa ANTES de ela mandar, com uma frase
 * que se entende, em vez de devolver uma violação de constraint.
 *
 * ⚠️ Não confundir com "está no litoral": alerta em rio, no interior, é
 * legítimo e passa.
 */
export const CAIXA_BRASIL = { oesteLng: -74, sulLat: -34, lesteLng: -34, norteLat: 6 } as const

export function dentroDoBrasil(lng: number, lat: number): boolean {
  const { oesteLng, sulLat, lesteLng, norteLat } = CAIXA_BRASIL
  return (
    Number.isFinite(lng) && Number.isFinite(lat) &&
    lng >= oesteLng && lng <= lesteLng && lat >= sulLat && lat <= norteLat
  )
}

/** Ponto com coordenada e município — o mínimo para deduzir região. */
export interface PontoRegiao {
  lat?: number | null
  lng?: number | null
  municipio?: string | null
  uf?: string | null
}

/** Tira acento, caixa e pontuação: "Itanhaém" e "itanhaem" são a mesma cidade. */
export function normalizarNome(s: string): string {
  // Sem regex de combining marks — o mesmo cuidado de `slug()` em rest.ts,
  // que não sobrevive a certos escapes.
  const semAcento = [...s.trim().toLowerCase().normalize('NFD')]
    .filter((c) => c.charCodeAt(0) < 0x300 || c.charCodeAt(0) > 0x36f)
    .join('')
  return semAcento.replace(/[^a-z0-9]+/g, ' ').trim()
}

const UFS = new Set([
  'ac', 'al', 'ap', 'am', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mt', 'ms', 'mg',
  'pa', 'pb', 'pr', 'pe', 'pi', 'rj', 'rn', 'rs', 'ro', 'rr', 'sc', 'sp', 'se', 'to',
])

/**
 * Separa cidade e UF de um campo que as pessoas preenchem como querem.
 *
 * Os três valores que existem hoje no banco vêm em três formatos diferentes:
 * "Imbituba", "Itanhaém-SP" e "Tramandaí". Nenhum separador é confiável, então
 * a regra é: se o último pedaço parece uma UF, é uma UF.
 */
export function partirCidade(bruto: string | null | undefined): { cidade: string; uf: string | null } {
  const limpo = normalizarNome(bruto ?? '')
  if (!limpo) return { cidade: '', uf: null }
  const partes = limpo.split(' ')
  const ultimo = partes[partes.length - 1]
  if (partes.length > 1 && ultimo.length === 2 && UFS.has(ultimo)) {
    return { cidade: partes.slice(0, -1).join(' '), uf: ultimo.toUpperCase() }
  }
  return { cidade: limpo, uf: null }
}

/** Média das coordenadas — o centro de um punhado de pontos. */
function centroDe(pontos: PontoRegiao[]): Local | null {
  const validos = pontos.filter((p) => p.lat != null && p.lng != null)
  if (validos.length === 0) return null
  const lat = validos.reduce((s, p) => s + (p.lat as number), 0) / validos.length
  const lng = validos.reduce((s, p) => s + (p.lng as number), 0) / validos.length
  return { lat, lng }
}

/**
 * Acha onde fica a cidade do perfil usando só o que o app já carregou.
 *
 * Sem geocodificador de terceiros: se há um pico, um alerta ou um mutirão
 * naquele município, a coordenada dele serve. Quando a cidade não bate com
 * nada — "Imbituba" hoje não tem nenhum ponto —, devolve null e quem chamou
 * segue para o próximo palpite. Chutar seria pior do que admitir que não sabe.
 */
export function localDaCidade(
  cidadeBruta: string | null | undefined,
  pontos: PontoRegiao[],
): Local | null {
  const { cidade, uf } = partirCidade(cidadeBruta)
  if (!cidade) return null

  const casa = (p: PontoRegiao) => {
    if (!p.municipio) return false
    if (normalizarNome(p.municipio) !== cidade) return false
    // UF só desempata quando o perfil trouxe uma: "Itanhaém-SP" não pode casar
    // com uma Itanhaém de outro estado, mas "Tramandaí" casa com qualquer uma.
    return !uf || !p.uf || p.uf.toUpperCase() === uf
  }

  return centroDe(pontos.filter(casa))
}

/**
 * Retângulo que cabe tudo. Devolve os cantos, não o centro: quem enquadra é o
 * mapa, que sabe o tamanho da tela. Um ponto só não tem retângulo — nesse caso
 * devolve `centro` e deixa o zoom para quem chamou.
 */
export function caixaDe(pontos: PontoRegiao[]): { sw: [number, number]; ne: [number, number] } | null {
  const validos = pontos.filter((p) => p.lat != null && p.lng != null)
  if (validos.length < 2) return null
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  for (const p of validos) {
    minLng = Math.min(minLng, p.lng as number)
    maxLng = Math.max(maxLng, p.lng as number)
    minLat = Math.min(minLat, p.lat as number)
    maxLat = Math.max(maxLat, p.lat as number)
  }
  return { sw: [minLng, minLat], ne: [maxLng, maxLat] }
}

/** Centro de um conjunto de pontos, para quando não há caixa. */
export const centroDosPontos = centroDe

/* ── Última posição vista ────────────────────────────────────────────────
 * O sinal mais forte e mais barato: quem já mexeu no mapa disse onde é a
 * região dele sem precisar de permissão nenhuma.
 */

export const CHAVE_POSICAO = 'ecosurf.mapa-posicao'

/** Depois de um mês parado, a última posição já não diz onde a pessoa está. */
const VALIDADE_MS = 30 * 24 * 3600 * 1000

interface PosicaoGravada extends Local {
  em: number
}

/**
 * Valida o que veio do localStorage.
 *
 * É entrada externa: pode ter sido editada à mão, ter vindo de uma versão
 * antiga ou estar corrompida. Coordenada fora do mundo ou velha demais é
 * descartada em silêncio — o mapa cai no próximo palpite, que é o certo.
 */
export function lerPosicao(bruto: string | null, agora = Date.now()): Local | null {
  if (!bruto) return null
  let p: PosicaoGravada
  try {
    p = JSON.parse(bruto) as PosicaoGravada
  } catch {
    return null
  }
  if (!p || typeof p !== 'object') return null
  const { lng, lat, zoom, em } = p
  if (typeof lng !== 'number' || typeof lat !== 'number' || !Number.isFinite(lng) || !Number.isFinite(lat)) return null
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null
  if (typeof em !== 'number' || agora - em > VALIDADE_MS) return null
  // Zoom de país não é "a região de alguém": guardá-lo faria a próxima
  // abertura repetir o mapa-múndi em vez de tentar um palpite melhor.
  if (typeof zoom !== 'number' || zoom < 6) return null
  return { lng, lat, zoom: Math.min(zoom, 15) }
}

/**
 * Onde um mapa de escolha de ponto deve abrir.
 *
 * A ordem é a substância: do palpite mais forte para o mais honesto.
 *
 *   1. o ponto já escolhido (GPS da captura, edição de um registro)
 *   2. a última posição que a pessoa olhou — não custa permissão nenhuma e
 *      já diz a região dela
 *   3. o Brasil inteiro
 *
 * O terceiro caso é o que importa defender: antes havia uma coordenada fixa
 * de Santos ali. Quem registrava de outro estado abria o mapa na Baixada
 * Santista, com um pin plantado, como se aquilo fosse um palpite sobre onde
 * ele está. Mostrar o país inteiro admite que não se sabe — e admitir é mais
 * útil do que apontar para o lugar errado com ar de certeza.
 *
 * O GPS não entra aqui de propósito: ele é assíncrono e pede permissão, então
 * quem chama tenta depois, sem travar a abertura da tela.
 */
export function centroInicial(
  lat: number | undefined,
  lng: number | undefined,
  posicaoGravada: string | null,
  agora = Date.now(),
): Local {
  if (lat != null && lng != null) return { lat, lng, zoom: 14 }
  const guardada = lerPosicao(posicaoGravada, agora)
  if (guardada) return guardada
  return BRASIL
}

/** Serializa para gravar. */
export function gravarPosicao(local: Local, agora = Date.now()): string {
  return JSON.stringify({
    lng: Number(local.lng.toFixed(5)),
    lat: Number(local.lat.toFixed(5)),
    zoom: Number((local.zoom ?? 12).toFixed(2)),
    em: agora,
  })
}
