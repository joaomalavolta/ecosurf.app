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

    const markers: maplibregl.Marker[] = []
    for (const p of picos) {
      const el = document.createElement('button')
      el.setAttribute('aria-label', p.nome)
      el.textContent = '🌊'
      el.style.cssText =
        'width:40px;height:40px;border-radius:999px;border:2px solid #fff;background:var(--mar);' +
        'color:#fff;font-size:17px;display:flex;align-items:center;justify-content:center;' +
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
