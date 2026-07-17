import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { IconSearch, IconMapPin, IconLoader2 } from '@tabler/icons-react'

/**
 * Mini-mapa clicável para selecionar localização.
 * Permite: arrastar pin, clicar no mapa, ou buscar endereço por texto.
 * Geocoding via Nominatim (OpenStreetMap) — gratuito, sem API key.
 */

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
}

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
  const [resultados, setResultados] = useState<NominatimResult[]>([])
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)

  // Lat/lng padrão (São Paulo/litoral) se GPS não disponível
  const defaultLat = lat ?? -23.96
  const defaultLng = lng ?? -46.33

  // Geocoding via Nominatim
  const buscarEndereco = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setResultados([])
      return
    }
    setBuscando(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?email=ecosurf%40ecosurf.org.br&format=json&q=${encodeURIComponent(query)}&countrycodes=br&limit=5&addressdetails=0`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      )
      const data: NominatimResult[] = await res.json()
      setResultados(data)
      setMostrarResultados(data.length > 0)
    } catch {
      setResultados([])
    } finally {
      setBuscando(false)
    }
  }, [])

  // Debounce na busca
  function handleBuscaChange(val: string) {
    setBusca(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 3) {
      setResultados([])
      setMostrarResultados(false)
      return
    }
    debounceRef.current = setTimeout(() => buscarEndereco(val), 400)
  }

  function selecionarLocal(result: NominatimResult) {
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
      center: [defaultLng, defaultLat],
      zoom: 14,
      attributionControl: false,
    })

    // Marker arrastável
    const marker = new maplibregl.Marker({
      color: '#1ECBC3',
      draggable: true,
    })
      .setLngLat([defaultLng, defaultLat])
      .addTo(map)

    marker.on('dragend', () => {
      const { lng: newLng, lat: newLat } = marker.getLngLat()
      onChange(newLat, newLng)
    })

    // Click no mapa move o marker
    map.on('click', (e) => {
      marker.setLngLat(e.lngLat)
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

  // Atualiza marker quando lat/lng mudam externamente (ex: GPS)
  useEffect(() => {
    if (markerRef.current && lat != null && lng != null) {
      markerRef.current.setLngLat([lng, lat])
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, duration: 800 })
    }
  }, [lat, lng])

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
