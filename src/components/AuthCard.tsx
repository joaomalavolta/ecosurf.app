import { useState } from 'react'
import { temBackend } from '../services/api'

/**
 * Login leve por telefone (OTP). O fluxo está pronto; quando houver backend
 * provisionado ele funciona de verdade, senão roda em demonstração.
 * As funções de auth são carregadas sob demanda (SDK fora do bundle principal).
 */
export function AuthCard() {
  const [fase, setFase] = useState<'fone' | 'codigo'>('fone')
  const [fone, setFone] = useState('')
  const [codigo, setCodigo] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const ativo = temBackend()

  async function enviar() {
    if (!ativo) {
      setMsg('Backend não configurado — fluxo em demonstração.')
      return
    }
    try {
      const { entrarComTelefone } = await import('../services/supabase/auth')
      await entrarComTelefone(fone)
      setFase('codigo')
      setMsg('Código enviado por SMS.')
    } catch {
      setMsg('Falha ao enviar o código.')
    }
  }

  async function confirmar() {
    if (!ativo) return
    try {
      const { confirmarCodigo } = await import('../services/supabase/auth')
      await confirmarCodigo(fone, codigo)
      setMsg('Entrou! Bem-vindo de volta.')
    } catch {
      setMsg('Código inválido.')
    }
  }

  return (
    <div className="card pad">
      <span className="eyebrow">Entrar · login leve por telefone</span>
      <div className="stack" style={{ marginTop: 10 }}>
        {fase === 'fone' ? (
          <>
            <input
              className="input"
              placeholder="+55 13 99999-9999"
              value={fone}
              onChange={(e) => setFone(e.target.value)}
              inputMode="tel"
              aria-label="Telefone"
            />
            <button className="btn full" onClick={enviar}>Enviar código</button>
          </>
        ) : (
          <>
            <input
              className="input"
              placeholder="código do SMS"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              inputMode="numeric"
              aria-label="Código de confirmação"
            />
            <button className="btn full" onClick={confirmar}>Confirmar</button>
          </>
        )}
        {msg && <p className="muted">{msg}</p>}
        {!ativo && <p className="muted">Sem backend ainda: provisionar é o último passo.</p>}
      </div>
    </div>
  )
}
