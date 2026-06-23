import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useNavigate } from 'react-router-dom'
import type { FeatureCollection, Point } from 'geojson'
import type { Ameaca, Mutirao, Pico } from '../types/domain'

const TEARDROP_SVG = (color: string, paths: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="42" viewBox="0 0 24 26">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <g transform="translate(6, 3.5) scale(0.5)" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      ${paths}
    </g>
  </svg>`

/** Teardrops coloridos. Picos (azul), ameaças (laranja) e mutirões (verde). */
const ICONES: Record<string, string> = {
  'ic-pico': TEARDROP_SVG(
    '#0E81A0',
    '<path d="M2 7c.6 .5 1.2 1 2.5 1c2.5 0 2.5 -2 5 -2c2.5 0 2.5 2 5 2c2.5 0 2.5 -2 5 -2"/>' +
      '<path d="M2 13c.6 .5 1.2 1 2.5 1c2.5 0 2.5 -2 5 -2c2.5 0 2.5 2 5 2c2.5 0 2.5 -2 5 -2"/>'
  ),
  'ic-ameaca': TEARDROP_SVG(
    '#FF6B4A',
    '<path d="M12 9v4"/>' +
      '<path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"/>' +
      '<path d="M12 16h.01"/>'
  ),
  'ic-mutirao': TEARDROP_SVG(
    '#34D399',
    '<path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/>' +
      '<path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>' +
      '<path d="M16 3.13a4 4 0 0 1 0 7.75"/>' +
      '<path d="M21 21v-2a4 4 0 0 0 -3 -3.85"/>'
  ),
}

const SRC = 'feicoes'

interface Dados {
  picos: Pico[]
  ameacas: Ameaca[]
  mutiroes: Mutirao[]
}

function colecao({ picos, ameacas, mutiroes }: Dados): FeatureCollection<Point> {
  const features: FeatureCollection<Point>['features'] = []
  for (const p of picos) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { tipo: 'pico', id: p.id, titulo: p.nome },
    })
  }
  for (const a of ameacas) {
    if (a.lat == null || a.lng == null) continue
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [a.lng, a.lat] },
      properties: {
        tipo: 'ameaca',
        id: a.id,
        titulo: a.titulo,
        status: a.status,
        precisao: a.precisao,
        municipio: a.municipio,
        uf: a.uf,
      },
    })
  }
  for (const m of mutiroes) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
      properties: {
        tipo: 'mutirao',
        id: m.id,
        titulo: m.titulo,
        horario: m.horario ?? '',
        inscritos: m.inscritos ?? null,
        vagas: m.vagas ?? null,
        organizador: m.organizador ?? '',
        municipio: m.municipio,
        uf: m.uf,
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

/** Conteúdo do popup para ameaça/mutirão (pico navega; não abre popup). */
function popupHtml(p: Record<string, unknown>): string {
  const local = `${esc(p.municipio)}/${esc(p.uf)}`
  let meta = ''
  if (p.tipo === 'ameaca') {
    meta = `${esc(p.status)} · ${local} · local ${esc(p.precisao)}`
  } else {
    const quando = p.horario ? esc(p.horario) : ''
    const gente =
      p.inscritos != null
        ? `${esc(p.inscritos)} inscritos`
        : p.vagas != null
          ? `${esc(p.vagas)} vagas`
          : ''
    meta = [quando, local, gente].filter(Boolean).join(' · ')
    if (p.organizador) meta += `<br/><span style="opacity:.8">por ${esc(p.organizador)}</span>`
  }
  return (
    `<div style="font:600 14px 'Inter',system-ui,sans-serif;color:#14202A;max-width:220px">${esc(p.titulo)}</div>` +
    `<div style="font:500 12px 'Inter',system-ui,sans-serif;color:#5A6B79;margin-top:3px;line-height:1.4">${meta}</div>`
  )
}

/** Reusa uma fonte que o basemap já carrega — garante que o glyph existe. */
function fonteRotulo(map: maplibregl.Map): string[] {
  for (const l of map.getStyle().layers ?? []) {
    const f = (l as { layout?: { 'text-font'?: unknown } }).layout?.['text-font']
    if (Array.isArray(f) && f.every((x) => typeof x === 'string')) return f as string[]
  }
  return ['Noto Sans Regular']
}

function carregarIcone(map: maplibregl.Map, nome: string, svg: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      if (!map.hasImage(nome)) map.addImage(nome, img, { pixelRatio: 2 })
      resolve()
    }
    img.onerror = () => resolve()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  })
}

/**
 * Mapa = território. Picos (azul), ameaças (índigo) e mutirões (verde) numa
 * fonte GeoJSON com CLUSTERIZAÇÃO nativa do MapLibre: aglomera de longe,
 * abre em pins ao aproximar. Estilo CARTO (positron/dark-matter, sem chave).
 * Ameaça entra com coordenada GROSSEIRA — protege denunciante.
 *
 * Tocar num pico: se `onSelectPico` for passado, seleciona-o (o card embaixo
 * reflete) e aproxima; senão, navega para a página do pico.
 */
export function MapView({
  picos,
  ameacas = [],
  mutiroes = [],
  onSelectPico,
}: {
  picos: Pico[]
  ameacas?: Ameaca[]
  mutiroes?: Mutirao[]
  onSelectPico?: (p: Pico) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const prontoRef = useRef(false)
  const dadosRef = useRef<Dados>({ picos, ameacas, mutiroes })
  dadosRef.current = { picos, ameacas, mutiroes }
  const navigate = useNavigate()
  const navRef = useRef(navigate)
  navRef.current = navigate
  const onSelRef = useRef(onSelectPico)
  onSelRef.current = onSelectPico

  // monta o mapa, carrega ícones, cria a fonte clusterizada e as camadas
  useEffect(() => {
    if (!ref.current || mapRef.current) return
    let descartado = false
    // mapa claro (positron) no tema light; escuro (dark-matter) no dark
    const escuro = document.documentElement.dataset.theme === 'dark'
    const estilo = escuro
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
    const map = new maplibregl.Map({
      container: ref.current,
      style: estilo,
      center: [-46.79, -24.19],
      zoom: 10.5,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('error', () => {})
    mapRef.current = map

    function aplicar() {
      const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined
      if (src) src.setData(colecao(dadosRef.current))
    }

    map.on('load', async () => {
      await Promise.all(Object.entries(ICONES).map(([nome, svg]) => carregarIcone(map, nome, svg)))
      if (descartado) return

      map.addSource(SRC, {
        type: 'geojson',
        data: colecao(dadosRef.current),
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 13,
      })

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SRC,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#0E5C70', 10, '#0A3A4C', 25, '#072330'],
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 22, 25, 28],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      })
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SRC,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': fonteRotulo(map),
          'text-size': 13,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#fff' },
      })
      map.addLayer({
        id: 'pontos-icone',
        type: 'symbol',
        source: SRC,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': [
            'match',
            ['get', 'tipo'],
            'ameaca',
            'ic-ameaca',
            'mutirao',
            'ic-mutirao',
            'ic-pico',
          ],
          'icon-size': 1,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-anchor': 'bottom',
        },
      })

      // clique no cluster: aproxima até abrir
      map.on('click', 'clusters', (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0]
        const clusterId = f?.properties?.cluster_id
        if (clusterId == null) return
        const src = map.getSource(SRC) as maplibregl.GeoJSONSource
        src.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({ center: (f.geometry as Point).coordinates as [number, number], zoom })
        })
      })

      // clique no ponto: pico seleciona (ou navega); ameaça/mutirão abre popup
      map.on('click', 'pontos-icone', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties as Record<string, unknown>
        if (p.tipo === 'pico') {
          const pico = dadosRef.current.picos.find((x) => x.id === p.id)
          if (pico && onSelRef.current) {
            onSelRef.current(pico)
            map.flyTo({ center: [pico.lng, pico.lat], zoom: Math.max(map.getZoom(), 13), speed: 0.8 })
          } else {
            navRef.current(`/pico/${p.id}`)
          }
          return
        }
        new maplibregl.Popup({ offset: 20, maxWidth: '240px' })
          .setLngLat((f.geometry as Point).coordinates as [number, number])
          .setHTML(popupHtml(p))
          .addTo(map)
      })

      for (const camada of ['clusters', 'pontos-icone']) {
        map.on('mouseenter', camada, () => (map.getCanvas().style.cursor = 'pointer'))
        map.on('mouseleave', camada, () => (map.getCanvas().style.cursor = ''))
      }

      prontoRef.current = true
      aplicar()
    })

    return () => {
      descartado = true
      prontoRef.current = false
      map.remove()
      mapRef.current = null
    }
  }, [])

  // atualiza os dados quando os filtros mudam
  useEffect(() => {
    const map = mapRef.current
    if (!map || !prontoRef.current) return
    const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined
    if (src) src.setData(colecao({ picos, ameacas, mutiroes }))
  }, [picos, ameacas, mutiroes])

  return <div ref={ref} style={{ position: 'absolute', inset: 0, background: 'var(--map-bg)' }} />
}
