import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { IconSearch, IconMapPin, IconLoader2 } from '@tabler/icons-react'
import type { ResultadoGeocode } from '../services/geocoding'
import { centroInicial, CHAVE_POSICAO } from '../lib/regiao'

/**
 * Mini-mapa clicável para selecionar localização.
 * Permite: arrastar pin, clicar no mapa, ou buscar endereço por texto.
 * Geocoding via Photon/OSM (serviço em src/services/geocoding.ts) — gratuito,
 * sem API key, com busca tolerante a erros.
 */


export function MapaPicker({
  lat,
  lng,
  onChange,
  height = 200,
}: {
  lat?: number
  lng?: number
  onChange: (lat: number, lng: number) => void
  height?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)

  const [busca, setBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<ResultadoGeocode[]>([])
  /**
   * O que a última busca respondeu.
   *
   * Sem isto a tela só sabia mostrar resultados: busca sem achados e busca
   * que FALHOU eram a mesma caixa parada, e quem digitava concluía que a
   * busca não funciona — sem saber se o problema era o termo ou o serviço.
   */
  const [estadoBusca, setEstadoBusca] = useState<'ocioso' | 'vazio' | 'rede' | 'servico'>('ocioso')
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)

  /**
   * Onde o mapa abre quando ninguém escolheu ponto ainda.
   *
   * Era Santos, fixo. Quem registra de casa, no fluxo "não estou no local",
   * caía na Baixada Santista mesmo morando em outro estado — e ainda via um
   * pin plantado lá, parecendo uma escolha que não fez.
   *
   * A cadeia, do palpite mais forte para o mais honesto:
   *
   *   1. o ponto que já veio por prop (GPS da captura, edição de registro)
   *   2. a última posição que a pessoa olhou no mapa — o sinal mais barato
   *      que existe: não pede permissão nenhuma e já diz a região dela
   *   3. o GPS, pedido depois e sem travar a tela (ver o efeito adiante)
   *   4. o Brasil inteiro — assumir que não se sabe é melhor do que apontar
   *      para uma cidade qualquer com ar de certeza
   */
  const inicial = useMemo(() => {
    let gravada: string | null = null
    try {
      gravada = localStorage.getItem(CHAVE_POSICAO)
    } catch { /* localStorage bloqueado: cai no próximo palpite */ }
    return centroInicial(lat, lng, gravada)
    // Só na montagem: o mapa é imperativo e reposiciona pelo efeito de lat/lng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  /** Já existe um ponto escolhido? Só então o pin tem o que representar. */
  const temPonto = lat != null && lng != null

  // Geocoding via serviço Photon (OSM) — busca tolerante a erros e type-ahead.
  const buscarEndereco = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setResultados([])
      return
    }
    setBuscando(true)
    try {
      const { buscarLugar } = await import('../services/geocoding')
      // Viés para o ponto atual do pin, quando houver: resultados perto de onde
      // o usuário já está sobem na lista.
      const r = await buscarLugar(query, (lat && lng) ? { lat, lng } : undefined)
      if (!r.ok) {
        setResultados([])
        setEstadoBusca(r.motivo)
      } else {
        setResultados(r.resultados)
        setEstadoBusca(r.resultados.length > 0 ? 'ocioso' : 'vazio')
      }
      // A caixa abre mesmo sem resultado: é ela que carrega a explicação.
      setMostrarResultados(true)
    } catch {
      setResultados([])
      setEstadoBusca('rede')
      setMostrarResultados(true)
    } finally {
      setBuscando(false)
    }
  }, [lat, lng])

  // Debounce na busca
  function handleBuscaChange(val: string) {
    setBusca(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 3) {
      setResultados([])
      setEstadoBusca('ocioso')
      setMostrarResultados(false)
      return
    }
    debounceRef.current = setTimeout(() => buscarEndereco(val), 400)
  }

  function selecionarLocal(result: ResultadoGeocode) {
    const newLat = parseFloat(result.lat)
    const newLng = parseFloat(result.lon)
    onChange(newLat, newLng)

    // Move o mapa e o marker
    if (markerRef.current) {
      markerRef.current.setLngLat([newLng, newLat])
    }
    mapRef.current?.flyTo({ center: [newLng, newLat], zoom: 16, duration: 1200 })

    // Limpar resultados
    setBusca(result.display_name.split(',').slice(0, 2).join(','))
    setResultados([])
    setMostrarResultados(false)
  }

  // Fechar resultados ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMostrarResultados(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!ref.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {
          'esri-satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: '&copy; Esri',
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
      },
      center: [inicial.lng, inicial.lat],
      zoom: inicial.zoom ?? 12,
      attributionControl: false,
    })

    // Marker arrastável. Ele NASCE só quando existe ponto escolhido: um pin
    // no centro padrão parece uma marcação feita, e o botão de continuar
    // segue desabilitado pedindo para marcar o local — a tela se contradiz.
    const marker = new maplibregl.Marker({ color: '#1ECBC3', draggable: true })
    if (temPonto) marker.setLngLat([inicial.lng, inicial.lat]).addTo(map)

    marker.on('dragend', () => {
      const { lng: newLng, lat: newLat } = marker.getLngLat()
      onChange(newLat, newLng)
    })

    // Click no mapa: é aqui que o pin aparece pela primeira vez.
    map.on('click', (e) => {
      marker.setLngLat(e.lngLat).addTo(map)
      onChange(e.lngLat.lat, e.lngLat.lng)
    })

    mapRef.current = map
    markerRef.current = marker

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Atualiza marker quando lat/lng mudam externamente (ex: GPS, busca)
  useEffect(() => {
    if (markerRef.current && mapRef.current && lat != null && lng != null) {
      // `addTo` é idempotente: se o pin já está no mapa, só reposiciona.
      markerRef.current.setLngLat([lng, lat]).addTo(mapRef.current)
      mapRef.current.flyTo({ center: [lng, lat], zoom: 14, duration: 800 })
    }
  }, [lat, lng])

  /**
   * Sem ponto escolhido, tenta o GPS e leva o mapa até lá.
   *
   * Depois da montagem e sem travar nada: a tela já abriu no melhor palpite
   * síncrono, e isto só melhora a vista se a pessoa permitir. Não mexe no
   * pin — aproximar a câmera é ajudar a marcar, não marcar por ela.
   */
  useEffect(() => {
    if (temPonto || !navigator.geolocation) return
    let vivo = true
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!vivo || !mapRef.current) return
        mapRef.current.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          duration: 900,
        })
      },
      () => { /* recusou ou falhou: fica no palpite que já estava valendo */ },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    )
    return () => { vivo = false }
    // Só enquanto não há ponto; depois disso a câmera pertence à escolha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      {/* Barra de busca de endereço */}
      <div style={{ marginBottom: 10, position: 'relative' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--bg)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: '0 12px',
          transition: 'border-color .2s',
          ...(mostrarResultados ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderColor: 'var(--turq)' } : {}),
        }}>
          {buscando
            ? <IconLoader2 size={16} stroke={2} color="var(--turq)" style={{ animation: 'spin 1s linear infinite', flex: '0 0 auto' }} />
            : <IconSearch size={16} stroke={2} color="var(--muted)" style={{ flex: '0 0 auto' }} />
          }
          <input
            type="text"
            value={busca}
            onChange={(e) => handleBuscaChange(e.target.value)}
            onFocus={() => resultados.length > 0 && setMostrarResultados(true)}
            placeholder="Buscar endereço, praia ou cidade..."
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              flex: 1,
              padding: '10px 0',
              fontSize: 13,
              color: 'var(--text)',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Dropdown de resultados */}
        {/* A caixa também abre VAZIA, para explicar por quê. Um dropdown que
            simplesmente não aparece deixa a pessoa sem saber se o termo não
            existe, se o serviço caiu ou se o app está quebrado. */}
        {mostrarResultados && resultados.length === 0 && estadoBusca !== 'ocioso' && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
            background: 'var(--bg)', border: '1px solid var(--turq)', borderTop: 'none',
            borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
            padding: '12px 14px', boxShadow: '0 8px 24px rgba(0,0,0,.12)',
            fontSize: 12.5, lineHeight: 1.45, color: 'var(--muted)',
          }}>
            {estadoBusca === 'vazio' && <>Nada encontrado no Brasil para <b style={{ color: 'var(--text)' }}>{busca.trim()}</b>. Tente o nome da praia ou da cidade — ou marque direto no mapa.</>}
            {estadoBusca === 'rede' && <>Sem conexão para buscar agora. Você pode marcar o ponto direto no mapa.</>}
            {estadoBusca === 'servico' && <>A busca de endereços está indisponível no momento. Marque o ponto direto no mapa — o registro funciona igual.</>}
          </div>
        )}

        {mostrarResultados && resultados.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'var(--bg)',
            border: '1px solid var(--turq)',
            borderTop: 'none',
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,.12)',
          }}>
            {resultados.map((r, i) => (
              <button
                key={`${r.lat}-${r.lon}-${i}`}
                onClick={() => selecionarLocal(r)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 12.5,
                  lineHeight: 1.4,
                  color: 'var(--text)',
                  borderBottom: i < resultados.length - 1 ? '1px solid var(--line)' : 'none',
                  fontFamily: 'inherit',
                  transition: 'background .15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--line)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <IconMapPin size={14} stroke={2} color="var(--turq)" style={{ marginTop: 2, flex: '0 0 auto' }} />
                <span>{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mapa */}
      <div
        ref={ref}
        style={{
          width: '100%',
          height,
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid var(--line)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          background: 'rgba(0,0,0,.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 10,
          padding: '4px 10px',
          fontSize: 11,
          color: 'rgba(255,255,255,.85)',
          pointerEvents: 'none',
        }}
      >
        <IconMapPin size={13} stroke={2} style={{ verticalAlign: '-2px' }} /> Toque, arraste o pin ou busque o endereço
      </div>

      {/* Keyframe para spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
