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
  IconShare,
  IconPhoto,
} from '@tabler/icons-react'
import { Header } from '../components/Header'
import { MapaLocal } from '../components/MapaLocal'
import { carregarMutiroes } from '../services/picos'
import { sb } from '../services/supabase/client'
import type { Mutirao } from '../types/domain'

export function MutiraoPage() {
  const { mutiraoId } = useParams<{ mutiraoId: string }>()
  const navigate = useNavigate()
  const [mutirao, setMutirao] = useState<Mutirao | null | undefined>(undefined)
  const [participando, setParticipando] = useState(false)
  const [jaParticipou, setJaParticipou] = useState(false)

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

  async function participar() {
    if (!mutirao || jaParticipou) return
    setParticipando(true)
    try {
      const { error } = await sb()
        .rpc('inscrever_mutirao', { p_mutirao_id: mutirao.id })
      if (error) {
        // Fallback: incrementar inscritos diretamente
        await sb()
          .from('mutiroes')
          .update({ inscritos: (mutirao.inscritos ?? 0) + 1 })
          .eq('id', mutirao.id)
      }
      setJaParticipou(true)
      setMutirao({ ...mutirao, inscritos: (mutirao.inscritos ?? 0) + 1 })
    } catch {
      alert('Erro ao participar. Tente novamente.')
    } finally {
      setParticipando(false)
    }
  }

  async function compartilhar() {
    const url = window.location.href
    const texto = `🌊 ${mutirao.titulo} — ${data}\n📍 ${mutirao.municipio}/${mutirao.uf}\n\nParticipe: ${url}`
    if (navigator.share) {
      try {
        await navigator.share({ title: mutirao.titulo, text: texto, url })
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(texto)
      alert('Link copiado!')
    }
  }

  return (
    <div className="page">
      <Header title={mutirao.titulo} sub={`${mutirao.municipio}/${mutirao.uf}`} />

      <div className="page-pad stack" style={{ paddingTop: 16, paddingBottom: 80 }}>
        {/* Imagem de capa */}
        {mutirao.imagemUrl ? (
          <div style={{ borderRadius: 14, overflow: 'hidden', height: 200 }}>
            <img src={mutirao.imagemUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{
            borderRadius: 14, height: 120,
            background: 'linear-gradient(135deg, #0D6EA820, #FF8C4220)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 6,
          }}>
            <IconPhoto size={32} stroke={1.5} color="var(--muted)" />
            <span className="muted" style={{ fontSize: 12 }}>Sem foto de capa</span>
          </div>
        )}

        {/* Status + Compartilhar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="tag" style={{
            background: mutirao.status === 'agendado' ? 'var(--tag-ok-bg)' : mutirao.status === 'realizado' ? 'var(--cinza)' : 'var(--tag-warn-bg)',
            color: mutirao.status === 'agendado' ? 'var(--tag-ok-fg)' : mutirao.status === 'realizado' ? 'var(--muted)' : 'var(--tag-warn-fg)',
          }}>
            {mutirao.status === 'agendado' ? '📅 Agendado' : mutirao.status === 'realizado' ? '✅ Realizado' : mutirao.status}
          </span>
          <button
            className="btn outline"
            onClick={compartilhar}
            style={{ fontSize: 12, padding: '6px 14px' }}
          >
            <IconShare size={15} /> Compartilhar
          </button>
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

        {/* Mapa do local */}
        {mutirao.lat != null && mutirao.lng != null && (
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconMapPin size={16} stroke={2} color="var(--turq)" /> Local no mapa
            </h3>
            <MapaLocal
              lat={mutirao.lat}
              lng={mutirao.lng}
              label={mutirao.pontoEncontro ?? mutirao.titulo}
              height={200}
            />
          </div>
        )}

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

        {/* Ação — Quero participar */}
        {mutirao.status === 'agendado' && (
          <button
            className="btn acento full"
            style={{ minHeight: 50, fontSize: 15, marginTop: 8 }}
            onClick={participar}
            disabled={participando || jaParticipou}
          >
            {jaParticipou ? '✅ Participação confirmada!' : participando ? 'Confirmando...' : '🙋 Quero participar'}
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

