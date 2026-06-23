import { useState } from 'react'
import { temBackend } from '../services/api'

/** Define o nome de exibição que aparece nos registros do usuário no feed. */
export function NomeCard({ defaultNome = '' }: { defaultNome?: string }) {
  const [nome, setNome] = useState(defaultNome)
  const [salvoComo, setSalvoComo] = useState(defaultNome)
  const [msg, setMsg] = useState<string | null>(null)
  const ativo = temBackend()

  async function salvar() {
    if (!ativo) {
      setMsg('Backend não configurado — demonstração.')
      return
    }
    try {
      const { definirNome } = await import('../services/supabase/auth')
      await definirNome(nome.trim())
      setSalvoComo(nome.trim())
      setMsg('Nome salvo — aparecerá nos seus registros.')
    } catch {
      setMsg('Não foi possível salvar agora.')
    }
  }

  const isAlterado = nome.trim() !== salvoComo

  return (
    <div className="card pad">
      <span className="eyebrow">Nome de exibição (aparece no feed)</span>
      <div className="stack" style={{ marginTop: 10 }}>
        <input
          className="input"
          placeholder="ex.: Rafa do Sonho"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value)
            setMsg(null) // clear msg when typing
          }}
          aria-label="Nome de exibição"
        />
        {isAlterado ? (
          <button className="btn full" onClick={salvar} disabled={!nome.trim()}>
            Salvar nome
          </button>
        ) : (
          <button className="btn full" disabled style={{ opacity: 0.7 }}>
            Editar nome acima
          </button>
        )}
        {msg && <p className="muted">{msg}</p>}
      </div>
    </div>
  )
}
