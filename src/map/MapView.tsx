import React, { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useNavigate } from 'react-router-dom'
import type { FeatureCollection, Point } from 'geojson'
import type { Alerta, Mutirao, Pico } from '../types/domain'

/* ─── Pins circulares flat (estilo Zurrb) ─── */
const CIRCLE_PIN = (bg: string, paths: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
    <defs>
      <filter id="sh" x="-20%" y="-10%" width="140%" height="150%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity="0.4"/>
      </filter>
    </defs>
    <circle cx="22" cy="22" r="18" fill="${bg}" stroke="#fff" stroke-width="2.5" filter="url(#sh)"/>
    <g transform="translate(10, 10) scale(0.5)" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
      ${paths}
    </g>
  </svg>`

/** Ícones por categoria — círculos coloridos com ícones brancos */
const ICONES: Record<string, string> = {
  // Pico — azul, onda
  'ic-pico': CIRCLE_PIN(
    '#0D6EA8',
    '<path d="M2 7c.6 .5 1.2 1 2.5 1c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2"/>' +
      '<path d="M2 13c.6 .5 1.2 1 2.5 1c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2"/>'
  ),
  // Mutirão — laranja, pessoas
  'ic-mutirao': CIRCLE_PIN(
    '#FF8C42',
    '<path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/>' +
      '<path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>' +
      '<path d="M16 3.13a4 4 0 0 1 0 7.75"/>' +
      '<path d="M21 21v-2a4 4 0 0 0-3-3.85"/>'
  ),
  // Esgoto — cinza, droplet
  'ic-esgoto': CIRCLE_PIN(
    '#7B8794',
    '<path d="M12 3c-3.2 4.5-6 7.5-6 10.5a6 6 0 0 0 12 0c0-3-2.8-6-6-10.5z"/>'
  ),
  // Lixo — vermelho, garrafa
  'ic-lixo': CIRCLE_PIN(
    '#E84855',
    '<path d="M10 5h4"/><path d="M10 5v-1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1"/>' +
      '<rect x="8" y="5" width="8" height="14" rx="1.5"/>' +
      '<path d="M11 8v6"/><path d="M13 8v6"/>'
  ),
}

const SRC = 'feicoes'

interface Dados {
  picos: Pico[]
  alertas: Alerta[]
  mutiroes: Mutirao[]
}

function colecao({ picos, alertas, mutiroes }: Dados): FeatureCollection<Point> {
  const features: FeatureCollection<Point>['features'] = []
  for (const p of picos) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { tipo: 'pico', id: p.id, titulo: p.nome },
    })
  }
  for (const a of alertas) {
    if (a.lat == null || a.lng == null) continue
    // Subcategorizar alertas: esgoto e lixo têm pins diferentes
    const sub = (a.categoria === 'esgoto' || a.categoria === 'lixo') ? a.categoria : 'esgoto'
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [a.lng, a.lat] },
      properties: {
        tipo: sub,
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

/** Conteúdo do popup para alerta/mutirão (pico navega; não abre popup). */
function popupHtml(p: Record<string, unknown>): string {
  const local = `${esc(p.municipio)}/${esc(p.uf)}`
  let meta = ''
  if (p.tipo === 'esgoto' || p.tipo === 'lixo') {
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
 * Mapa satélite híbrido (ESRI World Imagery + labels CARTO).
 * Pins circulares coloridos por categoria:
 *   Pico (azul), Mutirão (laranja), Esgoto (cinza), Lixo (vermelho).
 * Clusterização nativa do MapLibre.
 * Tocar num pico: seleciona (onSelectPico) ou navega para a página.
 */
export function MapView({
  picos,
  alertas = [],
  mutiroes = [],
  onSelectPico,
  className,
  style,
}: {
  picos: Pico[]
  alertas?: Alerta[]
  mutiroes?: Mutirao[]
  onSelectPico?: (p: Pico) => void
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const prontoRef = useRef(false)
  const dadosRef = useRef<Dados>({ picos, alertas, mutiroes })
  dadosRef.current = { picos, alertas, mutiroes }
  const navigate = useNavigate()
  const navRef = useRef(navigate)
  navRef.current = navigate
  const onSelRef = useRef(onSelectPico)
  onSelRef.current = onSelectPico

  // monta o mapa, carrega ícones, cria a fonte clusterizada e as camadas
  useEffect(() => {
    if (!ref.current || mapRef.current) return
    let descartado = false

    // Estilo satélite híbrido: raster ESRI + labels vetoriais CARTO
    const estiloSatelite: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          maxzoom: 19,
          attribution: '&copy; Esri, Maxar, Earthstar'
        },
        'carto-labels': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png',
          ],
          tileSize: 256,
          maxzoom: 19,
          attribution: '&copy; CARTO, &copy; OpenStreetMap'
        }
      },
      layers: [
        {
          id: 'satellite',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 19,
        },
        {
          id: 'labels',
          type: 'raster',
          source: 'carto-labels',
          minzoom: 0,
          maxzoom: 19,
        }
      ],
      glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    }

    const map = new maplibregl.Map({
      container: ref.current,
      style: estiloSatelite,
      center: [-46.79, -24.19],
      zoom: 10.5,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showAccuracyCircle: false,
    }), 'top-right')
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

      // Clusters — brancos com borda e número escuro (estilo Zurrb)
      map.addLayer({
        id: 'clusters-glow',
        type: 'circle',
        source: SRC,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#ffffff',
          'circle-radius': ['step', ['get', 'point_count'], 28, 10, 34, 25, 40],
          'circle-opacity': 0.25,
          'circle-blur': 0.4,
        },
      })
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SRC,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#ffffff',
          'circle-radius': ['step', ['get', 'point_count'], 20, 10, 24, 25, 30],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': 'rgba(13, 110, 168, 0.6)',
        },
      })
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SRC,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Bold'],
          'text-size': ['step', ['get', 'point_count'], 14, 10, 16, 25, 20],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#0D6EA8',
        },
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
            'esgoto', 'ic-esgoto',
            'lixo', 'ic-lixo',
            'mutirao', 'ic-mutirao',
            'ic-pico', // default: pico
          ],
          'icon-size': 1,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-anchor': 'center',
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

      // clique no ponto: pico seleciona (ou navega); alerta/mutirão abre popup
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
    if (src) src.setData(colecao({ picos, alertas, mutiroes }))
  }, [picos, alertas, mutiroes])

  return <div ref={ref} className={className} style={{ position: 'absolute', inset: 0, background: '#0a1929', ...style }} />
}
