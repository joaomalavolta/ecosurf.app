import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  IconMapPin, IconCalendar, IconUser, IconPhoto, IconAlertTriangle, IconHeartHandshake,
} from '@tabler/icons-react'
import { Header } from '../components/Header'
import { Photo } from '../components/Photo'
import { restPerfilPublico, restContribuicoesUsuario, type ContribsUsuario } from '../services/supabase/rest'
import { carregarPicos } from '../services/picos'
import { temBackend } from '../services/api'
import type { PerfilPublico, Pico } from '../types/domain'

const CATEGORIA_ROTULO: Record<string, string> = {
  'lixo-praia': 'Lixo na praia', 'lixo-rio': 'Lixo no rio', esgoto: 'Esgoto',
  erosao: 'Erosão', oleo: 'Óleo', animal: 'Animal', entulho: 'Entulho',
  microplasticos: 'Microplásticos', espuma: 'Espuma', queimada: 'Queimada',
  ocupacao: 'Ocupação irregular', outro: 'Outro',
}

function Metrica({ n, rotulo, Icone }: { n: number; rotulo: string; Icone: typeof IconPhoto }) {
  return (
    <div className="card pad" style={{ flex: 1, textAlign: 'center', minWidth: 90 }}>
      <Icone size={20} stroke={2} color="var(--turq)" style={{ marginBottom: 4 }} />
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{n}</div>
      <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{rotulo}</div>
    </div>
  )
}

export function UsuarioPage() {
  const { userId } = useParams<{ userId: string }>()
  const [perfil, setPerfil] = useState<PerfilPublico | null | undefined>(undefined)
  const [contribs, setContribs] = useState<ContribsUsuario | null>(null)
  const [picoMap, setPicoMap] = useState<Map<string, Pico>>(new Map())
  const [thumbs, setThumbs] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (!userId || !temBackend()) {
      setPerfil(null)
      return
    }
    restPerfilPublico(userId).then(setPerfil).catch(() => setPerfil(null))
    restContribuicoesUsuario(userId).then(async (c) => {
      setContribs(c)
      // Resolve as miniaturas em LOTE: preferir thumb, cair na foto cheia.
      const paths = c.fotos.map((f) => f.thumbPath ?? f.storagePath).filter((p): p is string => !!p)
      if (paths.length) {
        try {
          const { urlsAssinadas } = await import('../services/supabase/storage')
          setThumbs(await urlsAssinadas(paths))
        } catch { /* sem URLs: grade cai nos placeholders */ }
      }
    }).catch(() => setContribs(null))
    carregarPicos().then((ps) => setPicoMap(new Map(ps.map((p) => [p.id, p])))).catch(() => {})
  }, [userId])

  if (perfil === undefined) {
    return (
      <div className="page">
        <Header title="Perfil" sub="Carregando..." />
        <div className="page-pad" style={{ textAlign: 'center', paddingTop: 40 }}>
          <p className="muted">Carregando perfil...</p>
        </div>
      </div>
    )
  }

  if (perfil === null) {
    return (
      <div className="page">
        <Header title="Perfil" sub="Não encontrado" />
        <div className="page-pad" style={{ textAlign: 'center', paddingTop: 40 }}>
          <p className="muted">Este perfil não está disponível.</p>
        </div>
      </div>
    )
  }

  const dataEntrada = new Date(perfil.criadoEm).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const nomePico = (id: string) => picoMap.get(id)?.nome ?? 'pico'

  return (
    <div className="page">
      <Header title={perfil.nome ?? 'Usuário Ecosurf'} sub="Perfil público" />
      <div className="page-pad stack">
        {/* Avatar + nome */}
        <div className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {perfil.fotoUrl ? (
            <img src={perfil.fotoUrl} alt="" style={{ width: 72, height: 72, borderRadius: 22, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 22, background: 'var(--azul-medio)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 'bold' }}>
              {perfil.nome ? perfil.nome.charAt(0).toUpperCase() : <IconUser size={28} />}
            </div>
          )}
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{perfil.nome ?? 'Usuário'}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Nível: {perfil.nivel || "1 - Gota d'Água"}</div>
          </div>
        </div>

        {/* Métricas de contribuição */}
        {contribs && (
          <div style={{ display: 'flex', gap: 10 }}>
            <Metrica n={contribs.totalFotos} rotulo="fotos" Icone={IconPhoto} />
            <Metrica n={contribs.totalAlertas} rotulo="alertas" Icone={IconAlertTriangle} />
            <Metrica n={contribs.totalMutiroes} rotulo="mutirões" Icone={IconHeartHandshake} />
          </div>
        )}

        {/* Info */}
        <div className="card pad stack" style={{ gap: 12 }}>
          {perfil.cidade && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IconMapPin size={18} stroke={2} color="var(--turq)" />
              <span style={{ fontSize: 14 }}>{perfil.cidade}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconCalendar size={18} stroke={2} color="var(--turq)" />
            <span style={{ fontSize: 14 }}>Membro desde {dataEntrada}</span>
          </div>
        </div>

        {/* Fotos */}
        {contribs && contribs.fotos.length > 0 && (
          <div className="stack" style={{ gap: 10 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Fotos</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {contribs.fotos.map((f) => (
                <Link key={f.id} to={`/pico/${f.picoId}?foto=${f.id}`} style={{ aspectRatio: '1', borderRadius: 12, overflow: 'hidden', display: 'block' }}>
                  <Photo seed={f.id} url={thumbs.get(f.thumbPath ?? f.storagePath ?? '')} alt={`Foto em ${nomePico(f.picoId)}`} style={{ width: '100%', height: '100%' }} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Alertas */}
        {contribs && contribs.alertas.length > 0 && (
          <div className="stack" style={{ gap: 10 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Alertas ambientais</h3>
            {contribs.alertas.map((a) => (
              <Link key={a.id} to={`/alerta/${a.id}`} className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
                <IconAlertTriangle size={20} stroke={2} color="var(--sinal, #E84855)" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.titulo || CATEGORIA_ROTULO[a.categoria] || 'Alerta'}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {CATEGORIA_ROTULO[a.categoria] ?? a.categoria}{a.municipio ? ` · ${a.municipio}${a.uf ? `/${a.uf}` : ''}` : ''}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Mutirões */}
        {contribs && contribs.mutiroes.length > 0 && (
          <div className="stack" style={{ gap: 10 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Mutirões</h3>
            {contribs.mutiroes.map((m) => (
              <Link key={m.id} to={`/mutirao/${m.id}`} className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
                <IconHeartHandshake size={20} stroke={2} color="var(--turq)" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.titulo}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {m.tipoAcao ?? 'Mutirão'}{m.municipio ? ` · ${m.municipio}${m.uf ? `/${m.uf}` : ''}` : ''}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Sem contribuições */}
        {contribs && contribs.totalFotos === 0 && contribs.totalAlertas === 0 && contribs.totalMutiroes === 0 && (
          <div className="card pad" style={{ textAlign: 'center' }}>
            <p className="muted" style={{ fontSize: 13 }}>Ainda sem contribuições públicas.</p>
          </div>
        )}
      </div>
    </div>
  )
}
