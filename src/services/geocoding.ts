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
export async function buscarLugar(
  query: string,
  vies?: { lat: number; lng: number },
): Promise<ResultadoGeocode[]> {
  if (query.trim().length < 3) return []

  const params = new URLSearchParams({
    q: query,
    lang: 'pt',
    limit: '6',
  })
  if (vies) {
    params.set('lat', String(vies.lat))
    params.set('lon', String(vies.lng))
  }

  try {
    const res = await fetch(`${BASE_URL}?${params.toString()}`)
    if (!res.ok) throw new Error(`geocode ${res.status}`)
    const data = (await res.json()) as { features?: PhotonFeature[] }
    return (data.features ?? [])
      // Prioriza resultados no Brasil sem excluir fronteira (surf no exterior é raro no beta)
      .filter((f) => !f.properties.country || f.properties.country === 'Brasil' || f.properties.country === 'Brazil')
      .map((f) => ({
        display_name: rotular(f.properties),
        lat: String(f.geometry.coordinates[1]),
        lon: String(f.geometry.coordinates[0]),
      }))
  } catch {
    return []
  }
}
