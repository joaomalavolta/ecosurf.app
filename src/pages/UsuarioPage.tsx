import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { IconCheck, IconMessageCircle,
  IconMapPin, IconCalendar, IconUser, IconPhoto, IconAlertTriangle, IconHeartHandshake, IconPaw,
} from '@tabler/icons-react'
import { Header } from '../components/Header'
import { MenuDenunciaBloqueio } from '../components/MenuDenunciaBloqueio'
import { CardMapaContribuicoes } from '../components/CardMapaContribuicoes'
import { BotaoVerFotos } from '../components/BotaoVerFotos'
import { fotosVisiveis, gravarFotosVisiveis } from '../lib/verFotos'
import { Photo } from '../components/Photo'
import { restPerfilPublico, restContribuicoesUsuario, type ContribsUsuario } from '../services/supabase/rest'
import { carregarPicos } from '../services/picos'
import { temBackend } from '../services/api'
import type { PerfilPublico, Pico } from '../types/domain'


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
  const navigate = useNavigate()
  const [perfil, setPerfil] = useState<PerfilPublico | null | undefined>(undefined)
  const [seguindo, setSeguindo] = useState(false)
  const [meuId, setMeuId] = useState<string | null>(null)
  const [abrindoConversa, setAbrindoConversa] = useState(false)
  const [erroConversa, setErroConversa] = useState<string | null>(null)
  const [contribs, setContribs] = useState<ContribsUsuario | null>(null)
  const [picoMap, setPicoMap] = useState<Map<string, Pico>>(new Map())
  const [thumbs, setThumbs] = useState<Map<string, string>>(new Map())
  // Preferência de quem OLHA, não de quem é olhado — ver lib/verFotos.ts.
  const [verFotos, setVerFotos] = useState(fotosVisiveis)

  useEffect(() => {
    if (!userId) return
    import('../services/seguindo').then(({ carregarSeguindo }) =>
      carregarSeguindo().then((set) => setSeguindo(set.has(userId)))
    ).catch(() => {})
    import('../services/supabase/client').then(({ sb }) =>
      sb().auth.getSession().then(({ data }) => setMeuId(data.session?.user?.id ?? null))
    ).catch(() => {})
  }, [userId])

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
  const souOutraPessoa = !!meuId && !!userId && meuId !== userId

  /** Abre (ou recupera) a conversa 1:1 e leva para ela. */
  async function conversar() {
    if (!userId || abrindoConversa) return
    setAbrindoConversa(true)
    setErroConversa(null)
    try {
      const { abrirConversa } = await import('../services/mensagens')
      navigate(`/mensagens/${await abrirConversa(userId)}`)
    } catch (e) {
      setErroConversa(e instanceof Error ? e.message : 'Não foi possível abrir a conversa.')
      setAbrindoConversa(false)
    }
  }

  // Tem conteúdo, mas está escondido? É diferente de não ter conteúdo.
  const nAcoes = (contribs?.totalAlertas ?? 0) + (contribs?.totalPositivos ?? 0) + (contribs?.totalMutiroes ?? 0)
  const total = (contribs?.totalFotos ?? 0) + nAcoes
  const temAlgoVisivel =
    (perfil.mostrarFotos && (contribs?.totalFotos ?? 0) > 0) ||
    (perfil.mostrarAcoes && nAcoes > 0) ||
    (perfil.mostrarMapa && total > 0)
  const escondeuTudo = total > 0 && !temAlgoVisivel
  const temFotos = !!contribs && perfil.mostrarFotos && contribs.fotos.length > 0

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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{perfil.nome ?? 'Usuário'}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Nível: {perfil.nivel || "1 - Gota d'Água"}</div>
          </div>
        </div>

        {/* Ações sobre a pessoa — seguir e conversar em pé de igualdade. */}
        {souOutraPessoa && (
          <div className="stack" style={{ gap: 6 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={seguindo ? 'btn outline' : 'btn acento'}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  import('../services/seguindo').then(({ toggleSeguir }) => setSeguindo(toggleSeguir(userId!)))
                }}
              >
                {seguindo ? <><IconCheck size={15} stroke={2} /> Seguindo</> : '+ Seguir'}
              </button>
              <button
                className="btn outline"
                style={{ flex: 1, justifyContent: 'center', gap: 6 }}
                onClick={conversar}
                disabled={abrindoConversa}
              >
                <IconMessageCircle size={16} stroke={2} />
                {abrindoConversa ? 'Abrindo…' : 'Mensagem'}
              </button>
              {/* Bloquear/denunciar também aqui: nem sempre há conversa aberta. */}
              <span style={{ display: 'grid', placeItems: 'center' }}>
                <MenuDenunciaBloqueio alvoId={userId!} alvoNome={perfil.nome ?? null} variante="corpo" />
              </span>
            </div>
            {erroConversa && (
              <p style={{ color: 'var(--coral)', fontSize: 12.5, margin: 0 }}>{erroConversa}</p>
            )}
          </div>
        )}

        {/* Métricas de contribuição. Quatro em 360 px: `flexWrap` deixa a
            quarta descer em vez de espremer todas abaixo do legível. */}
        {contribs && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Metrica n={contribs.totalFotos} rotulo="fotos" Icone={IconPhoto} />
            <Metrica n={contribs.totalAlertas} rotulo="alertas" Icone={IconAlertTriangle} />
            <Metrica n={contribs.totalPositivos} rotulo="positivos" Icone={IconPaw} />
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

        {/* O território desta pessoa — vem antes das listas porque um mapa
            conta em dois segundos o que a lista leva um scroll para dizer. */}
        {userId && perfil.mostrarMapa && (
          <CardMapaContribuicoes
            tipo="usuario" id={userId} nome={perfil.nome}
            mostrarFotos={perfil.mostrarFotos} mostrarAcoes={perfil.mostrarAcoes}
            /* Sem a grade de fotos ocupando a tela, o mapa cresce — é o
               "destaque" que o botão de recolher promete. */
            altura={temFotos && !verFotos ? 360 : 260}
          />
        )}

        {/* Fotos */}
        {temFotos && (
          <div className="stack" style={{ gap: 10 }}>
            <div className="between" style={{ alignItems: 'center' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Fotos</h3>
              <BotaoVerFotos
                visiveis={verFotos}
                quantas={contribs!.fotos.length}
                onAlternar={() => { const v = !verFotos; setVerFotos(v); gravarFotosVisiveis(v) }}
              />
            </div>
            {verFotos && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {contribs.fotos.map((f) => (
                <Link key={f.id} to={`/pico/${f.picoId}?foto=${f.id}`} style={{ aspectRatio: '1', borderRadius: 12, overflow: 'hidden', display: 'block' }}>
                  <Photo seed={f.id} url={thumbs.get(f.thumbPath ?? f.storagePath ?? '')} alt={`Foto em ${nomePico(f.picoId)}`} style={{ width: '100%', height: '100%' }} />
                </Link>
              ))}
            </div>}
          </div>
        )}

        {/* Alertas e mutirões saíram daqui: agora estão na lista do card do
            mapa, onde tocar leva o mapa até o ponto. Mantê-los nos dois
            lugares seria a mesma coisa duas vezes na mesma rolagem. */}

        {/* Nada a mostrar. Duas razões diferentes, e confundir seria feio:
            quem escondeu não está "sem contribuições". */}
        {contribs && !temAlgoVisivel && (
          <div className="card pad" style={{ textAlign: 'center' }}>
            <p className="muted" style={{ fontSize: 13 }}>
              {escondeuTudo
                ? 'Esta pessoa preferiu não exibir suas publicações aqui.'
                : 'Ainda sem contribuições públicas.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
