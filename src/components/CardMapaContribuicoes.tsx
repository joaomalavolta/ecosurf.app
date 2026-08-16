import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconMap2, IconMapPin, IconCamera, IconAlertTriangle, IconUsers, IconLayoutGrid, IconChevronRight } from '@tabler/icons-react'
import type { ContribuicoesGeo } from '../services/contribuicoesGeo'
import type { FiltroContrib } from '../map/MapaContribuicoes'

/**
 * "O que essa pessoa mapeou?" — o card que responde, no perfil e na comunidade.
 *
 * Carrega os dados sozinho e some quando não há nada: perfil recém-criado não
 * ganha um retângulo escuro vazio dizendo "sem pontos". Quem não contribuiu
 * ainda simplesmente não tem este card.
 *
 * O MapLibre são 218 kB gzip — mais que o app inteiro. Por isso ele só é
 * baixado quando o card entra na tela, e o card fica lá embaixo nas duas
 * páginas. Quem abre um perfil para mandar mensagem e sai não paga por um
 * mapa que não viu.
 */

const MapaInterno = lazy(() =>
  import('../map/MapaContribuicoes').then((m) => ({ default: m.MapaContribuicoes })),
)

/**
 * Vira `true` na primeira vez que o elemento chega perto da tela.
 *
 * Devolve um ref de CALLBACK, não um `useRef`. Com useRef o efeito rodava no
 * mount, achava `ref.current` nulo (o card só entra no DOM depois que os dados
 * chegam da rede) e não voltava a rodar — o observer nunca observava nada e o
 * mapa ficava um retângulo escuro para sempre. Como o placeholder tem a mesma
 * cor do mapa, isso passaria por "os tiles não carregaram". O callback resolve
 * porque o React o chama com o nó no momento em que ele existe.
 */
function useVisivel(): [(el: HTMLElement | null) => void, boolean] {
  // Sem IntersectionObserver (navegador antigo), já nasce liberado: melhor um
  // download a mais do que um mapa que nunca aparece.
  const [visivel, setVisivel] = useState(() => !('IntersectionObserver' in window))
  const [no, setNo] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (!no || visivel) return
    const io = new IntersectionObserver(
      (entradas) => { if (entradas.some((e) => e.isIntersecting)) { setVisivel(true); io.disconnect() } },
      { rootMargin: '240px' },
    )
    io.observe(no)
    return () => io.disconnect()
  }, [no, visivel])
  return [setNo, visivel]
}

function Contagem({ n, rotulo, Icone }: { n: number; rotulo: string; Icone: typeof IconMapPin }) {
  if (n === 0) return null
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap',
      }}
    >
      <Icone size={13} stroke={2} /> <b style={{ color: 'var(--text)', fontWeight: 700 }}>{n}</b> {rotulo}
    </span>
  )
}

const plural = (n: number, um: string, muitos: string) => (n === 1 ? um : muitos)

