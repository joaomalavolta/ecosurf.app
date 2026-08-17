import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useNavigate } from 'react-router-dom'
import type { FeatureCollection, Point } from 'geojson'
import { ICONE_MAPA_SVG, EXPRESSAO_ICONE, carregarIcones, temGlyphs, GLYPHS } from './pins'
import type { ContribuicoesGeo } from '../services/contribuicoesGeo'

/**
 * O mapa de um território — o que uma pessoa ou comunidade colocou no mapa.
 *
 * Não é o MapView com um filtro. O mapa público existe para responder "o que
 * está acontecendo perto de mim": ele voa até o seu GPS, tem scrubber de
 * tempo, agrupa pinos em bolhas. Nada disso faz sentido aqui — este mapa abre
 * enquadrando o território de OUTRA pessoa, e agrupar oito pontos numa bolha
 * esconderia justamente o que se veio ver.
 *
 * O que os dois compartilham é a linguagem visual: os pinos vêm de pins.ts, os
 * mesmos do Radar. Um alerta de esgoto tem a mesma cara nos dois lugares.
 */

const SRC = 'contribuicoes'

/** Camadas que os botões acima do mapa acendem e apagam. */
export type FiltroContrib = 'tudo' | 'picos' | 'alertas' | 'positivos' | 'mutiroes'

function colecao(c: ContribuicoesGeo, filtro: FiltroContrib = 'tudo'): FeatureCollection<Point> {
  const features: FeatureCollection<Point>['features'] = []
  const quer = (t: FiltroContrib) => filtro === 'tudo' || filtro === t

  if (quer('picos')) for (const p of c.picosCriados) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {
        tipo: 'pico', id: p.id, titulo: p.nome, rotulo: p.nome,
        detalhe: 'Pico cadastrado', local: `${p.municipio}${p.uf ? `/${p.uf}` : ''}`,
      },
    })
  }
  if (quer('picos')) for (const p of c.picosFotografados) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {
        tipo: 'pico', id: p.id, titulo: p.nome, rotulo: p.nome,
        detalhe: 'Registrou ondas aqui', local: `${p.municipio}${p.uf ? `/${p.uf}` : ''}`,
      },
    })
  }
  if (quer('alertas')) for (const a of c.alertas) {
    if (a.lat == null || a.lng == null) continue
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [a.lng, a.lat] },
      properties: {
        tipo: a.categoria, id: a.id, titulo: a.titulo,
        detalhe: a.status, local: `${a.municipio ?? ''}${a.uf ? `/${a.uf}` : ''}`,
      },
    })
  }
  // Mesma forma dos alertas — o que muda é a camada em que entram e o ícone,
  // que sai da categoria. `detalhe` não leva status: um registro positivo não
  // está "identificado" esperando solução.
  if (quer('positivos')) for (const p of c.positivos) {
    if (p.lat == null || p.lng == null) continue
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {
        tipo: p.categoria, id: p.id, titulo: p.titulo,
        detalhe: 'Registro positivo', local: `${p.municipio ?? ''}${p.uf ? `/${p.uf}` : ''}`,
      },
    })
  }
  if (quer('mutiroes')) for (const m of c.mutiroes) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
      properties: {
        tipo: 'mutirao', id: m.id, titulo: m.titulo,
        detalhe: m.horario ? `Mutirão · ${m.horario}` : 'Mutirão',
        local: `${m.municipio}${m.uf ? `/${m.uf}` : ''}`,
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] as string)

function popupHtml(p: Record<string, unknown>): string {
  const meta = [p.detalhe, p.local].filter(Boolean).map(esc).join(' · ')
  return (
    `<div>` +
    `<div style="font:600 13.5px 'Inter',system-ui,sans-serif;color:#14202A;max-width:210px">${esc(p.titulo)}</div>` +
    `<div style="font:500 11.5px 'Inter',system-ui,sans-serif;color:#5A6B79;margin-top:3px">${meta}</div>` +
    `</div>`
  )
}

