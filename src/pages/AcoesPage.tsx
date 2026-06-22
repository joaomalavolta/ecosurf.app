import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ComponentType, ReactNode } from 'react'
import {
  IconCamera,
  IconAlertTriangle,
  IconHeartHandshake,
  IconBolt,
  IconFlask2,
  IconDroplet,
  IconFish,
  IconMicroscope,
  IconRecycle,
  type IconProps,
} from '@tabler/icons-react'
import { Header } from '../components/Header'
import { carregarAmeacas } from '../services/picos'
import type { Ameaca } from '../types/domain'

/**
 * Hub único — Ameaças, Mutirões, Limpeza e Ciência são SEÇÕES de uma página
 * rolável, não 4 telas escondidas atrás de um menu.
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

function Secao({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <section className="stack" style={{ marginTop: 4 }}>
      <h2 style={{ fontSize: 18, margin: '8px 2px 2px', display: 'flex', alignItems: 'center', gap: 8 }}>{titulo}</h2>
      {children}
    </section>
  )
}

export function AcoesPage() {
  const [ameacas, setAmeacas] = useState<Ameaca[]>([])
  useEffect(() => {
    let vivo = true
    carregarAmeacas().then((a) => vivo && setAmeacas(a))
    return () => {
      vivo = false
    }
  }, [])
  return (
    <div className="page">
      <Header title="Ações" sub="Registrar, defender a costa, mobilizar e gerar dado." />
      <div className="page-pad stack">
        <Link to="/capturar" className="btn acento full" style={{ minHeight: 56, fontSize: 16 }}>
          <IconCamera size={20} stroke={2} /> Registrar agora — 2 toques
        </Link>

        <Secao titulo={<><IconAlertTriangle size={19} stroke={2} color="var(--perigo)" /> Ameaças costeiras</>}>
          {ameacas.map((a) => (
            <Linha key={a.id} Icon={IconAlertTriangle} cor="var(--perigo)" titulo={a.titulo} texto={`${a.municipio}/${a.uf} · ${a.status} · localização ${a.precisao}`} />
          ))}
        </Secao>

        <Secao titulo={<><IconHeartHandshake size={19} stroke={2} /> Mutirões</>}>
          <Linha Icon={IconHeartHandshake} titulo="Mutirão Praia dos Pescadores" texto="Sábado · 8h às 11h · 46 inscritos" />
          <Linha Icon={IconHeartHandshake} titulo="Restinga Viva" texto="Domingo · Peruíbe · 22 vagas" />
        </Secao>

        <Secao titulo={<><IconRecycle size={19} stroke={2} /> Limpeza</>}>
          <Linha Icon={IconBolt} titulo="Modo rápido" texto="Peso, tempo, participantes e fotos." />
          <Linha Icon={IconFlask2} titulo="Modo científico" texto="Item por item, material e contagem." />
        </Secao>

        <Secao titulo={<><IconFlask2 size={19} stroke={2} /> Ciência cidadã</>}>
          <Linha Icon={IconDroplet} titulo="Qualidade visual da água" texto="Cor, odor, espuma, turbidez, sinais de esgoto." />
          <Linha Icon={IconFish} titulo="Fauna observada" texto="Ocorrências especiais e fauna impactada." />
          <Linha Icon={IconMicroscope} titulo="Microplásticos" texto="Presença visual, área observada e evidência." />
        </Secao>
      </div>
    </div>
  )
}
