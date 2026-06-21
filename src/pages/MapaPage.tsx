import { Link } from 'react-router-dom'
import { MapView } from '../map/MapView'
import { listarPicos } from '../services/picos'

export function MapaPage() {
  return (
    <div style={{ position: 'relative', height: '100dvh' }}>
      <MapView picos={listarPicos()} />

      {/* busca + filtros do território */}
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top,0px) + 12px)', left: 12, right: 12 }}>
        <div className="card pad" style={{ padding: 12 }}>
          <div
            style={{ background: 'var(--areia-clara)', borderRadius: 12, padding: 11, color: 'var(--muted)', fontSize: 13 }}
          >
            🔎 Buscar praia, pico ou ameaça
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
            style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--areia)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flex: '0 0 auto' }}
          >
            🌊
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
