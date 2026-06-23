import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ComponentType, ReactNode } from 'react'
import {
  IconCamera,
  IconAlertTriangle,
  IconHeartHandshake,
  IconPlus,
  type IconProps,
} from '@tabler/icons-react'
import { Header } from '../components/Header'
import { categoriaPorId } from '../components/SeletorCategoria'
import { carregarAmeacas, carregarMutiroes } from '../services/picos'
import type { Alerta, Mutirao } from '../types/domain'

/**
 * Hub de ações — Alertas, Mutirões e "+ Nova Ação".
 */
function Linha({
  Icon,
  titulo,
  texto,
  cor = 'var(--turq)',
  to,
}: {
  Icon: ComponentType<IconProps>
  titulo: string
  texto: string
  cor?: string
  to?: string
}) {
  const inner = (
    <div className="card pad row">
      <div
        style={{ width: 50, height: 50, borderRadius: 16, background: 'var(--cinza)', color: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}
      >
        <Icon size={24} stroke={2} />
      </div>
      <div style={{ flex: 1 }}>
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

function Secao({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <section className="stack" style={{ marginTop: 4 }}>
      <h2 style={{ fontSize: 18, margin: '8px 2px 2px', display: 'flex', alignItems: 'center', gap: 8 }}>{titulo}</h2>
      {children}
    </section>
  )
}

const STATUS_LABELS: Record<string, string> = {
  publicado: 'Publicado pela comunidade',
  'em-revisao': 'Em revisão',
  validado: 'Validado',
  sinalizado: 'Sinalizado',
  identificado: 'Publicado',
  'em-observacao': 'Em observação',
  recorrente: 'Recorrente',
  resolvido: 'Resolvido',
}

export function AcoesPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [mutiroes, setMutiroes] = useState<Mutirao[]>([])

  useEffect(() => {
    let vivo = true
    carregarAmeacas().then((a) => vivo && setAlertas(a))
    carregarMutiroes().then((m) => vivo && setMutiroes(m))
    return () => {
      vivo = false
    }
  }, [])

  return (
    <div className="page">
      <Header title="Ações" sub="Registrar, defender a costa e mobilizar." />
      <div className="page-pad stack">
        {/* Botões principais */}
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/capturar" className="btn acento full" style={{ minHeight: 50, fontSize: 14 }}>
            <IconCamera size={18} stroke={2} /> Foto rápida
          </Link>
          <Link to="/nova-acao" className="btn full" style={{ minHeight: 50, fontSize: 14, background: 'var(--azul-abissal)', color: '#fff' }}>
            <IconPlus size={18} stroke={2} /> Nova Ação
          </Link>
        </div>

        {/* Alertas Ambientais */}
        <Secao titulo={<><IconAlertTriangle size={19} stroke={2} color="var(--perigo)" /> Registros ambientais</>}>
          {alertas.length === 0 && <p className="muted">Nenhum registro ambiental no momento.</p>}
          {alertas.map((a) => {
            const cat = categoriaPorId(a.categoria)
            return (
              <Linha
                key={a.id}
                Icon={cat.icone}
                cor={cat.cor}
                titulo={a.titulo}
                texto={`${a.municipio}/${a.uf} · ${STATUS_LABELS[a.status] ?? a.status}`}
              />
            )
          })}
        </Secao>

        {/* Mutirões */}
        <Secao titulo={<><IconHeartHandshake size={19} stroke={2} color="#FF8C42" /> Mutirões</>}>
          {mutiroes.length === 0 && <p className="muted">Nenhum mutirão agendado no momento.</p>}
          {mutiroes.map((m) => (
            <Linha
              key={m.id}
              Icon={IconHeartHandshake}
              cor="#FF8C42"
              titulo={m.titulo}
              texto={`${m.municipio}/${m.uf} · ${m.horario ?? new Date(m.quando).toLocaleDateString('pt-BR')}${m.vagas ? ` · ${m.vagas} vagas` : ''}`}
            />
          ))}
        </Secao>
      </div>
    </div>
  )
}
