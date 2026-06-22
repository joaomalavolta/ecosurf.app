import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { ehModerador, listarDenuncias, ocultarFoto, type DenunciaItem } from '../services/moderacao'

export function ModeracaoPage() {
  const [mod, setMod] = useState<boolean | null>(null)
  const [itens, setItens] = useState<DenunciaItem[]>([])

  useEffect(() => {
    let vivo = true
    ehModerador().then((m) => {
      if (!vivo) return
      setMod(m)
      if (m) listarDenuncias().then((d) => vivo && setItens(d))
    })
    return () => {
      vivo = false
    }
  }, [])

  async function ocultar(fotoId: string) {
    await ocultarFoto(fotoId)
    setItens((xs) => xs.filter((x) => x.foto_id !== fotoId))
  }

  return (
    <div className="page">
      <Header title="Moderação" sub="Denúncias da comunidade — veteranos da região." />
      <div className="page-pad stack">
        {mod === null && <p className="muted">Verificando acesso…</p>}

        {mod === false && (
          <div className="card pad">
            <b>Acesso restrito</b>
            <p className="muted">Esta área é para moderadores de região. Fale com a organização para se tornar um.</p>
            <Link to="/" className="btn" style={{ marginTop: 8 }}>Voltar ao radar</Link>
          </div>
        )}

        {mod && itens.length === 0 && <p className="muted">Sem denúncias pendentes.</p>}

        {mod &&
          itens.map((d) => (
            <div key={d.id} className="card pad">
              <div className="muted" style={{ fontSize: 12 }}>
                foto {d.foto_id.slice(0, 8)} · {new Date(d.criada_em).toLocaleString('pt-BR')}
              </div>
              <div style={{ margin: '6px 0' }}>{d.motivo || 'sem motivo informado'}</div>
              <button className="btn" onClick={() => ocultar(d.foto_id)}>Ocultar foto</button>
            </div>
          ))}
      </div>
    </div>
  )
}
