import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  IconUsers, IconMapPin, IconShare2, IconSettings, IconAlertTriangle,
  IconSeeding, IconCheck, IconPlus,
} from '@tabler/icons-react'
import { Header } from '../components/Header'
import { SkeletonDetalhe } from '../components/Skeleton'
import { toast } from '../lib/toast'
import {
  carregarComunidade, meuPapel, seguirComunidade, deixarComunidade,
  type Comunidade, type PapelComunidade,
} from '../services/comunidades'
import { carregarAmeacas, carregarMutiroes } from '../services/picos'
import type { Alerta, Mutirao } from '../types/domain'

const ROTULO_CATEGORIA: Record<string, string> = {
  territorial: 'Territorial',
  ambiental: 'Ambiental',
  projeto: 'Projeto',
  escola: 'Escola de surf',
  coletivo: 'Coletivo',
  outro: 'Comunidade',
}

/**
 * Página da comunidade — capa larga, avatar sobreposto (o padrão que dá
 * "rosto" ao grupo), botão seguir e as publicações assinadas por ela.
 * Admins e autores veem o atalho para publicar; admins, o de gerenciar.
 */
export function ComunidadePage() {
  const { comunidadeId } = useParams<{ comunidadeId: string }>()
  const navigate = useNavigate()
  const [c, setC] = useState<Comunidade | null | undefined>(undefined)
  const [papel, setPapel] = useState<PapelComunidade | null>(null)
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [mutiroes, setMutiroes] = useState<Mutirao[]>([])
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    if (!comunidadeId) return
    let vivo = true
    carregarComunidade(comunidadeId).then((r) => vivo && setC(r))
    meuPapel(comunidadeId).then((p) => vivo && setPapel(p))
    carregarAmeacas().then((a) => vivo && setAlertas(a.filter((x) => x.comunidadeId === comunidadeId)))
    carregarMutiroes().then((m) => vivo && setMutiroes(m.filter((x) => x.comunidadeId === comunidadeId)))
    return () => { vivo = false }
  }, [comunidadeId])

  async function alternarSeguir() {
    if (!comunidadeId || ocupado) return
    setOcupado(true)
    try {
      if (papel) {
        if (papel === 'admin') {
          toast('Você administra esta comunidade — não é possível deixá-la.')
        } else {
          await deixarComunidade(comunidadeId)
          setPapel(null)
          setC((v) => v ? { ...v, membros: Math.max(0, v.membros - 1) } : v)
        }
      } else {
        await seguirComunidade(comunidadeId)
        setPapel('seguidor')
        setC((v) => v ? { ...v, membros: v.membros + 1 } : v)
        toast('Você agora segue esta comunidade.')
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível concluir.')
    } finally {
      setOcupado(false)
    }
  }

  function convidar() {
    const url = `${window.location.origin}/comunidade/${comunidadeId}`
    const texto = `Participe da comunidade ${c?.nome} no Ecosurf`
    if (navigator.share) {
      navigator.share({ title: c?.nome, text: texto, url }).catch(() => {})
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`, '_blank')
    }
  }

  if (c === undefined) {
    return <div className="page"><Header title="" /><SkeletonDetalhe /></div>
  }
  if (c === null) {
    return (
      <div className="page">
        <Header title="Comunidade" />
        <div className="page-pad">
          <p className="muted">Comunidade não encontrada.</p>
        </div>
      </div>
    )
  }

  const podePublicar = papel === 'admin' || papel === 'autor'

  return (
    <div className="page">
      <Header title={c.nome} />

      {/* Capa + avatar sobreposto */}
      <div style={{ position: 'relative', marginBottom: 46 }}>
        <div style={{
          height: 132,
          background: c.capaUrl
            ? `url('${c.capaUrl}') center/cover no-repeat`
            : 'linear-gradient(135deg, #0D6EA8, #2E9BD6)',
        }} />
        <div style={{
          position: 'absolute', left: 16, bottom: -38,
          width: 78, height: 78, borderRadius: 20,
          border: '3px solid var(--bg)',
          background: c.avatarUrl
            ? `url('${c.avatarUrl}') center/cover no-repeat`
            : 'linear-gradient(135deg, #0D6EA8, #2E9BD6)',
          display: 'grid', placeItems: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,.18)',
        }}>
          {!c.avatarUrl && <IconUsers size={30} stroke={1.8} color="#fff" />}
        </div>
      </div>

      <div className="page-pad" style={{ paddingTop: 0 }}>
        <div className="between" style={{ alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 20, margin: 0 }}>{c.nome}</h2>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 3, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge" style={{ background: 'color-mix(in srgb, var(--turq) 14%, transparent)', color: 'var(--turq)', fontWeight: 600 }}>
                {ROTULO_CATEGORIA[c.categoria] ?? 'Comunidade'}
              </span>
              {c.municipio && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <IconMapPin size={13} stroke={2} /> {c.municipio}{c.uf ? `/${c.uf}` : ''}
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <IconUsers size={13} stroke={2} /> {c.membros} {c.membros === 1 ? 'membro' : 'membros'}
              </span>
            </div>
          </div>
        </div>

        {c.descricao && (
          <p style={{ fontSize: 14, lineHeight: 1.55, marginTop: 12 }}>{c.descricao}</p>
        )}

        {/* Ações */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button
            className={papel && papel !== 'admin' ? 'btn outline' : 'btn acento'}
            onClick={alternarSeguir}
            disabled={ocupado || papel === 'admin'}
            style={{ flex: 1, minWidth: 130 }}
          >
            {papel === 'admin'
              ? <><IconSettings size={16} stroke={2} /> Você administra</>
              : papel
                ? <><IconCheck size={16} stroke={2} /> Seguindo</>
                : <><IconPlus size={16} stroke={2} /> Seguir</>}
          </button>
          <button className="btn outline" onClick={convidar} style={{ flex: 1, minWidth: 130 }}>
            <IconShare2 size={16} stroke={2} /> Convidar
          </button>
        </div>

        {papel === 'admin' && (
          <Link to={`/comunidade/${c.id}/gerenciar`} className="btn outline full" style={{ marginTop: 8 }}>
            <IconSettings size={16} stroke={2} /> Gerenciar comunidade
          </Link>
        )}
        {podePublicar && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn outline" style={{ flex: 1 }} onClick={() => navigate(`/nova-acao/alerta?comunidade=${c.id}`)}>
              <IconAlertTriangle size={15} stroke={2} /> Alerta
            </button>
            <button className="btn outline" style={{ flex: 1 }} onClick={() => navigate(`/nova-acao/mutirao?comunidade=${c.id}`)}>
              <IconUsers size={15} stroke={2} /> Mutirão
            </button>
          </div>
        )}

        {/* Publicações da comunidade */}
        <div style={{ marginTop: 22 }}>
          <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <IconSeeding size={13} stroke={2} /> Publicações da comunidade
          </span>

          {alertas.length === 0 && mutiroes.length === 0 ? (
            <div className="card pad" style={{ textAlign: 'center', padding: '26px 18px', marginTop: 10 }}>
              <IconSeeding size={28} stroke={1.7} style={{ color: 'var(--turq)', marginBottom: 8 }} />
              <p style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>Nada publicado ainda</p>
              <p className="muted" style={{ fontSize: 13 }}>
                {podePublicar
                  ? 'Registre um alerta ou crie um mutirão em nome da comunidade.'
                  : 'Quando a comunidade publicar, aparece aqui.'}
              </p>
            </div>
          ) : (
            <div className="stack" style={{ marginTop: 10 }}>
              {alertas.map((a) => (
                <Link key={a.id} to={`/alerta/${a.id}`} className="card pad" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <IconAlertTriangle size={20} stroke={2} style={{ color: '#E8734A', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.titulo}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{a.municipio ?? ''}{a.uf ? `/${a.uf}` : ''}</div>
                  </div>
                </Link>
              ))}
              {mutiroes.map((m) => (
                <Link key={m.id} to={`/mutirao/${m.id}`} className="card pad" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <IconUsers size={20} stroke={2} style={{ color: '#2E9B6B', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.titulo}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{m.municipio}{m.uf ? `/${m.uf}` : ''} · {m.quando}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
