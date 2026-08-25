/**
 * Geocoding do Ecosurf — busca de endereço/lugar por texto.
 *
 * Usa Photon (https://photon.komoot.io), motor de busca baseado em
 * OpenStreetMap, gratuito e sem API key. Escolhido sobre o Nominatim direto
 * porque:
 *   - tolera erros de digitação e busca parcial (autocomplete de verdade);
 *   - responde bem a "conforme digita" (feito para type-ahead);
 *   - mantém a soberania OSM (sem telemetria do Google, alinhado ao projeto).
 *
 * ESCALA: a instância pública da Komoot é cortesia e pede uso comedido. Ótima
 * para o beta. Num lançamento nacional, migrar para uma instância Photon
 * auto-hospedada (ou plano pago) — trocando apenas a BASE_URL abaixo.
 *
 * Mantém o mesmo shape de resultado que a UI já consumia (display_name, lat,
 * lon como string), então a troca é transparente para os componentes.
 */

import { dentroDoBrasil, CAIXA_BRASIL } from '../lib/regiao'

export interface ResultadoGeocode {
  display_name: string
  lat: string
  lon: string
}

// Ponto único de configuração — trocar aqui para uma instância própria na escala.
const BASE_URL = 'https://photon.komoot.io/api/'

interface PhotonFeature {
  geometry: { coordinates: [number, number] } // [lon, lat]
  properties: {
    name?: string
    street?: string
    housenumber?: string
    city?: string
    district?: string
    state?: string
    country?: string
  }
}

/** Monta um rótulo legível a partir das propriedades do Photon. */
function rotular(p: PhotonFeature['properties']): string {
  const partes = [
    [p.name, p.housenumber ? `${p.street ?? ''} ${p.housenumber}`.trim() : p.street].filter(Boolean)[0],
    p.district,
    p.city,
    p.state,
  ].filter(Boolean)
  // Remove duplicatas consecutivas (ex.: name == city em cidades pequenas)
  const limpo: string[] = []
  for (const parte of partes as string[]) {
    if (limpo[limpo.length - 1] !== parte) limpo.push(parte)
  }
  return limpo.join(', ') || (p.name ?? 'Local')
}

/**
 * Busca lugares por texto, com viés para o Brasil e para o litoral quando um
 * ponto de referência é fornecido (melhora a relevância perto do usuário).
 */
/**
 * O que aconteceu com a busca — mais do que "deu ou não deu resultado".
 *
 * Antes esta função devolvia `[]` para tudo: sucesso sem achados, serviço
 * fora do ar, rede caída, JSON quebrado. A tela não tinha como distinguir e
 * não dizia nada — quem digitava via a caixa parada e concluía, com razão,
 * que a busca não funciona.
 */
export type RespostaBusca =
  | { ok: true; resultados: ResultadoGeocode[] }
  | { ok: false; motivo: 'rede' | 'servico' }

export async function buscarLugar(
  query: string,
  vies?: { lat: number; lng: number },
): Promise<RespostaBusca> {
  if (query.trim().length < 3) return { ok: true, resultados: [] }

  const params = new URLSearchParams({ q: query, limit: '6' })

  // `lang` NÃO é enviado, e a ausência é a correção.
  //
  // O código pedia `lang=pt`. A instância pública do Photon é indexada só em
  // `en, de, fr, it`; idioma fora dessa lista volta 400, o `catch` engolia, e
  // a busca devolvia lista vazia SEMPRE. Não era intermitência nem serviço
  // fora do ar: nunca funcionou.
  //
  // Sem o parâmetro, o Photon responde com o nome LOCAL do lugar — que para
  // o Brasil já é português, e é o que a pessoa espera ler de qualquer forma.

  // Viés territorial: sem ele, "Boa Vista" traz resultado de meio mundo e o
  // filtro de país depois descarta tudo, devolvendo uma lista vazia que
  // parece defeito. O `bbox` faz o próprio Photon preferir o Brasil.
  const { oesteLng, sulLat, lesteLng, norteLat } = CAIXA_BRASIL
  params.set('bbox', `${oesteLng},${sulLat},${lesteLng},${norteLat}`)

  // Perto do ponto atual primeiro, quando existe um.
  if (vies) {
    params.set('lat', String(vies.lat))
    params.set('lon', String(vies.lng))
  }

  let data: { features?: PhotonFeature[] }
  try {
    const res = await fetch(`${BASE_URL}?${params.toString()}`)
    if (!res.ok) return { ok: false, motivo: 'servico' }
    data = (await res.json()) as { features?: PhotonFeature[] }
  } catch {
    return { ok: false, motivo: 'rede' }
  }

  return {
    ok: true,
    resultados: (data.features ?? [])
      // Resultado sem país declarado passava — e ponto em mar aberto costuma
      // vir exatamente assim. Foi por aí que um mutirão de Tramandaí pôde ir
      // parar no Atlântico argentino (migration 0060). Agora, na dúvida sobre
      // o país, a coordenada decide.
      .filter((f) => {
        const pais = f.properties.country
        if (pais === 'Brasil' || pais === 'Brazil') return true
        if (pais) return false
        const [lon, lat] = f.geometry.coordinates
        return dentroDoBrasil(lon, lat)
      })
      .map((f) => ({
        display_name: rotular(f.properties),
        lat: String(f.geometry.coordinates[1]),
        lon: String(f.geometry.coordinates[0]),
      })),
  }
}
