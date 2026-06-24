import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

/**
 * Mini-mapa clicável para selecionar localização.
 * Renderiza um pin arrastável e dispara onChange(lat, lng) ao clicar/arrastar.
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

  // Lat/lng padrão (São Paulo/litoral) se GPS não disponível
  const defaultLat = lat ?? -23.96
  const defaultLng = lng ?? -46.33

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
    <div style={{ position: 'relative' }}>
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
        📍 Toque ou arraste o pin
      </div>
    </div>
  )
}
