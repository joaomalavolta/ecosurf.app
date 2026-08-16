import { lazy, Suspense, useEffect, useState } from 'react'
import { IconMap2, IconMapPin, IconCamera, IconAlertTriangle, IconUsers } from '@tabler/icons-react'
import type { ContribuicoesGeo } from '../services/contribuicoesGeo'

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
}: {
  tipo: 'usuario' | 'comunidade'
  id: string
  /** Primeiro nome de quem é o território — entra na legenda. */
  nome?: string | null
  altura?: number
}) {
  const [dados, setDados] = useState<ContribuicoesGeo | null>(null)
  const [caixa, podeCarregarMapa] = useVisivel()

  useEffect(() => {
    if (!id) return
    let vivo = true
    import('../services/contribuicoesGeo')
      .then(({ contribuicoesGeoUsuario, contribuicoesGeoComunidade }) =>
        tipo === 'usuario' ? contribuicoesGeoUsuario(id) : contribuicoesGeoComunidade(id),
      )
      .then((c) => { if (vivo) setDados(c) })
      .catch(() => { if (vivo) setDados(null) })
    return () => { vivo = false }
  }, [tipo, id])

  // Sem pontos (ou ainda carregando): nada na tela. Ver o cabeçalho.
  if (!dados || dados.total === 0) return null

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
            <MapaInterno contribuicoes={dados} altura={altura} />
          </Suspense>
        ) : (
          <div style={{ height: altura, borderRadius: 14, background: '#0a1929' }} />
        )}
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
