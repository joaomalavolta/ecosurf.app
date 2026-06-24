import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconCalendar,
  IconMapPin,
  IconUser,
  IconUsers,
  IconPhone,
  IconBuilding,
  IconInfoCircle,
  IconArrowLeft,
} from '@tabler/icons-react'
import { Header } from '../components/Header'
import { carregarMutiroes } from '../services/picos'
import type { Mutirao } from '../types/domain'

export function MutiraoPage() {
  const { mutiraoId } = useParams<{ mutiraoId: string }>()
  const navigate = useNavigate()
  const [mutirao, setMutirao] = useState<Mutirao | null | undefined>(undefined)

  useEffect(() => {
    carregarMutiroes().then((ms) => {
      const found = ms.find((m) => m.id === mutiraoId)
      setMutirao(found ?? null)
    })
  }, [mutiraoId])

  if (mutirao === undefined) {
    return (
      <div className="page">
        <Header title="Mutirão" sub="Carregando..." />
        <div className="page-pad" style={{ textAlign: 'center' }}>
          <p className="muted">Carregando detalhes...</p>
        </div>
      </div>
    )
  }

  if (mutirao === null) {
    return (
      <div className="page">
        <Header title="Mutirão" sub="Não encontrado" />
        <div className="page-pad stack" style={{ textAlign: 'center', paddingTop: 40 }}>
          <p className="muted">Este mutirão não foi encontrado ou não está mais disponível.</p>
          <button className="btn outline" onClick={() => navigate('/acoes')}>
            <IconArrowLeft size={16} /> Voltar às ações
          </button>
        </div>
      </div>
    )
  }

  const data = mutirao.quando ? new Date(mutirao.quando).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'

  return (
    <div className="page">
      <Header title={mutirao.titulo} sub={`${mutirao.municipio}/${mutirao.uf}`} />

      <div className="page-pad stack" style={{ paddingTop: 16 }}>
        {/* Imagem de capa */}
        {mutirao.imagemUrl && (
          <div style={{ borderRadius: 14, overflow: 'hidden', height: 180 }}>
            <img src={mutirao.imagemUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        {/* Status */}
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="tag" style={{
            background: mutirao.status === 'agendado' ? 'var(--tag-ok-bg)' : mutirao.status === 'realizado' ? 'var(--cinza)' : 'var(--tag-warn-bg)',
            color: mutirao.status === 'agendado' ? 'var(--tag-ok-fg)' : mutirao.status === 'realizado' ? 'var(--muted)' : 'var(--tag-warn-fg)',
          }}>
            {mutirao.status === 'agendado' ? '📅 Agendado' : mutirao.status === 'realizado' ? '✅ Realizado' : mutirao.status}
          </span>
        </div>

        {/* Informações principais */}
        <div className="card pad stack" style={{ gap: 12 }}>
          <InfoLinha icon={IconCalendar} label="Data" value={`${data}${mutirao.horario ? ` · ${mutirao.horario}` : ''}`} />
          <InfoLinha icon={IconMapPin} label="Local" value={`${mutirao.municipio}/${mutirao.uf}${mutirao.pontoEncontro ? ` — ${mutirao.pontoEncontro}` : ''}`} />
          {mutirao.organizador && <InfoLinha icon={IconUser} label="Organizador" value={mutirao.organizador} />}
          {mutirao.instituicao && <InfoLinha icon={IconBuilding} label="Instituição" value={mutirao.instituicao} />}
          {mutirao.contato && <InfoLinha icon={IconPhone} label="Contato" value={mutirao.contato} />}
          {mutirao.vagas && <InfoLinha icon={IconUsers} label="Vagas" value={`${mutirao.inscritos ?? 0} / ${mutirao.vagas}`} />}
        </div>

        {/* Descrição */}
        {mutirao.descricao && (
          <div className="card pad">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Sobre o mutirão</h3>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>{mutirao.descricao}</p>
          </div>
        )}

        {/* Info voluntários */}
        {mutirao.infoVoluntarios && (
          <div className="card pad" style={{ background: '#FF8C4210', border: '1px solid #FF8C4230' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconInfoCircle size={16} /> Para voluntários
            </h3>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>{mutirao.infoVoluntarios}</p>
          </div>
        )}

        {/* Ação */}
        {mutirao.status === 'agendado' && (
          <button className="btn acento full" style={{ minHeight: 50, fontSize: 15, marginTop: 8 }}>
            🙋 Quero participar
          </button>
        )}

        <button className="btn outline full" onClick={() => navigate('/acoes')} style={{ marginTop: 8 }}>
          <IconArrowLeft size={16} /> Voltar às ações
        </button>
      </div>
    </div>
  )
}

function InfoLinha({ icon: Icon, label, value }: { icon: typeof IconCalendar; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <Icon size={18} stroke={2} color="var(--turq)" style={{ marginTop: 2, flex: '0 0 auto' }} />
      <div>
        <div className="muted" style={{ fontSize: 11.5 }}>{label}</div>
        <div style={{ fontSize: 13.5 }}>{value}</div>
      </div>
    </div>
  )
}
