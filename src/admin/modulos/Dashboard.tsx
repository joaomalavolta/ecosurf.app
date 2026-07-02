import { useState, useEffect } from 'react'
import * as admin from '../../services/admin'
import { type Indicadores } from '../../services/admin'
import { StatCard, Estado } from '../ui'
import { Titulo, type ModId } from '../shared'

export function Dashboard({ onNavegar }: { onNavegar: (mod: ModId) => void }) {
  const [ind, setInd] = useState<Indicadores | null>(null)
  const [erro, setErro] = useState('')
  useEffect(() => {
    admin.indicadores().then(setInd).catch((e) => setErro(String(e?.message ?? e)))
  }, [])
  return (
    <section className="admin-content">
      <Titulo nome="Painel" desc="Visão geral da plataforma. Toque em qualquer card para acessar." />
      {erro && <Estado>Não foi possível carregar os indicadores.</Estado>}
      {!ind && !erro && <Estado>Carregando…</Estado>}
      {ind && (
        <>
          <div className="admin-grid">
            <StatCard k="Usuários" v={ind.usuarios} onClick={() => onNavegar('usuarios')} />
            <StatCard k="Picos" v={ind.picos} onClick={() => onNavegar('picos')} />
            <StatCard k="Fotos ativas" v={ind.fotos} onClick={() => onNavegar('fotos')} />
            <StatCard k="Fotos pendentes" v={ind.fotosPendentes} onClick={() => onNavegar('fotos')} />
            <StatCard k="Fotos removidas" v={ind.fotosRemovidas} onClick={() => onNavegar('fotos')} />
            <StatCard k="Alertas" v={ind.ameacas} onClick={() => onNavegar('ameacas')} />
            <StatCard k="Mutirões" v={ind.mutiroes} onClick={() => onNavegar('mutiroes')} />
            <StatCard k="Bloqueados" v={ind.bloqueados} onClick={() => onNavegar('usuarios')} />
            <StatCard k="Ações registradas" v={ind.logs} onClick={() => onNavegar('logs')} />
          </div>
          {ind.fotosPendentes > 0 && (
            <div className="card pad" style={{ marginTop: 16 }}>
              <span className="eyebrow">Atenção</span>
              <p style={{ marginTop: 6 }}>
                {ind.fotosPendentes} foto(s) aguardando moderação.
              </p>
            </div>
          )}
          {ind.bloqueados > 0 && (
            <div className="card pad" style={{ marginTop: 8, borderLeft: '4px solid #d97706' }}>
              <span className="eyebrow">Usuários bloqueados</span>
              <p style={{ marginTop: 6 }}>
                {ind.bloqueados} usuário(s) com atividades suspensas.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────── Fotos ──
