import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useNavigate } from 'react-router-dom'
import type { Pico } from '../types/domain'

/**
 * Mapa = território (não decoração).
 *
 * Estilo: OpenFreeMap (tiles vetoriais do OSM, sem chave, sem cadastro) —
 * começa de graça e sem lock-in. Para produção, migrar para PMTiles
 * auto-hospedado (Planetiler → R2/Bunny): custo ~zero por requisição e
 * soberania de dados, alinhado a um projeto socioambiental.
 *
 * ⚠️ Localização de pico sensível precisa entrar com geometria fuzzy
 * (célula H3), nunca ponto exato — ver `visibilidade` no domínio.
 */
export function MapView({ picos }: { picos: Pico[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!ref.current) return
    const map = new maplibregl.Map({
      container: ref.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [-46.79, -24.19],
      zoom: 10.5,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('error', () => {
      /* não quebra a UI se o tile falhar (3G ruim / offline) */
    })

    const waves =
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M2 7c.6 .5 1.2 1 2.5 1c2.5 0 2.5 -2 5 -2c2.5 0 2.5 2 5 2c2.5 0 2.5 -2 5 -2"/>' +
      '<path d="M2 13c.6 .5 1.2 1 2.5 1c2.5 0 2.5 -2 5 -2c2.5 0 2.5 2 5 2c2.5 0 2.5 -2 5 -2"/></svg>'

    const markers: maplibregl.Marker[] = []
    for (const p of picos) {
      const el = document.createElement('button')
      el.setAttribute('aria-label', p.nome)
      el.innerHTML = waves
      el.style.cssText =
        'width:40px;height:40px;border-radius:999px;border:2px solid #fff;background:#1668A6;' +
        'display:flex;align-items:center;justify-content:center;' +
        'box-shadow:0 6px 14px rgba(0,0,0,.3);cursor:pointer;'
      el.onclick = () => navigate(`/pico/${p.id}`)
      markers.push(new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map))
    }

    return () => {
      markers.forEach((m) => m.remove())
      map.remove()
    }
  }, [picos, navigate])

  return <div ref={ref} style={{ position: 'absolute', inset: 0, background: '#cfe3e8' }} />
}