/** Para onde o toque leva, por tipo de ponto. */
function destinoDe(p: Record<string, unknown>): string {
  if (p.tipo === 'pico') return `/pico/${p.id}`
  if (p.tipo === 'mutirao') return `/mutirao/${p.id}`
  return `/alerta/${p.id}`
}

export function MapaContribuicoes({
  contribuicoes,
  altura = 260,
  filtro = 'tudo',
  foco = null,
}: {
  contribuicoes: ContribuicoesGeo
  altura?: number
  /** Trocar de camada reenquadra o mapa — é o que faz "abrir os mutirões". */
  filtro?: FiltroContrib
  /**
   * Item escolhido na lista abaixo do mapa: o mapa voa até ele e abre o balão.
   * O `toque` é um contador, não enfeite — tocar DUAS vezes no mesmo item tem
   * de voar de novo, e sem ele o objeto seria igual e o efeito não rodaria.
   */
  foco?: { id: string; lng: number; lat: number; toque: number } | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const prontoRef = useRef(false)
  const navigate = useNavigate()
  const navRef = useRef(navigate)
  const dadosRef = useRef(contribuicoes)
  const filtroRef = useRef(filtro)
  const btnBaseRef = useRef<HTMLButtonElement | null>(null)
  const balaoRef = useRef<maplibregl.Popup | null>(null)
  const abrirBalaoRef = useRef<((c: [number, number], p: Record<string, unknown>) => void) | null>(null)

  const [satelite, setSatelite] = useState<boolean>(() => {
    try { return localStorage.getItem('ecosurf.map-base') !== 'ruas' } catch { return true }
  })

  const dados = useMemo(() => colecao(contribuicoes, filtro), [contribuicoes, filtro])

  useEffect(() => {
    dadosRef.current = contribuicoes
    navRef.current = navigate
    filtroRef.current = filtro
  })

  /** Enquadra tudo o que a pessoa mapeou — o recorte É o conteúdo. */
  function enquadrar(map: maplibregl.Map, fc: FeatureCollection<Point>, animar: boolean) {
    if (fc.features.length === 0) return
    const suave = animar && !document.documentElement.dataset.reduzAnimacao
    if (fc.features.length === 1) {
      const [lng, lat] = fc.features[0].geometry.coordinates as [number, number]
      map.flyTo({ center: [lng, lat], zoom: 13.5, duration: suave ? 900 : 0, essential: true })
      return
    }
    const b = new maplibregl.LngLatBounds()
    for (const f of fc.features) b.extend(f.geometry.coordinates as [number, number])
    map.fitBounds(b, {
      padding: { top: 44, bottom: 40, left: 34, right: 34 },
      // Contribuições espalhadas por uma praia só não podem colar no chão:
      // sem teto, duas fotos vizinhas abrem o mapa em zoom 20 e some o contexto.
      maxZoom: 14,
      duration: suave ? 900 : 0,
      essential: true,
    })
  }

  // Troca de base sem recriar o mapa (preserva pinos e câmera).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    try {
      map.setLayoutProperty('satelite', 'visibility', satelite ? 'visible' : 'none')
      map.setLayoutProperty('ruas', 'visibility', satelite ? 'none' : 'visible')
    } catch { /* estilo ainda carregando: o valor inicial já cobre */ }
    try { localStorage.setItem('ecosurf.map-base', satelite ? 'satelite' : 'ruas') } catch { /* privado */ }
    const btn = btnBaseRef.current
    if (btn) btn.style.background = satelite ? '' : '#e8f0f4'
  }, [satelite])

  useEffect(() => {
    if (!ref.current || mapRef.current) return
    let descartado = false

    const map = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {
          satelite: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256, maxzoom: 19, attribution: '&copy; Esri',
          },
          ruas: {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
            ],
            tileSize: 256, maxzoom: 19, attribution: '&copy; OpenStreetMap, &copy; CARTO',
          },
        },
        layers: [
          { id: 'satelite', type: 'raster', source: 'satelite', layout: { visibility: satelite ? 'visible' : 'none' } },
          { id: 'ruas', type: 'raster', source: 'ruas', layout: { visibility: satelite ? 'none' : 'visible' } },
        ],
        glyphs: GLYPHS,
      },
      // Abre no Brasil e o fitBounds leva ao território assim que os pinos
      // entram: sem GPS, sem pedir permissão. Não é o mapa de ninguém que está
      // olhando — é o de quem está sendo visitado.
      center: [-46.79, -24.19],
      zoom: 3,
      attributionControl: false,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    const controleBase: maplibregl.IControl = {
      onAdd: () => {
        const div = document.createElement('div')
        div.className = 'maplibregl-ctrl maplibregl-ctrl-group'
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.setAttribute('aria-label', 'Alternar satélite e mapa de ruas')
        btn.style.cssText = 'display:flex;align-items:center;justify-content:center;'
        btn.innerHTML = ICONE_MAPA_SVG
        btn.addEventListener('click', () => setSatelite((v) => !v))
        div.appendChild(btn)
        btnBaseRef.current = btn
        return div
      },
      onRemove: () => { btnBaseRef.current = null },
    }
    map.addControl(controleBase, 'top-right')
    map.on('error', () => {})
    mapRef.current = map

    // Mesma armadilha do MapView: o card entra em layout depois do mapa nascer
    // e o MapLibre renderiza uma fatia. O observer força o recálculo.
    const container = ref.current
    let ro: ResizeObserver | null = null
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => {
        requestAnimationFrame(() => { try { map.resize() } catch { /* já destruído */ } })
      })
      ro.observe(container)
    }

    map.on('load', async () => {
      // Em paralelo: ícones são locais, a checagem de fonte é rede.
      const [, comTexto] = await Promise.all([carregarIcones(map), temGlyphs()])
      if (descartado) return

      const fc = colecao(dadosRef.current, filtroRef.current)
      // Agrupar era para ficar de fora — a ideia era que com poucos pontos a
      // bolha escondesse o que se veio ver. O primeiro render mostrou o
      // contrário: oito alertas dentro da mesma praia viram uma pilha de pinos
      // sobrepostos, e nem dá para contar quantos são. A bolha com número
      // informa mais, e o zoom abre.
      map.addSource(SRC, {
        type: 'geojson', data: fc,
        cluster: true, clusterRadius: 40, clusterMaxZoom: 12,
      })

      map.addLayer({
        id: 'grupos',
        type: 'circle',
        source: SRC,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#2E9BD6', 10, '#0E7FA8', 25, '#0B5E7C'],
          'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 25, 22],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })
      // Sem fonte, camada de texto nenhuma entra — senão o MapLibre não
      // desenha nem os pinos. Ver `temGlyphs()` em pins.ts.
      if (comTexto) map.addLayer({
        id: 'grupos-conta',
        type: 'symbol',
        source: SRC,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
        },
        paint: { 'text-color': '#ffffff' },
      })

      const semGrupo: maplibregl.ExpressionSpecification = ['!', ['has', 'point_count']]

      map.addLayer({
        id: 'pontos',
        type: 'symbol',
        source: SRC,
        filter: semGrupo,
        layout: {
          'icon-image': EXPRESSAO_ICONE as unknown as maplibregl.ExpressionSpecification,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 5, 0.42, 10, 0.62, 13, 0.8, 16, 0.95],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-anchor': 'bottom',
        },
      })

      if (comTexto) map.addLayer({
        id: 'rotulos',
        type: 'symbol',
        source: SRC,
        filter: ['all', semGrupo, ['has', 'rotulo']],
        layout: {
          'text-field': ['get', 'rotulo'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 11,
          'text-offset': [0, 0.7],
          'text-anchor': 'top',
          'text-max-width': 9,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(6, 43, 69, 0.85)',
          'text-halo-width': 1.5,
        },
      })

      // Tocar na bolha abre o grupo, como no mapa público.
      map.on('click', 'grupos', async (e) => {
        const f = e.features?.[0]
        const grupo = f?.properties?.cluster_id as number | undefined
        const fonte = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined
        if (grupo == null || !fonte) return
        try {
          const zoom = await fonte.getClusterExpansionZoom(grupo)
          map.easeTo({ center: (f!.geometry as Point).coordinates as [number, number], zoom })
        } catch { /* falhou: o usuário ainda pode dar zoom na mão */ }
      })
      map.on('mouseenter', 'grupos', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'grupos', () => { map.getCanvas().style.cursor = '' })

      // Um balão só na tela por vez: tocar na lista várias vezes empilhava
      // popups em cima uns dos outros.
      const abrirBalao = (coord: [number, number], p: Record<string, unknown>) => {
        balaoRef.current?.remove()
        // Popup primeiro, navegação no toque dele: num mapa pequeno o dedo
        // erra o alvo com frequência, e sair da página por engano é pior do
        // que um toque a mais.
        const popup = new maplibregl.Popup({ offset: 18, maxWidth: '230px' })
          .setLngLat(coord)
          .setHTML(popupHtml(p))
          .addTo(map)
        popup.getElement()?.addEventListener('click', () => navRef.current(destinoDe(p)))
        const el = popup.getElement()
        if (el) el.style.cursor = 'pointer'
        balaoRef.current = popup
      }
      abrirBalaoRef.current = abrirBalao

      map.on('click', 'pontos', (e) => {
        const f = e.features?.[0]
        if (!f) return
        abrirBalao((f.geometry as Point).coordinates as [number, number],
                   f.properties as Record<string, unknown>)
      })
      map.on('mouseenter', 'pontos', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'pontos', () => { map.getCanvas().style.cursor = '' })

      prontoRef.current = true
      setTimeout(() => { try { map.resize() } catch { /**/ } }, 60)
      enquadrar(map, fc, false)
    })

    return () => {
      descartado = true
      prontoRef.current = false
      balaoRef.current?.remove()
      balaoRef.current = null
      abrirBalaoRef.current = null
      ro?.disconnect()
      map.remove()
      mapRef.current = null
    }
    // `satelite` só define a visibilidade INICIAL; a troca em runtime tem
    // efeito próprio. Incluí-la aqui recriaria o mapa a cada toque no botão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Tocou num item da lista: o mapa vai até ele e abre o balão.
   *
   * Fica na PÁGINA — é o que o pedido tinha de mais específico ("tudo isso na
   * própria página do perfil"). Quem quiser abrir o registro inteiro toca no
   * balão; quem só quer ver onde fica, já viu.
   */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !prontoRef.current || !foco) return
    map.flyTo({
      center: [foco.lng, foco.lat],
      zoom: Math.max(map.getZoom(), 14),
      ...(document.documentElement.dataset.reduzAnimacao ? { duration: 0 } : { speed: 1.2 }),
      essential: true,
    })
    // O balão espera o voo: aberto antes, ele chega deslocado e "escorrega"
    // pela tela até a câmera parar.
    const abrir = () => {
      const f = dados.features.find((x) => x.properties?.id === foco.id)
      if (f) abrirBalaoRef.current?.(f.geometry.coordinates as [number, number], f.properties ?? {})
    }
    map.once('moveend', abrir)
    return () => { map.off('moveend', abrir) }
  }, [foco, dados])

  // Dados chegam depois da rede: atualiza a fonte e reenquadra.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !prontoRef.current) return
    const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined
    if (!src) return
    src.setData(dados)
    enquadrar(map, dados, true)
  }, [dados])

  return (
    <div
      style={{
        position: 'relative', height: altura, borderRadius: 14,
        overflow: 'hidden', border: '1px solid var(--line)',
      }}
    >
      <div ref={ref} style={{ position: 'absolute', inset: 0, background: '#0a1929' }} />
    </div>
  )
}
