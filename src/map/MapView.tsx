import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useNavigate } from 'react-router-dom'
import type { Ameaca, Pico } from '../types/domain'

const WAVES =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M2 7c.6 .5 1.2 1 2.5 1c2.5 0 2.5 -2 5 -2c2.5 0 2.5 2 5 2c2.5 0 2.5 -2 5 -2"/>' +
  '<path d="M2 13c.6 .5 1.2 1 2.5 1c2.5 0 2.5 -2 5 -2c2.5 0 2.5 2 5 2c2.5 0 2.5 -2 5 -2"/></svg>'

const ALERTA =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"/><path d="M12 16h.01"/></svg>'

function pin(svg: string, cor: string): HTMLButtonElement {
  const el = document.createElement('button')
  el.innerHTML = svg
  el.style.cssText =
    `width:40px;height:40px;border-radius:999px;border:2px solid #fff;background:${cor};` +
    'display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(0,0,0,.3);cursor:pointer;'
  return el
}

/**
 * Mapa = território. Picos (azul) e ameaças (índigo) como camadas.
 * Estilo OpenFreeMap (sem chave); migrar a PMTiles auto-hospedado em produção.
 * Ameaça entra com coordenada GROSSEIRA (geom_aprox) — protege denunciante.
 */
export function MapView({ picos, ameacas = [] }: { picos: Pico[]; ameacas?: Ameaca[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    if (!ref.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: ref.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [-46.79, -24.19],
      zoom: 10.5,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('error', () => {})
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach((m) => m.remove())
    const novos: maplibregl.Marker[] = []

    for (const p of picos) {
      const el = pin(WAVES, '#1668A6')
      el.setAttribute('aria-label', p.nome)
      el.onclick = () => navigate(`/pico/${p.id}`)
      novos.push(new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map))
    }

    for (const a of ameacas) {
      if (a.lat == null || a.lng == null) continue
      const el = pin(ALERTA, '#3835A6')
      el.setAttribute('aria-label', `Ameaça: ${a.titulo}`)
      novos.push(new maplibregl.Marker({ element: el }).setLngLat([a.lng, a.lat]).addTo(map))
    }

    markersRef.current = novos
  }, [picos, ameacas, navigate])

  return <div ref={ref} style={{ position: 'absolute', inset: 0, background: '#cfe3e8' }} />
}
