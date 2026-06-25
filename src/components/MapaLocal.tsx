import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

/**
 * Mini-mapa somente-leitura que mostra um pin fixo no local indicado.
 * Ideal para páginas de detalhe (mutirão, alerta, pico).
 */
export function MapaLocal({
  lat,
  lng,
  height = 180,
  label,
}: {
  lat: number
  lng: number
  height?: number
  label?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

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
      center: [lng, lat],
      zoom: 14,
      attributionControl: false,
      interactive: true,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    // Pin fixo
    const popup = label
      ? new maplibregl.Popup({ offset: 25, closeButton: false }).setText(label)
      : undefined

    const marker = new maplibregl.Marker({ color: '#FF8C42' })
      .setLngLat([lng, lat])
      .addTo(map)

    if (popup) marker.setPopup(popup).togglePopup()

    return () => {
      map.remove()
    }
  }, [lat, lng, label])

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height,
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid var(--line)',
      }}
    />
  )
}
