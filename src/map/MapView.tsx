import React, { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useNavigate } from 'react-router-dom'
import type { FeatureCollection, Point } from 'geojson'
import type { Alerta, Mutirao, Pico } from '../types/domain'

/* ─── Ícones estilo ZUrb: círculo + ponteira + ícone branco ─── */

/**
 * Cria pin estilo ZUrb — círculo colorido sólido + ponteira triangular.
 * Cada SVG tem filter ID ÚNICO (sufixo cor hex) para evitar conflito no MapLibre.
 */
const ZURB_PIN = (bg: string, paths: string, size = 48) => {
  // ID único por cor para evitar conflito de filter entre SVGs rasterizados
  const uid = bg.replace('#', '')
  const r = size / 2
  const svgH = size + 12  // espaço para ponteira
  const cy = r            // centro vertical do círculo
  const tipY = size + 2   // ponta inferior
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${svgH}" viewBox="0 0 ${size} ${svgH}">` +
    `<defs><filter id="s${uid}" x="-30%" y="-20%" width="160%" height="160%">` +
    `<feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.55"/>` +
    `</filter></defs>` +
    // Ponteira triangular (branca borda + cor preenchimento)
    `<polygon points="${r - 5},${size - 4} ${r},${tipY} ${r + 5},${size - 4}" fill="${bg}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>` +
    // Círculo principal
    `<circle cx="${r}" cy="${cy}" r="${r - 3}" fill="${bg}" stroke="#fff" stroke-width="3" filter="url(#s${uid})"/>` +
    // Ícone branco centralizado
    `<g transform="translate(${r - 6}, ${cy - 6}) scale(0.5)" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">` +
    paths +
    `</g></svg>`
  )
}

/* Paths SVG (Tabler icons) */
const WAVE = '<path d="M2 7c.6 .5 1.2 1 2.5 1c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2"/><path d="M2 13c.6 .5 1.2 1 2.5 1c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2"/>'
const PEOPLE = '<path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/>'
const DROP = '<path d="M12 3c-3.2 4.5-6 7.5-6 10.5a6 6 0 0 0 12 0c0-3-2.8-6-6-10.5z"/>'
const TRASH = '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>'
const BOTTLE = '<path d="M10 5h4"/><path d="M10 5v-1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1"/><rect x="8" y="5" width="8" height="14" rx="1.5"/><path d="M11 8v6"/><path d="M13 8v6"/>'
const MOUNTAIN = '<path d="M3 20h18"/><path d="M12 4l-8 16h16z"/>'
const FLAME = '<path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5-1.786 3-2.791 3-4 2z"/>'
const FISH = '<path d="M16.69 7.44a6.973 6.973 0 0 0-1.69 4.56c0 1.747 .642 3.346 1.7 4.57"/><path d="M2 9.504c7.4 8.83 14.6 7.83 19-1.504-4.4-9.33-11.6-10.33-19-1.504z"/><circle cx="14.5" cy="11.5" r=".5" fill="#fff"/>'
const DOT = '<circle cx="12" cy="12" r="4"/><path d="M12 3v2"/><path d="M12 19v2"/><path d="M3 12h2"/><path d="M19 12h2"/>'
const WAVESINE = '<path d="M21 12h-2c-.894 0-1.662-.857-1.761-2c-.296-3.45-.749-6-2.749-6s-2.5 3.582-2.5 8s-.5 8-2.5 8s-2.452-2.547-2.749-6c-.1-1.147-.867-2-1.763-2h-1.928"/>'
const HOME = '<path d="M5 12l-2 0l9-9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"/>'
const QUESTION = '<path d="M8 8a3.5 3 0 0 1 3.5-3h1a3.5 3 0 0 1 3.5 3a3 3 0 0 1-2 3c-1.113.667-2 1.667-2 3"/><path d="M12 19v.01"/>'

