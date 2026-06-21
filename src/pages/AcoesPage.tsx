import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { listarAmeacas } from '../services/picos'

/**
 * Hub único — Ameaças, Mutirões, Limpeza e Ciência viram SEÇÕES de uma
 * página rolável, não 4 telas escondidas atrás de um menu. Desincha a IA.
 */
function Linha({ icon, titulo, texto, to }: { icon: string; titulo: string; texto: string; to?: string }) {
  const inner = (
    <div className="card pad row">
      <div
        style={{ width: 50, height: 50, borderRadius: 16, background: 'var(--areia)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flex: '0 0 auto' }}
      >
        {icon}
      </div>
      <div>
        <b>{titulo}</b>
        <div className="muted">{texto}</div>
      </div>
    </div>
  )
  return to ? (
    <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
      {inner}
    </Link>
  ) : (
    inner
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="stack" style={{ marginTop: 4 }}>
      <h2 style={{ fontSize: 18, margin: '8px 2px 2px' }}>{titulo}</h2>
      {children}
    </section>
  )
}

export function AcoesPage() {
  const ameacas = listarAmeacas()
  return (
    <div className="page">
      <Header title="Ações" sub="Registrar, defender a costa, mobilizar e gerar dado." />
      <div className="page-pad stack">
        <Link to="/capturar" className="btn sol full" style={{ minHeight: 56, fontSize: 16 }}>
          📷 Registrar agora — 2 toques
        </Link>

        <Secao titulo="⚠️ Ameaças costeiras">
          {ameacas.map((a) => (
            <Linha key={a.id} icon="⚠️" titulo={a.titulo} texto={`${a.municipio}/${a.uf} · ${a.status} · localização ${a.precisao}`} />
          ))}
        </Secao>

        <Secao titulo="🤝 Mutirões">
          <Linha icon="🤝" titulo="Mutirão Praia dos Pescadores" texto="Sábado · 8h às 11h · 46 inscritos" />
          <Linha icon="🤝" titulo="Restinga Viva" texto="Domingo · Peruíbe · 22 vagas" />
        </Secao>

        <Secao titulo="🧴 Limpeza">
          <Linha icon="⚡" titulo="Modo rápido" texto="Peso, tempo, participantes e fotos." />
          <Linha icon="🔬" titulo="Modo científico" texto="Item por item, material e contagem." />
        </Secao>

        <Secao titulo="✨ Ciência cidadã">
          <Linha icon="💧" titulo="Qualidade visual da água" texto="Cor, odor, espuma, turbidez, sinais de esgoto." />
          <Linha icon="🐟" titulo="Fauna observada" texto="Ocorrências especiais e fauna impactada." />
          <Linha icon="🔭" titulo="Microplásticos" texto="Presença visual, área observada e evidência." />
        </Secao>
      </div>
    </div>
  )
}
