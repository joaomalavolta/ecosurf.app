import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconSearch, IconRipple } from '@tabler/icons-react'
import { MapView } from '../map/MapView'
import { carregarPicos } from '../services/picos'
import type { Pico } from '../types/domain'

export function MapaPage() {
  const [picos, setPicos] = useState<Pico[]>([])

  useEffect(() => {
    let vivo = true
    carregarPicos().then((p) => vivo && setPicos(p))
    return () => {
      vivo = false
    }
  }, [])

  return (
    <div style={{ position: 'relative', height: '100dvh' }}>
      <MapView picos={picos} />

      {/* busca + filtros do território */}
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top,0px) + 12px)', left: 12, right: 12 }}>
        <div className="card pad" style={{ padding: 12 }}>
          <div
            style={{ background: 'var(--cinza)', borderRadius: 12, padding: 11, color: 'var(--muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <IconSearch size={16} stroke={2} /> Buscar praia, pico ou ameaça
          </div>
          <div className="pills" style={{ marginTop: 10 }}>
            <span className="pill active">Tudo</span>
            <span className="pill">Picos</span>
            <span className="pill">Ameaças</span>
            <span className="pill">Mutirões</span>
          </div>
        </div>
      </div>

      {/* card do pico em foco */}
      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 'calc(var(--altura-nav) + 14px)' }}>
        <div className="card pad row">
          <div
            style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--azul-claro)', color: 'var(--azul-abissal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}
          >
            <IconRipple size={26} stroke={2} />
          </div>
          <div style={{ flex: 1 }}>
            <b>Praia do Sonho</b>
            <div className="muted">Itanhaém/SP · radar ativo · 1 alerta ambiental</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Link to="/pico/praia-do-sonho" className="btn" style={{ minHeight: 42 }}>
                Abrir
              </Link>
              <Link to="/capturar" className="btn outline" style={{ minHeight: 42 }}>
                Registrar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