/** Ícones — modelo ZUrb: círculos sólidos com ponteira + sombra forte */
const ICONES: Record<string, string> = {
  // 🏄 Pico de surf — azul oceano (maior: 52px)
  'ic-pico':           ZURB_PIN('#0D6EA8', WAVE, 52),
  // 🧹 Mutirão — laranja (maior: 50px)
  'ic-mutirao':        ZURB_PIN('#FF8C42', PEOPLE, 50),
  // 🔴 Alertas ambientais — tamanho padrão 44px
  'ic-lixo-praia':     ZURB_PIN('#E84855', TRASH, 44),
  'ic-lixo-rio':       ZURB_PIN('#D64045', BOTTLE, 44),
  'ic-esgoto':         ZURB_PIN('#7B8794', DROP, 44),
  'ic-erosao':         ZURB_PIN('#C17817', MOUNTAIN, 44),
  'ic-oleo':           ZURB_PIN('#3D3D3D', DOT, 44),
  'ic-animal':         ZURB_PIN('#5B8C5A', FISH, 44),
  'ic-entulho':        ZURB_PIN('#9B6B4D', TRASH, 44),
  'ic-microplasticos': ZURB_PIN('#B266B2', DOT, 44),
  'ic-espuma':         ZURB_PIN('#5E8C61', WAVESINE, 44),
  'ic-queimada':       ZURB_PIN('#FF6B35', FLAME, 44),
  'ic-ocupacao':       ZURB_PIN('#8B6914', HOME, 44),
  'ic-outro':          ZURB_PIN('#6B7280', QUESTION, 44),
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
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [a.lng, a.lat] },
      properties: {
        tipo: a.categoria,
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
  const isMutirao = p.tipo === 'mutirao'
  const href = isMutirao ? `/mutirao/${esc(p.id)}` : `/acoes`
  let meta = ''
  if (!isMutirao) {
    meta = `${esc(p.status)} · ${local}`
    if (p.precisao) meta += ` · local ${esc(p.precisao)}`
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
    `<a href="${href}" style="display:block;text-decoration:none;color:inherit;cursor:pointer">` +
    `<div style="display:flex;align-items:center;gap:6px">` +
    `<div style="flex:1">` +
    `<div style="font:600 14px 'Inter',system-ui,sans-serif;color:#14202A;max-width:220px">${esc(p.titulo)}</div>` +
    `<div style="font:500 12px 'Inter',system-ui,sans-serif;color:#5A6B79;margin-top:3px;line-height:1.4">${meta}</div>` +
    `</div>` +
    `<div style="color:#1c8aad;flex-shrink:0;font-size:18px">›</div>` +
    `</div>` +
    `</a>`
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
      if (!map.hasImage(nome)) map.addImage(nome, img, { pixelRatio: 1 })
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

    // Estilo satélite puro (sem labels de terceiros)
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
      },
      layers: [
        {
          id: 'satellite',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
      glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    }

    const map = new maplibregl.Map({
      container: ref.current,
      style: estiloSatelite,
      center: [-46.79, -24.19],
      zoom: 10.5,
      attributionControl: false,
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
        clusterMaxZoom: 14,
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
            'lixo-praia', 'ic-lixo-praia',
            'lixo-rio', 'ic-lixo-rio',
            'esgoto', 'ic-esgoto',
            'erosao', 'ic-erosao',
            'oleo', 'ic-oleo',
            'animal', 'ic-animal',
            'entulho', 'ic-entulho',
            'microplasticos', 'ic-microplasticos',
            'espuma', 'ic-espuma',
            'queimada', 'ic-queimada',
            'ocupacao', 'ic-ocupacao',
            'outro', 'ic-outro',
            'mutirao', 'ic-mutirao',
            // legacy fallbacks
            'lixo', 'ic-lixo-praia',
            'poluicao', 'ic-oleo',
            'privatizacao', 'ic-ocupacao',
            'obra', 'ic-entulho',
            'ic-pico', // default: pico
          ],
          'icon-size': [
            'interpolate', ['linear'], ['zoom'],
            5, 0.4,    // zoom continental
            8, 0.55,   // zoom costa
            10, 0.7,   // zoom cidade
            12, 0.85,  // zoom bairro
            14, 1.0,   // zoom rua
            17, 1.2,   // zoom close-up
          ],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-anchor': 'bottom',
        },
      })

      // Labels dos picos — nome do local abaixo do pin
      map.addLayer({
        id: 'pico-labels',
        type: 'symbol',
        source: SRC,
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'tipo'], 'pico']],
        layout: {
          'text-field': ['get', 'titulo'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
          'text-offset': [0, 0.8],
          'text-anchor': 'top',
          'text-max-width': 10,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(6, 43, 69, 0.85)',
          'text-halo-width': 1.5,
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
