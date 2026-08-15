import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconBan, IconArrowBackUp } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { AvatarPessoa } from '../components/AvatarPessoa'
import { SkeletonLinha } from '../components/Skeleton'
import { restMinhaConta } from '../services/conta'
import type { Bloqueado } from '../services/bloqueios'

/**
 * Pessoas bloqueadas — bloquear tem que ser tão fácil de desfazer quanto de fazer.
 *
 * Sem isso, o bloqueio vira uma porta que só tranca: a pessoa some da sua vida
 * no app e você não tem onde reconsiderar.
 */
export function BloqueadosPage() {
  const [itens, setItens] = useState<Bloqueado[] | null>(null)
  const [logado, setLogado] = useState<boolean | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [soltando, setSoltando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      const { listarBloqueados } = await import('../services/bloqueios')
      setItens(await listarBloqueados())
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar.')
      setItens([])
    }
  }, [])

  useEffect(() => {
    let vivo = true
    restMinhaConta().then((c) => {
      if (!vivo) return
      setLogado(!!c.id)
      if (c.id) carregar()
    })
    return () => { vivo = false }
  }, [carregar])

  async function soltar(id: string) {
    setSoltando(id)
    setErro(null)
    try {
      const { desbloquear } = await import('../services/bloqueios')
      await desbloquear(id)
      setItens((xs) => (xs ?? []).filter((x) => x.id !== id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível desbloquear.')
    } finally {
      setSoltando(null)
    }
  }

  return (
    <div className="page">
      <Header title="Pessoas bloqueadas" sub="Quem não pode falar com você." />
      <div className="page-pad">
        {logado === false ? (
          <div className="card pad" style={{ textAlign: 'center', padding: '28px 16px' }}>
            <IconBan size={30} stroke={1.5} style={{ color: 'var(--muted)' }} />
            <p style={{ fontSize: 15, fontWeight: 600, margin: '8px 0 4px' }}>Entre na sua conta</p>
            <p className="muted">A lista de bloqueios é sua e só aparece para você.</p>
          </div>
        ) : itens === null ? (
          <><SkeletonLinha /><SkeletonLinha /></>
        ) : itens.length === 0 ? (
          <div className="card pad" style={{ textAlign: 'center', padding: '28px 16px' }}>
            <IconBan size={30} stroke={1.5} style={{ color: 'var(--muted)' }} />
            <p style={{ fontSize: 15, fontWeight: 600, margin: '8px 0 4px' }}>
              {erro ? 'Não deu para carregar' : 'Ninguém bloqueado'}
            </p>
            <p className="muted">
              {erro ?? 'Se alguém te incomodar nas mensagens, o menu “⋯” da conversa resolve.'}
            </p>
          </div>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 12 }}>
              Quem está aqui não troca mensagens com você, e não foi avisado disso.
              Desbloquear devolve a conversa de onde parou.
            </p>
            <div className="stack" style={{ gap: 8 }}>
              {itens.map((b) => (
                <div key={b.id} className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Link to={`/usuario/${b.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                    <AvatarPessoa nome={b.nome} fotoUrl={b.fotoUrl} tamanho={40} />
                    <span style={{ fontSize: 14.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.nome ?? 'Surfista'}
                    </span>
                  </Link>
                  <button
                    className="btn outline"
                    style={{ flex: '0 0 auto', padding: '6px 12px', fontSize: 12.5, gap: 5 }}
                    onClick={() => soltar(b.id)}
                    disabled={soltando === b.id}
                  >
                    <IconArrowBackUp size={15} stroke={2} />
                    {soltando === b.id ? 'Soltando…' : 'Desbloquear'}
                  </button>
                </div>
              ))}
            </div>
            {erro && <p style={{ color: 'var(--coral)', fontSize: 12.5, marginTop: 10 }}>{erro}</p>}
          </>
        )}
      </div>
    </div>
  )
}
