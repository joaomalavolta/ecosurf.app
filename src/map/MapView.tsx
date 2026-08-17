import { IconCamera, IconMapPinPlus } from '@tabler/icons-react'
import { voarAteMinhaLocalizacaoAtivo } from '../lib/preferencias'
import React, { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useNavigate } from 'react-router-dom'
import type { FeatureCollection, Point } from 'geojson'
import type { Alerta, Mutirao, Pico } from '../types/domain'
// Os pinos moram em pins.ts desde que o mapa de contribuições (perfil e
// comunidade) passou a desenhá-los também — ver o cabeçalho de lá.
import { ICONE_MAPA_SVG, EXPRESSAO_ICONE, TIPOS_POSITIVO, carregarIcones, temGlyphs, GLYPHS } from './pins'
import {
  BRASIL, CHAVE_POSICAO, localDaCidade, lerPosicao, gravarPosicao, type Local,
} from '../lib/regiao'

const SRC = 'feicoes'

interface Dados {
  picos: Pico[]
  alertas: Alerta[]
  mutiroes: Mutirao[]
  ativos?: Set<string>
}

function colecao({ picos, alertas, mutiroes, ativos }: Dados): FeatureCollection<Point> {
  const features: FeatureCollection<Point>['features'] = []
  for (const p of picos) {
    const ativo = ativos?.has(p.id) ?? false
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { tipo: ativo ? 'pico-ativo' : 'pico', id: p.id, titulo: p.nome },
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
  const href = isMutirao ? `/mutirao/${esc(p.id)}` : `/alerta/${esc(p.id)}`
  let meta: string
  if (!isMutirao) {
    meta = `${esc(p.status)} · ${local}`
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

/** Tipos para filtro por camada */
const TIPOS_PICO = ['pico', 'pico-ativo']
const TIPOS_ALERTA = ['lixo-praia', 'lixo-rio', 'esgoto', 'erosao', 'oleo', 'animal', 'entulho', 'microplasticos', 'espuma', 'queimada', 'ocupacao', 'outro', 'lixo', 'poluicao', 'privatizacao', 'obra']
const TIPOS_MUTIRAO = ['mutirao']

/**
 * O filtro é por `tipo` da feature, que é a categoria — não há uma propriedade
 * `tipo_registro` no GeoJSON porque a categoria já determina a família.
 *
 * `alertas` inclui mutirões desde antes: no Radar, o lado "eco" sempre foi
 * denúncia + mobilização. `eco` é esse mesmo lado agora que ele tem duas
 * famílias de registro; `positivos` isola a nova.
 */
function filtroLayer(filtro?: string): maplibregl.ExpressionSpecification | null {
  switch (filtro) {
    case 'picos': return ['in', ['get', 'tipo'], ['literal', TIPOS_PICO]]
    case 'alertas': return ['in', ['get', 'tipo'], ['literal', [...TIPOS_ALERTA, ...TIPOS_MUTIRAO]]]
    case 'positivos': return ['in', ['get', 'tipo'], ['literal', TIPOS_POSITIVO]]
    case 'eco': return ['in', ['get', 'tipo'], ['literal', [...TIPOS_ALERTA, ...TIPOS_POSITIVO, ...TIPOS_MUTIRAO]]]
    case 'mutiroes': return ['in', ['get', 'tipo'], ['literal', TIPOS_MUTIRAO]]
    default: return null
  }
}

/**
 * Mapa satélite híbrido (ESRI World Imagery).
 * Pins circulares coloridos por categoria.
 * Filtragem instantânea via setFilter (sem rebuild).
 */
const JANELAS: { h: number | null; rotulo: string; curto: string }[] = [
  { h: 0.5, rotulo: '30 min', curto: '30m' }, { h: 1, rotulo: '1h', curto: '1h' },
  { h: 3, rotulo: '3h', curto: '3h' }, { h: 6, rotulo: '6h', curto: '6h' },
  { h: 12, rotulo: '12h', curto: '12h' }, { h: 24, rotulo: '24h', curto: '24h' },
  { h: 48, rotulo: '48h', curto: '48h' }, { h: 168, rotulo: '7 dias', curto: '7d' },
  { h: null, rotulo: 'todas', curto: 'tudo' },
]

/**
 * O que dizer quando a região visível não tem nada mapeado.
 *
 * Fora da Baixada Santista o mapa está quase todo vazio — quem abre de
 * Imbituba enquadra a praia certa e não vê ponto nenhum. Sem uma palavra, o
 * vazio se lê como "este app não serve para mim"; com ela, vira o convite que
 * de fato é. O texto acompanha o filtro para não prometer o que não cabe:
 * quem está vendo só picos é convidado a cadastrar um pico.
 */
const CONVITES: Record<string, { titulo: string; corpo: string; botao: string; para: string }> = {
  tudo: {
    titulo: 'Ninguém mapeou nada por aqui ainda',
    corpo: 'Esta parte do litoral está em branco. Um pico, um alerta ou um mutirão seu começa o mapa desta região.',
    botao: 'Começar o mapa daqui',
    para: '/nova-acao',
  },
  picos: {
    titulo: 'Nenhum pico cadastrado por aqui',
    corpo: 'Conhece uma onda nesta região? Coloque no mapa para quem vier depois.',
    botao: 'Cadastrar um pico',
    para: '/nova-acao/pico',
  },
  alertas: {
    titulo: 'Nenhum registro ambiental por aqui',
    corpo: 'Viu lixo, esgoto ou erosão nesta região? Registrar é o primeiro passo para cobrar.',
    botao: 'Registrar um alerta',
    para: '/nova-acao/alerta',
  },
  positivos: {
    titulo: 'Nenhum registro positivo por aqui',
    corpo: 'Fauna, desova, mata em pé, coleta seletiva: o que está dando certo nesta região também merece o mapa.',
    botao: 'Publicar um registro positivo',
    para: '/nova-acao/positivo',
  },
  eco: {
    titulo: 'Nada mapeado por aqui ainda',
    corpo: 'Nem problema, nem boa notícia: esta parte do litoral está em branco. Um registro seu começa o mapa.',
    botao: 'Registrar alguma coisa',
    para: '/nova-acao',
  },
  mutiroes: {
    titulo: 'Nenhum mutirão por aqui',
    corpo: 'Chame gente para uma limpeza ou uma ação nesta praia.',
    botao: 'Criar um mutirão',
    para: '/nova-acao/mutirao',
  },
}

/** Distância em km entre dois pontos (haversine) — usada para enquadrar a região. */
function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function MapView({
  picos,
  alertas = [],
  mutiroes = [],
  ativos,
  atividade,
  scrubberAncora = 'topo',
  destino,
  filtro,
  cidadePerfil,
  onSelectPico,
  className,
  style,
}: {
  picos: Pico[]
  alertas?: Alerta[]
  mutiroes?: Mutirao[]
  ativos?: Set<string>
  /** Eventos de foto (picoId + quando) — liga o scrubber temporal do mapa. */
  atividade?: { picoId: string; em: string }[]
  /**
   * Cidade do perfil, se a pessoa preencheu. Serve de palpite de região quando
   * não há posição guardada nem permissão de GPS — ver `lib/regiao.ts`.
   */
  cidadePerfil?: string | null
  /** Onde ancorar o scrubber, para não colidir com controles de cada tela. */
  scrubberAncora?: 'topo' | 'rodape' | 'rodape-esq'
  /** Voo comandado de fora (ex.: menu territorial escolheu uma cidade). */
  destino?: { lng: number; lat: number; zoom?: number } | null
  filtro?: 'tudo' | 'picos' | 'alertas' | 'positivos' | 'eco' | 'mutiroes'
  onSelectPico?: (p: Pico) => void
  className?: string
  style?: React.CSSProperties
}) {
  // Scrubber temporal: qual janela de frescor "acende" um pico no mapa.
  const [janelaIdx, setJanelaIdx] = useState(JANELAS.length - 1) // padrão: tudo
  // Base do mapa: satélite (estudar o pico — areia, costão, forma da onda) ou
  // ruas (se localizar — nomes de praia, bairro, referências). Persistido local.
  const [baseSatelite, setBaseSatelite] = useState<boolean>(() => {
    try { return localStorage.getItem('ecosurf.map-base') !== 'ruas' } catch { return true }
  })
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  /** Picos atuais visíveis para o efeito de init (que roda uma vez só). */
  const picosRef = useRef<Pico[]>([])
  /** Marca que o voo pedido veio do BOTÃO de GPS (aproximar), não da abertura. */
  const pediuAproximar = useRef(false)
  const controleBaseBtnRef = useRef<HTMLButtonElement | null>(null)
  const prontoRef = useRef(false)
  /**
   * O que há na área visível. `regiao` = não existe ponto nenhum ali (convite a
   * mapear); `filtro` = existe, mas o filtro escondeu (aviso, sem convite).
   * A distinção importa: dizer "ninguém mapeou nada" com o filtro em Mutirões,
   * tendo cinco alertas na tela ao lado, seria mentira.
   */
  const [vazio, setVazio] = useState<'regiao' | 'filtro' | null>(null)
  /** Cidade do perfil, sempre fresca — chega da rede depois do mapa nascer. */
  const cidadeRef = useRef<string | null | undefined>(cidadePerfil)
  /** Ainda não sabemos a região desta pessoa? Só então vale palpitar. */
  const faltaRegiao = useRef(false)
  /** Ponte para o enquadramento, que mora dentro do efeito de init. */
  const enquadrarRef = useRef<((lng: number, lat: number) => void) | null>(null)
  const janelaH = JANELAS[janelaIdx].h
  // O efeito de init roda uma vez; os picos chegam depois (rede). Este ref é a
  // ponte — atualizado em efeito, nunca durante o render.
  useEffect(() => { picosRef.current = picos }, [picos])

  // Picos "acesos" na janela de frescor. Depende do tempo atual (Date.now),
  // então é estado derivado em efeito — não useMemo, que não reavaliaria com a
  // passagem do tempo nem com troca de janela.
  const [ativosEfetivos, setAtivosEfetivos] = useState<Set<string> | undefined>(ativos)
  useEffect(() => {
    if (janelaH == null || !atividade) {
      setAtivosEfetivos(ativos)
      return
    }
    const corte = Date.now() - janelaH * 3600_000
    const s = new Set<string>()
    for (const a of atividade) {
      if (new Date(a.em).getTime() >= corte) s.add(a.picoId)
    }
    setAtivosEfetivos(s)
  }, [janelaH, atividade, ativos])

  const dadosRef = useRef<Dados>({ picos, alertas, mutiroes, ativos: ativosEfetivos })
  const navigate = useNavigate()
  const navRef = useRef(navigate)
  const onSelRef = useRef(onSelectPico)
  // Refs-ponte atualizados em efeito (nunca durante o render): o efeito de init
  // do mapa roda uma vez e lê sempre o valor fresco por aqui. Escrever ref no
  // corpo do componente dispara re-render em cascata e já causou bug de
  // exibição antes — por isso fica isolado neste efeito.
  useEffect(() => {
    dadosRef.current = { picos, alertas, mutiroes, ativos: ativosEfetivos }
    navRef.current = navigate
    onSelRef.current = onSelectPico
    cidadeRef.current = cidadePerfil
  })

  // Alterna a base satélite/ruas sem recriar o mapa (preserva pins e câmera).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    try {
      map.setLayoutProperty('esri-satellite-layer', 'visibility', baseSatelite ? 'visible' : 'none')
      map.setLayoutProperty('carto-ruas-layer', 'visibility', baseSatelite ? 'none' : 'visible')
    } catch { /* estilo ainda carregando: o valor inicial já cobre */ }
    try { localStorage.setItem('ecosurf.map-base', baseSatelite ? 'satelite' : 'ruas') } catch { /* privado */ }
    // Feedback visual no botão nativo: leve destaque quando em modo ruas.
    const btn = controleBaseBtnRef.current
    if (btn) btn.style.background = baseSatelite ? '' : '#e8f0f4'
  }, [baseSatelite])

  useEffect(() => {
    if (!ref.current || mapRef.current) return
    let descartado = false

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
        },
        // Base de ruas alternativa (CARTO Voyager): nomes de praia/bairro para
        // o usuário se localizar. Gratuita, OSM, sem key.
        'carto-ruas': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
            'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          maxzoom: 19,
        },
      },
      layers: [
        { id: 'esri-satellite-layer', type: 'raster', source: 'esri-satellite',
          layout: { visibility: baseSatelite ? 'visible' : 'none' } },
        { id: 'carto-ruas-layer', type: 'raster', source: 'carto-ruas',
          layout: { visibility: baseSatelite ? 'none' : 'visible' } },
      ],
      glyphs: GLYPHS,
    }

    // Onde abrir. Antes eram duas coordenadas fixas de Itanhaém/SP, e quem
    // entrava de Tramandaí ou de Imbituba via a costa paulista. A ordem de
    // certeza está explicada em lib/regiao.ts; aqui só se aplica.
    const salva = (() => {
      try { return lerPosicao(localStorage.getItem(CHAVE_POSICAO)) } catch { return null }
    })()

    // Palpite pelo perfil. NÃO dá para calcular aqui e esquecer: quando o mapa
    // nasce, nem os picos nem a cidade do perfil chegaram da rede ainda —
    // calcular agora dá null sempre. Quem aplica é o efeito reativo lá embaixo;
    // aqui só se registra que ainda falta descobrir a região.
    const regiaoPerfil = localDaCidade(cidadeRef.current, [
      ...picosRef.current, ...dadosRef.current.alertas, ...dadosRef.current.mutiroes,
    ])
    faltaRegiao.current = !salva

    // Voo cinematográfico (1ª abertura da sessão): o mapa nasce mostrando o
    // Brasil inteiro com os pontos da rede acesos e, quando o GPS responde,
    // voa até a praia do usuário — "isso é uma rede nacional, e você é parte".
    // Quem já tem posição guardada não passa por isso: já sabemos a região
    // dele, e repetir o sobrevoo do país a cada sessão vira pedágio.
    const vooIntro = !salva && (() => {
      try { return !sessionStorage.getItem('ecosurf.voo-intro') } catch { return false }
    })()
    if (vooIntro) { try { sessionStorage.setItem('ecosurf.voo-intro', '1') } catch { /* privado */ } }

    // Sem nada em que se apoiar, o Brasil inteiro — honesto, e ainda diz que
    // isto é uma rede nacional. Mostrar São Paulo para quem está no Sul é só
    // estar errado com confiança.
    const abertura: Local = salva ?? (vooIntro ? BRASIL : (regiaoPerfil ?? BRASIL))

    const map = new maplibregl.Map({
      container: ref.current,
      style: estiloSatelite,
      center: [abertura.lng, abertura.lat],
      zoom: abertura.zoom ?? (salva ? 12 : regiaoPerfil ? 11 : BRASIL.zoom!),
      attributionControl: false,
    })

    // Guarda onde a pessoa parou. `lerPosicao` recusa zoom de país, então o
    // sobrevoo de abertura não se grava como se fosse a região dela.
    let ultimoGravado = 0
    map.on('moveend', () => {
      const agora = Date.now()
      if (agora - ultimoGravado < 1500) return
      ultimoGravado = agora
      try {
        const c = map.getCenter()
        localStorage.setItem(CHAVE_POSICAO, gravarPosicao({ lng: c.lng, lat: c.lat, zoom: map.getZoom() }))
      } catch { /* modo privado ou cota cheia: o mapa não depende disso */ }
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
      trackUserLocation: true,
      showAccuracyCircle: false,
      // O controle tem câmera própria: alinhamos com a nossa intenção de
      // aproximação para os dois não brigarem no toque do botão.
      fitBoundsOptions: { maxZoom: 15.5 },
    })
    map.addControl(geolocate, 'top-right')

    // Alternador satélite/ruas como CONTROLE nativo do MapLibre: entra no mesmo
    // grupo top-right, logo abaixo do GPS, herdando medida e estilo dos demais
    // botões (29px, quadrado). Ícone de mapa — intuitivo, dispensa rótulo.
    const controleBase: maplibregl.IControl = {
      onAdd: () => {
        const div = document.createElement('div')
        div.className = 'maplibregl-ctrl maplibregl-ctrl-group'
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.setAttribute('aria-label', 'Alternar satélite e mapa de ruas')
        btn.style.cssText = 'display:flex;align-items:center;justify-content:center;'
        btn.innerHTML = ICONE_MAPA_SVG
        btn.addEventListener('click', () => setBaseSatelite((v) => !v))
        div.appendChild(btn)
        controleBaseBtnRef.current = btn
        return div
      },
      onRemove: () => { controleBaseBtnRef.current = null },
    }
    map.addControl(controleBase, 'top-right')
    map.on('error', () => {})
    mapRef.current = map

    // FIX mapa preto/cortado: quando o container muda de tamanho (ex.: entrar
    // no grid de dashboard, sidebar abrir, janela redimensionar), o MapLibre
    // mantém as dimensões antigas e renderiza só uma fatia. O ResizeObserver
    // força o recálculo. É a diferença entre o mapa cheio e o mapa quebrado.
    const container = ref.current
    let ro: ResizeObserver | null = null
    if (container && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => {
        requestAnimationFrame(() => { try { map.resize() } catch { /* mapa já destruído */ } })
      })
      ro.observe(container)
    }
    // resize extra logo após o load, cobrindo o primeiro paint no dashboard
    map.on('load', () => { setTimeout(() => { try { map.resize() } catch { /**/ } }, 60) })

    // GPS com DONO ÚNICO: o voo de abertura reusa o próprio GeolocateControl
    // em vez de um getCurrentPosition paralelo. No iOS, dois consumidores de
    // geolocalização disputavam o recurso e o toque no botão era sorteado —
    // daí a intermitência. Agora há uma só fonte de verdade: o controle.
    let vooCancelado = false

    /**
     * ABERTURA: enquadra a REGIÃO, não o ponto.
     *
     * Pousar colado no usuário mostra um pino solitário e esconde o que o app
     * tem de melhor: os picos ao redor. Aqui o mapa abre sobre a cidade e, se
     * houver picos por perto, enquadra todos eles — a pessoa vê de cara que há
     * surf na sua região. A aproximação fica para quem pedir (o botão de GPS).
     */
    const enquadrarRegiao = (lng: number, lat: number, tentativa = 0) => {
      if (vooCancelado) return
      // Enquadrou: a região está resolvida, o palpite pelo perfil não entra mais.
      faltaRegiao.current = false
      // Corrida de partida: o GPS pode responder antes de os picos chegarem do
      // Supabase. Em vez de cair no fallback de cidade, espera um pouco — é o
      // enquadramento regional que dá sentido à abertura.
      if (picosRef.current.length === 0 && tentativa < 6) {
        setTimeout(() => enquadrarRegiao(lng, lat, tentativa + 1), 350)
        return
      }
      const RAIO_KM = 30
      const perto = picosRef.current.filter(
        (p) => distanciaKm(lat, lng, p.lat, p.lng) <= RAIO_KM,
      )
      const suave = !document.documentElement.dataset.reduzAnimacao

      if (perto.length >= 1) {
        const bounds = new maplibregl.LngLatBounds([lng, lat], [lng, lat])
        for (const p of perto) bounds.extend([p.lng, p.lat])
        map.fitBounds(bounds, {
          padding: { top: 90, bottom: 130, left: 50, right: 50 },
          maxZoom: 13,   // nunca cola demais: o contexto é o produto
          duration: suave ? (vooIntro ? 3400 : 1200) : 0,
          essential: true,
        })
        return
      }
      // Sem picos por perto: pousa em nível de cidade mesmo assim.
      map.flyTo({
        center: [lng, lat],
        zoom: 11,
        ...(suave
          ? (vooIntro ? { duration: 3400, curve: 1.6 } : { speed: 1.4 })
          : { duration: 0 }),
        essential: true,
      })
    }

    /** TOQUE NO BOTÃO DE GPS: aí sim, aproxima de verdade. */
    const aproximarDoUsuario = (lng: number, lat: number) => {
      map.flyTo({
        center: [lng, lat],
        zoom: 15.5,
        ...(document.documentElement.dataset.reduzAnimacao
          ? { duration: 0 }
          : { speed: 1.4, curve: 1.4 }),
        essential: true,
      })
    }

    // A abertura NÃO liga o controle de GPS. O botão nasce DESATIVADO, sempre
    // — regra de produto. Para abrir "sobre a cidade", fazemos UMA leitura
    // passiva de posição (getCurrentPosition não acende o botão nem entra em
    // modo seguir), e só se a permissão JÁ foi concedida — sem prompt novo.
    // O trigger() do controle (que ativa o rastreamento com câmera própria)
    // fica reservado a: toque humano no botão, ou preferência explícita
    // "voar até minha localização" ligada.
    geolocate.on('geolocate', (e: { coords: { longitude: number; latitude: number } }) => {
      // Eventos aqui só chegam com o controle ATIVADO (toque no botão ou
      // preferência ligada). A aproximação usa nossa animação; o lock do
      // controle converge no mesmo zoom, sem briga de câmera.
      if (pediuAproximar.current) {
        pediuAproximar.current = false
        aproximarDoUsuario(e.coords.longitude, e.coords.latitude)
      }
    })
    /**
     * O GPS não respondeu (negado, sem sinal, sem permissão).
     *
     * Antes isto voava para Itanhaém/SP — a coordenada estava fixa no código,
     * então TODO usuário sem GPS aterrissava na costa paulista. Agora só se
     * mexe se houver um palpite de verdade; sem palpite, o mapa fica no Brasil
     * inteiro, que é o que de fato sabemos.
     */
    const semGps = () => {
      if (!regiaoPerfil) return
      enquadrarRegiao(regiaoPerfil.lng, regiaoPerfil.lat)
    }

    geolocate.on('error', semGps)

    // O toque no botão do controle marca a intenção de APROXIMAR. (O trigger
    // programático da abertura não passa por aqui — só o clique humano.)
    const botaoGeo = map.getContainer().querySelector<HTMLButtonElement>(
      '.maplibregl-ctrl-geolocate',
    )
    // Dedo no botão de GPS: a pessoa disse onde quer estar, palpite encerrado.
    const aoTocarGeo = () => { pediuAproximar.current = true; vooCancelado = true; faltaRegiao.current = false }
    botaoGeo?.addEventListener('click', aoTocarGeo)

    if ('geolocation' in navigator) {
      map.once('load', () => {
        if (descartado) return
        setTimeout(() => {
          if (descartado || vooCancelado) return
          // Preferência explícita ligada: aí sim ativa o controle (rastreio +
          // aproximação), como o usuário pediu ao ligar a opção.
          if (voarAteMinhaLocalizacaoAtivo()) {
            pediuAproximar.current = true
            faltaRegiao.current = false
            try { geolocate.trigger() } catch { /* iOS pode exigir gesto */ }
            return
          }
          // Padrão: botão de GPS permanece DESATIVADO. Para abrir na cidade,
          // uma leitura única e silenciosa — e só se a permissão já existe
          // (sem prompt na cara do usuário; o prompt fica para o toque no botão).
          const lerUmaVez = () => {
            navigator.geolocation.getCurrentPosition(
              (pos) => { if (!descartado && !vooCancelado) enquadrarRegiao(pos.coords.longitude, pos.coords.latitude) },
              semGps,
              { enableHighAccuracy: false, timeout: 6000, maximumAge: 600000 },
            )
          }
          if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'geolocation' as PermissionName })
              .then((st) => {
                if (st.state === 'granted') { faltaRegiao.current = false; lerUmaVez() }
                else semGps()
              })
              .catch(() => lerUmaVez())
          } else {
            lerUmaVez()
          }
        }, 300)
      })
      // Se o usuário mexer antes do GPS responder, respeita e cancela o voo.
      // Mexeu no mapa antes de decidirmos: respeita e não voa mais para lugar nenhum.
      map.once('dragstart', () => { vooCancelado = true; faltaRegiao.current = false })
      map.once('zoomstart', () => { vooCancelado = true; faltaRegiao.current = false })
    } else if (vooIntro) {
      setTimeout(semGps, 1600)
    }

    enquadrarRef.current = enquadrarRegiao

    /**
     * "Tem alguma coisa mapeada aqui?"
     *
     * Conta os pontos dentro do enquadramento a partir dos DADOS, não do que o
     * MapLibre desenhou — assim o filtro por tipo não confunde "esta região
     * está vazia" com "escondi o que havia". Só depois, se a área tem pontos e
     * mesmo assim nada aparece, é o filtro que está falando.
     */
    const conferirVazio = () => {
      if (!prontoRef.current) return
      const d = dadosRef.current
      // Ainda sem dado nenhum (rede em curso): calado, não é hora de convidar.
      if (d.picos.length + d.alertas.length + d.mutiroes.length === 0) { setVazio(null); return }

      const area = map.getBounds()
      const dentro = (lng?: number | null, lat?: number | null) =>
        lng != null && lat != null && area.contains([lng, lat])

      const naArea =
        d.picos.filter((p) => dentro(p.lng, p.lat)).length +
        d.alertas.filter((a) => dentro(a.lng, a.lat)).length +
        d.mutiroes.filter((m) => dentro(m.lng, m.lat)).length

      if (naArea === 0) { setVazio('regiao'); return }

      const camadas = ['pontos-icone', 'clusters'].filter((l) => map.getLayer(l))
      const desenhados = camadas.length ? map.queryRenderedFeatures({ layers: camadas }).length : 0
      setVazio(desenhados === 0 ? 'filtro' : null)
    }
    // `idle` e não `moveend`: só quando o mapa parou de se mexer E terminou de
    // desenhar. Em moveend a conta pegaria o meio do voo e piscaria o convite.
    map.on('idle', conferirVazio)

    function aplicar() {
      const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined
      if (src) src.setData(colecao(dadosRef.current))
    }

    map.on('load', async () => {
      // As duas em paralelo: os ícones são locais, a checagem de fonte é rede.
      const [, comTexto] = await Promise.all([carregarIcones(map), temGlyphs()])
      if (descartado) return

      map.addSource(SRC, {
        type: 'geojson',
        data: colecao(dadosRef.current),
        // Agrupamento (manual §7.3): muitos pinos próximos viram uma bolha
        // com contagem; o zoom abre. Evita sobreposição em visão afastada.
        cluster: true,
        clusterRadius: 46,
        clusterMaxZoom: 11,
      })

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SRC,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#2E9BD6', 10, '#0E7FA8', 25, '#0B5E7C'],
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 21, 25, 26],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })
      // Sem fonte, camada de texto nenhuma entra — senão o MapLibre não
      // desenha nem os pinos e o mapa fica vazio. Ver `temGlyphs()` em pins.ts.
      if (comTexto) map.addLayer({
        id: 'cluster-count',
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
      map.on('click', 'clusters', async (e) => {
        const f = e.features?.[0]
        const clusterId = f?.properties?.cluster_id as number | undefined
        const srcC = map.getSource(SRC) as maplibregl.GeoJSONSource
        if (clusterId == null || !srcC) return
        try {
          const zoom = await srcC.getClusterExpansionZoom(clusterId)
          const [lng, lat] = (f!.geometry as GeoJSON.Point).coordinates
          map.easeTo({ center: [lng, lat], zoom })
        } catch { /* expandir falhou: usuário pode dar zoom manual */ }
      })
      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = '' })

      map.addLayer({
        id: 'pontos-icone',
        type: 'symbol',
        source: SRC,
        layout: {
          'icon-image': EXPRESSAO_ICONE as unknown as maplibregl.ExpressionSpecification,
          'icon-size': [
            'interpolate', ['linear'], ['zoom'],
            5, 0.45,
            8, 0.55,
            10, 0.7,
            12, 0.85,
            14, 1.0,
            17, 1.15,
          ],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-anchor': 'bottom',
        },
      })

      if (comTexto) map.addLayer({
        id: 'pico-labels',
        type: 'symbol',
        source: SRC,
        filter: ['any', ['==', ['get', 'tipo'], 'pico'], ['==', ['get', 'tipo'], 'pico-ativo']],
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

      map.on('click', 'pontos-icone', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties as Record<string, unknown>
        if (p.tipo === 'pico' || p.tipo === 'pico-ativo') {
          const pico = dadosRef.current.picos.find((x) => x.id === p.id)
          if (pico && onSelRef.current) {
            onSelRef.current(pico)
            map.flyTo({ /* respeita 'reduzir animações' */
        ...(document.documentElement.dataset.reduzAnimacao ? { duration: 0 } : {}), center: [pico.lng, pico.lat], zoom: Math.max(map.getZoom(), 13), speed: 0.8 })
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

      map.on('mouseenter', 'pontos-icone', () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', 'pontos-icone', () => (map.getCanvas().style.cursor = ''))

      prontoRef.current = true
      aplicar()
    })

    return () => {
      descartado = true
      prontoRef.current = false
      ro?.disconnect()
      enquadrarRef.current = null
      botaoGeo?.removeEventListener('click', aoTocarGeo)
      map.remove()
      mapRef.current = null
    }
    // baseSatelite é lido só para a visibilidade INICIAL das camadas; a troca
    // em runtime é feita por effect próprio (setLayoutProperty) sem recriar o
    // mapa. Incluí-la aqui recriaria o mapa a cada toque no botão — indesejado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // atualiza dados quando picos/alertas/mutiroes mudam
  useEffect(() => {
    const map = mapRef.current
    if (!map || !prontoRef.current) return
    const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined
    if (src) src.setData(colecao({ picos, alertas, mutiroes, ativos: ativosEfetivos }))
  }, [picos, alertas, mutiroes, ativosEfetivos])

  /**
   * Palpite de região pelo perfil — precisa ser reativo.
   *
   * Quando o mapa nasce, nem os picos nem a cidade do perfil voltaram da rede:
   * calcular ali dá null sempre, e foi o que fez o primeiro teste aterrissar no
   * meio do Brasil. Aqui a conta refaz a cada chegada de dado, e só age
   * enquanto `faltaRegiao` continua verdadeiro — o GPS concedido, o toque no
   * botão de localização e qualquer gesto no mapa desligam esse sinal, então o
   * palpite nunca passa por cima de algo mais certo nem do dedo do usuário.
   */
  useEffect(() => {
    if (!faltaRegiao.current) return
    const enquadrar = enquadrarRef.current
    if (!enquadrar) return
    const l = localDaCidade(cidadePerfil, [...picos, ...alertas, ...mutiroes])
    if (!l) return
    enquadrar(l.lng, l.lat) // ele próprio zera `faltaRegiao`
  }, [cidadePerfil, picos, alertas, mutiroes])

  // Voo comandado (menu territorial): escolheu a cidade, o mapa vai até ela.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !destino) return
    map.flyTo({ center: [destino.lng, destino.lat], zoom: destino.zoom ?? 12, speed: 1.6 })
  }, [destino])

  // Filtro INSTANTÂNEO por tipo (sem rebuild de dados)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !prontoRef.current) return
    const expr = filtroLayer(filtro)
    const semCluster: maplibregl.ExpressionSpecification = ['!', ['has', 'point_count']]
    map.setFilter('pontos-icone', expr ? ['all', semCluster, expr] : semCluster)
    // A camada de rótulos pode não existir (CDN de fontes fora) — sem esta
    // guarda, setFilter num layer inexistente derruba o filtro dos pinos.
    if (!map.getLayer('pico-labels')) return
    const picoVisivel = !filtro || filtro === 'tudo' || filtro === 'picos'
    if (picoVisivel) {
      map.setFilter('pico-labels', ['all', semCluster, ['any', ['==', ['get', 'tipo'], 'pico'], ['==', ['get', 'tipo'], 'pico-ativo']]])
    } else {
      map.setFilter('pico-labels', ['==', ['get', 'tipo'], '__none__'])
    }
  }, [filtro])

  const convite = vazio === 'regiao' ? CONVITES[filtro ?? 'tudo'] : null

  return (
    <div className={className} style={{ position: 'absolute', inset: 0, ...style }}>
      <div ref={ref} style={{ position: 'absolute', inset: 0, background: '#0a1929' }} />

      {/* Região sem nada mapeado: o vazio vira convite, não conclusão. */}
      {convite && (
        <div
          style={{
            position: 'absolute', zIndex: 4,
            left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(300px, 82%)', textAlign: 'center',
            background: 'rgba(10,25,41,.78)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,.16)', borderRadius: 16,
            padding: '18px 16px 16px',
            // O aviso não pode roubar o gesto de arrastar o mapa; só o botão
            // volta a receber toque.
            pointerEvents: 'none',
          }}
        >
          <IconMapPinPlus size={26} stroke={1.6} style={{ color: 'rgba(255,255,255,.9)' }} />
          <p style={{ margin: '7px 0 0', fontSize: 14.5, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
            {convite.titulo}
          </p>
          <p style={{ margin: '5px 0 0', fontSize: 12.5, lineHeight: 1.45, color: 'rgba(255,255,255,.76)' }}>
            {convite.corpo}
          </p>
          <button
            onClick={() => navRef.current(convite.para)}
            style={{
              pointerEvents: 'auto', marginTop: 12,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--turq, #1c8aad)', color: '#fff',
              border: 0, borderRadius: 999, padding: '9px 17px',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            {convite.botao}
          </button>
        </div>
      )}

      {/* Tem coisa aqui, mas o filtro escondeu — avisar sem convidar a nada. */}
      {vazio === 'filtro' && (
        <div
          style={{
            position: 'absolute', zIndex: 4, pointerEvents: 'none',
            left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            background: 'rgba(10,25,41,.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,.14)', borderRadius: 12,
            padding: '9px 15px', maxWidth: '80%', textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,.86)', lineHeight: 1.4 }}>
            Nada deste tipo por aqui. Há outros registros nesta área — troque o filtro para ver.
          </p>
        </div>
      )}

      {atividade && atividade.length > 0 && (
        <div
          style={{
            position: 'absolute', zIndex: 3,
            ...(scrubberAncora === 'topo'
              ? { left: '50%', top: 10, transform: 'translateX(-50%)' }
              : scrubberAncora === 'rodape-esq'
                ? { left: 10, bottom: 12 }
                : { left: '50%', bottom: 12, transform: 'translateX(-50%)' }),
            background: 'rgba(28,32,36,.52)', backdropFilter: 'blur(9px)', WebkitBackdropFilter: 'blur(9px)',
            border: '1px solid rgba(255,255,255,.16)',
            borderRadius: 12, padding: '7px 14px 5px',
            width: scrubberAncora === 'topo' ? 'min(264px, 74%)' : scrubberAncora === 'rodape-esq' ? 'min(300px, 62%)' : 'min(340px, 78%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.85)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconCamera size={12} stroke={2} /> Fotos de onda:</span>
            <span className="dado" style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>
              {JANELAS[janelaIdx].h == null ? 'todas' : `últimas ${JANELAS[janelaIdx].rotulo}`}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={JANELAS.length - 1}
            step={1}
            value={janelaIdx}
            onChange={(e) => setJanelaIdx(Number(e.target.value))}
            aria-label="Janela de tempo das fotos de onda"
            style={{ width: '100%', accentColor: 'rgba(230,235,238,.92)', height: 4, display: 'block' }}
          />
          {/* escala fixa: guia o dedo e dá sentido às paradas */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            {JANELAS.map((j, i) => (
              <span
                key={j.curto}
                className="dado"
                onClick={() => setJanelaIdx(i)}
                style={{
                  fontSize: 8.5,
                  color: i === janelaIdx ? '#fff' : 'rgba(255,255,255,.55)',
                  fontWeight: i === janelaIdx ? 700 : 400,
                  cursor: 'pointer',
                  padding: '1px 2px',
                }}
              >
                {j.curto}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