export function CardMapaContribuicoes({
  tipo,
  id,
  nome,
  altura = 260,
  mostrarFotos = true,
  mostrarAcoes = true,
}: {
  tipo: 'usuario' | 'comunidade'
  id: string
  /** Primeiro nome de quem é o território — entra na legenda. */
  nome?: string | null
  altura?: number
  /**
   * O que o dono do perfil deixou visível. Cada chave vale para o conteúdo
   * ONDE QUER QUE ELE APAREÇA: esconder os alertas da lista e mantê-los
   * plotados aqui do lado seria privacidade de mentira. No próprio perfil não
   * se passa nada — você vê o que é seu.
   */
  mostrarFotos?: boolean
  mostrarAcoes?: boolean
}) {
  const [brutos, setBrutos] = useState<ContribuicoesGeo | null>(null)
  const [filtro, setFiltro] = useState<FiltroContrib>('tudo')
  const [foco, setFoco] = useState<{ id: string; lng: number; lat: number; toque: number } | null>(null)
  const [caixa, podeCarregarMapa] = useVisivel()

  useEffect(() => {
    if (!id) return
    let vivo = true
    import('../services/contribuicoesGeo')
      .then(({ contribuicoesGeoUsuario, contribuicoesGeoComunidade }) =>
        tipo === 'usuario' ? contribuicoesGeoUsuario(id) : contribuicoesGeoComunidade(id),
      )
      .then((c) => { if (vivo) setBrutos(c) })
      .catch(() => { if (vivo) setBrutos(null) })
    return () => { vivo = false }
  }, [tipo, id])

  // A escolha do dono corta os dados ANTES de qualquer contagem, senão os
  // botões prometeriam "Alertas 8" e o mapa entregaria nada.
  const dados: ContribuicoesGeo | null = brutos && {
    picosCriados: brutos.picosCriados,
    picosFotografados: mostrarFotos ? brutos.picosFotografados : [],
    alertas: mostrarAcoes ? brutos.alertas : [],
    mutiroes: mostrarAcoes ? brutos.mutiroes : [],
    total: brutos.picosCriados.length +
      (mostrarFotos ? brutos.picosFotografados.length : 0) +
      (mostrarAcoes ? brutos.alertas.length + brutos.mutiroes.length : 0),
  }

  // Sem pontos (ou ainda carregando): nada na tela. Ver o cabeçalho.
  if (!dados || dados.total === 0) return null

  const nTodosPicos = dados.picosCriados.length + dados.picosFotografados.length
  // Só entram as camadas que têm ponto. Com uma camada só, "Tudo" e ela seriam
  // o mesmo botão duas vezes — daí o `abas.length > 2` na hora de desenhar.
  const abas = ([
    { chave: 'tudo' as const, rotulo: 'Tudo', n: dados.total, Icone: IconLayoutGrid },
    { chave: 'picos' as const, rotulo: 'Picos', n: nTodosPicos, Icone: IconMapPin },
    { chave: 'alertas' as const, rotulo: 'Alertas', n: dados.alertas.length, Icone: IconAlertTriangle },
    { chave: 'mutiroes' as const, rotulo: 'Mutirões', n: dados.mutiroes.length, Icone: IconUsers },
  ]).filter((a) => a.n > 0)

  const dia = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''
  const lugar = (m?: string | null, uf?: string | null) => `${m ?? ''}${uf ? `/${uf}` : ''}`

  const itens = [
    ...(filtro === 'tudo' || filtro === 'alertas' ? dados.alertas.map((a) => ({
      id: a.id, titulo: a.titulo || 'Alerta ambiental',
      sub: [dia(a.criadaEm), lugar(a.municipio, a.uf)].filter(Boolean).join(' · '),
      lng: a.lng as number, lat: a.lat as number, href: `/alerta/${a.id}`,
      Icone: IconAlertTriangle, cor: '#E84855',
    })) : []),
    ...(filtro === 'tudo' || filtro === 'mutiroes' ? dados.mutiroes.map((m) => ({
      id: m.id, titulo: m.titulo,
      sub: [dia(m.quando), lugar(m.municipio, m.uf)].filter(Boolean).join(' · '),
      lng: m.lng, lat: m.lat, href: `/mutirao/${m.id}`,
      Icone: IconUsers, cor: '#FF8C42',
    })) : []),
    ...(filtro === 'tudo' || filtro === 'picos'
      ? [...dados.picosCriados, ...dados.picosFotografados].map((p) => ({
          id: p.id, titulo: p.nome, sub: lugar(p.municipio, p.uf),
          lng: p.lng, lat: p.lat, href: `/pico/${p.id}`,
          Icone: IconMapPin, cor: '#0D6EA8',
        }))
      : []),
  ]

  const nPicos = dados.picosCriados.length
  const nFotografados = dados.picosFotografados.length
  const dono = nome?.trim().split(/\s+/)[0]
  const sujeito = tipo === 'comunidade' ? 'a comunidade' : dono ? dono : 'esta pessoa'

  return (
    <div className="card pad" ref={caixa} style={{ marginTop: 12 }}>
      <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <IconMap2 size={13} stroke={2} /> No mapa
      </span>
      <p className="muted" style={{ fontSize: 12.5, margin: '4px 0 10px', lineHeight: 1.45 }}>
        O que {sujeito} mapeou, registrou e convocou.
      </p>

      {/* Botões de camada: tocar em Mutirões deixa só os mutirões e reenquadra
          o mapa neles. Camada sem nenhum ponto não vira botão — botão que não
          faz nada é pior do que botão que não existe. */}
      {abas.length > 2 && (
        <div
          role="tablist"
          aria-label="Camadas do mapa"
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 9 }}
        >
          {abas.map(({ chave, rotulo, n, Icone }) => {
            const on = filtro === chave
            return (
              <button
                key={chave}
                role="tab"
                aria-selected={on}
                onClick={() => setFiltro(chave)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 11px', borderRadius: 999, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 12.5, fontWeight: on ? 700 : 600,
                  background: on ? 'var(--turq, #1c8aad)' : 'transparent',
                  color: on ? '#fff' : 'var(--text)',
                  border: on ? '1px solid transparent' : '1px solid var(--line)',
                }}
              >
                <Icone size={14} stroke={2} />
                {rotulo}
                <span style={{ opacity: 0.75, fontWeight: 600 }}>{n}</span>
              </button>
            )
          })}
        </div>
      )}

      <div style={{ minHeight: altura }}>
        {podeCarregarMapa ? (
          <Suspense
            fallback={
              <div
                aria-label="Carregando mapa"
                style={{ height: altura, borderRadius: 14, background: '#0a1929' }}
              />
            }
          >
            <MapaInterno contribuicoes={dados} altura={altura} filtro={filtro} foco={foco} />
          </Suspense>
        ) : (
          <div style={{ height: altura, borderRadius: 14, background: '#0a1929' }} />
        )}
      </div>

      {/* O conteúdo do mapa, em lista. Tocar numa linha leva o MAPA até ela,
          sem sair da página; o "→" abre o registro inteiro. Os dois caminhos
          existem porque são vontades diferentes: "onde é isso?" e "quero ler". */}
      <div className="stack" style={{ gap: 2, marginTop: 10 }}>
        {itens.map((it) => (
          <div
            key={it.id}
            style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--line)' }}
          >
            <button
              onClick={() => setFoco({ id: it.id, lng: it.lng, lat: it.lat, toque: Date.now() })}
              style={{
                flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9,
                background: 'none', border: 0, padding: '9px 0', cursor: 'pointer',
                textAlign: 'left', font: 'inherit', color: 'inherit',
              }}
              aria-label={`Ver ${it.titulo} no mapa`}
            >
              <it.Icone size={17} stroke={2} style={{ color: it.cor, flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  display: 'block', fontSize: 13.5, fontWeight: 600,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {it.titulo}
                </span>
                <span className="muted" style={{ display: 'block', fontSize: 11.5, marginTop: 1 }}>
                  {it.sub}
                </span>
              </span>
            </button>
            <Link
              to={it.href}
              aria-label={`Abrir ${it.titulo}`}
              style={{ padding: '9px 2px 9px 8px', color: 'var(--muted)', display: 'grid', placeItems: 'center' }}
            >
              <IconChevronRight size={17} stroke={2} />
            </Link>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 10 }}>
        <Contagem n={nPicos} rotulo={plural(nPicos, 'pico cadastrado', 'picos cadastrados')} Icone={IconMapPin} />
        <Contagem n={nFotografados} rotulo={plural(nFotografados, 'pico registrado', 'picos registrados')} Icone={IconCamera} />
        <Contagem n={dados.alertas.length} rotulo={plural(dados.alertas.length, 'alerta', 'alertas')} Icone={IconAlertTriangle} />
        <Contagem n={dados.mutiroes.length} rotulo={plural(dados.mutiroes.length, 'mutirão', 'mutirões')} Icone={IconUsers} />
      </div>
    </div>
  )
}
