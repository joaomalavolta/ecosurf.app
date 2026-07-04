import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
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
  IconEdit,
} from '@tabler/icons-react'
import { Header } from '../components/Header'
import { MapaLocal } from '../components/MapaLocal'
import { carregarMutiroes } from '../services/picos'
import { sb } from '../services/supabase/client'
import type { Mutirao } from '../types/domain'

interface Participante {
  user_id: string
  nome: string | null
  foto_url: string | null
}

export function MutiraoPage() {
  const { mutiraoId } = useParams<{ mutiraoId: string }>()
  const navigate = useNavigate()
  const [mutirao, setMutirao] = useState<Mutirao | null | undefined>(undefined)
  const [participando, setParticipando] = useState(false)
  const [jaParticipou, setJaParticipou] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [participantes, setParticipantes] = useState<Participante[]>([])

  useEffect(() => {
    sb().auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null)
    })
  }, [])

  useEffect(() => {
    carregarMutiroes().then((ms) => {
      const found = ms.find((m) => m.id === mutiraoId)
      setMutirao(found ?? null)
    })
    // Carregar participantes
    if (mutiraoId) {
      sb().from('mutirao_participantes_publicos')
        .select('user_id, nome, foto_url')
        .eq('mutirao_id', mutiraoId)
        .then(({ data }) => {
          if (data) setParticipantes(data as Participante[])
        })
    }
  }, [mutiraoId])

  // Verificar se o user já participou
  useEffect(() => {
    if (userId && participantes.length > 0) {
      setJaParticipou(participantes.some((p) => p.user_id === userId))
    }
  }, [userId, participantes])

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
      const session = await sb().auth.getSession()
      const user = session.data.session?.user
      if (!user) {
        alert('Faça login para participar.')
        setParticipando(false)
        return
      }

      const { error } = await sb()
        .rpc('inscrever_mutirao', { p_mutirao_id: mutirao.id })
      if (error) throw error

      setJaParticipou(true)
      setMutirao({ ...mutirao, inscritos: (mutirao.inscritos ?? 0) + 1 })

      // Adicionar o user à lista de participantes localmente
      const perfil = await sb().from('perfis').select('nome, foto_url').eq('id', user.id).single()
      setParticipantes((prev) => [
        ...prev,
        { user_id: user.id, nome: perfil.data?.nome ?? user.email ?? 'Voluntário', foto_url: perfil.data?.foto_url ?? null },
      ])
    } catch {
      alert('Erro ao participar. Tente novamente.')
    } finally {
      setParticipando(false)
    }
  }

  async function compartilhar() {
    if (!mutirao) return
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

  if (!mutirao) {
    return <div style={{ padding: 16 }}>Carregando...</div>
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
          {mutirao.organizador && (
            mutirao.autorId ? (
              <Link to={`/usuario/${mutirao.autorId}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <IconUser size={18} stroke={2} color="var(--turq)" style={{ marginTop: 2, flex: '0 0 auto' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="muted" style={{ fontSize: 11.5 }}>Organizador</div>
                    <div style={{ fontSize: 13.5, textDecoration: 'underline', textDecorationColor: 'var(--line)', textUnderlineOffset: 3 }}>
                      {mutirao.organizador} <span className="muted" style={{ fontSize: 11 }}>· ver perfil e seguir →</span>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <InfoLinha icon={IconUser} label="Organizador" value={mutirao.organizador} />
            )
          )}
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

        {/* Lista de participantes */}
        {participantes.length > 0 && (
          <div className="card pad" style={{ marginTop: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconUsers size={16} stroke={2} color="var(--turq)" /> Participantes ({participantes.length})
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {participantes.map((p) => (
                <div
                  key={p.user_id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    width: 64,
                  }}
                >
                  {p.foto_url ? (
                    <img
                      src={p.foto_url}
                      alt={p.nome ?? ''}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--turq)',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1ECBC3, #0D6EA8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 16,
                        fontWeight: 700,
                        border: '2px solid var(--turq)',
                      }}
                    >
                      {(p.nome ?? '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span
                    style={{
                      fontSize: 10.5,
                      textAlign: 'center',
                      lineHeight: 1.2,
                      color: 'var(--text)',
                      maxWidth: 64,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.nome?.split(' ')[0] ?? 'Voluntário'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão Editar (só para o criador) */}
        {userId && mutirao.autorId === userId && (
          <button className="btn outline full" onClick={() => navigate(`/mutirao/${mutiraoId}/editar`)} style={{ marginTop: 8 }}>
            <IconEdit size={16} /> Editar mutirão
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

