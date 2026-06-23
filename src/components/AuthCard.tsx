import { useState, useEffect } from 'react'
import { temBackend } from '../services/api'

/**
 * Login leve, identificado (sem anônimo). E-mail (magic link) funciona já,
 * sem provedor de SMS; telefone (OTP) requer SMS ligado no painel.
 */
export function AuthCard() {
  const [metodo, setMetodo] = useState<'email' | 'telefone'>('email')
  const [fase, setFase] = useState<'inicio' | 'codigo'>('inicio')
  const [valor, setValor] = useState('')
  const [codigo, setCodigo] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const ativo = temBackend()

  async function iniciar() {
    if (!ativo) {
      setMsg('Backend não configurado — demonstração.')
      return
    }
    try {
      const auth = await import('../services/supabase/auth')
      if (metodo === 'email') {
        await auth.entrarComEmail(valor.trim())
        setFase('codigo')
        setMsg('Enviamos um link e um código numérico para seu e-mail.')
      } else {
        await auth.entrarComTelefone(valor.trim())
        setFase('codigo')
        setMsg('Código enviado por SMS.')
      }
    } catch {
      setMsg('Não foi possível enviar agora.')
    }
  }

  async function confirmar() {
    try {
      const { confirmarCodigo } = await import('../services/supabase/auth')
      await confirmarCodigo(valor.trim(), codigo.trim())
      setMsg('Entrou! Bem-vindo.')
      window.location.reload()
    } catch {
      setMsg('Código inválido.')
    }
  }

  useEffect(() => {
    if (!ativo) return
    let sub: { unsubscribe: () => void } | undefined
    import('../services/supabase/client').then(({ sb }) => {
      const { data } = sb().auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN') window.location.reload()
      })
      sub = data.subscription
    }).catch(() => {})
    return () => sub?.unsubscribe()
  }, [ativo])

  return (
    <div className="card pad">
      <span className="eyebrow">Entrar · sem anônimo (toda contribuição é identificada)</span>
      <div className="pills" style={{ margin: '10px 0' }}>
        <button className={`pill ${metodo === 'email' ? 'active' : ''}`} onClick={() => { setMetodo('email'); setFase('inicio') }}>E-mail</button>
        <button className={`pill ${metodo === 'telefone' ? 'active' : ''}`} onClick={() => { setMetodo('telefone'); setFase('inicio') }}>Telefone</button>
      </div>
      <div className="stack">
        {fase === 'inicio' ? (
          <>
            <input
              className="input"
              placeholder={metodo === 'email' ? 'voce@email.com' : '+55 13 99999-9999'}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              inputMode={metodo === 'email' ? 'email' : 'tel'}
              aria-label={metodo === 'email' ? 'E-mail' : 'Telefone'}
            />
            <button className="btn full" onClick={iniciar} disabled={!valor.trim()}>
              {metodo === 'email' ? 'Enviar link de acesso' : 'Enviar código'}
            </button>
          </>
        ) : (
          <>
            <input className="input" placeholder="código do SMS" value={codigo} onChange={(e) => setCodigo(e.target.value)} inputMode="numeric" aria-label="Código" />
            <button className="btn full" onClick={confirmar}>Confirmar</button>
          </>
        )}
        {msg && <p className="muted">{msg}</p>}
        {!ativo && <p className="muted">Sem backend ainda: provisionar é o último passo.</p>}
      </div>
    </div>
  )
}
