import { useState, useEffect } from 'react'
import { temBackend } from '../services/api'

/**
 * Login leve, identificado (sem anônimo). E-mail (magic link) funciona já,
 * sem provedor de SMS; telefone (OTP) requer SMS ligado no painel.
 */
export function AuthCard() {
  const [metodo, setMetodo] = useState<'email' | 'telefone'>('email')
  const [fase, setFase] = useState<'inicio' | 'codigo'>('inicio')
  const [valor, setValor] = useState(() => localStorage.getItem('ecosurf:last_email') || '')
  const [codigo, setCodigo] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const ativo = temBackend()

  async function iniciar() {
    if (!ativo) {
      setMsg('Backend não configurado — demonstração.')
      return
    }
    try {
      const auth = await import('../services/supabase/auth')
      if (metodo === 'email') {
        localStorage.setItem('ecosurf:last_email', valor.trim())
        await auth.entrarComEmail(valor.trim())
        setFase('codigo')
        setMsg('Enviamos um link e um código numérico para seu e-mail.')
      } else {
        await auth.entrarComTelefone(valor.trim())
        setFase('codigo')
        setMsg('Código enviado por SMS.')
      }
    } catch (e: any) {
      setMsg(e?.message || 'Não foi possível enviar agora.')
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
      <span className="eyebrow">Entrar</span>
      <div className="pills" style={{ margin: '10px 0' }}>
        <button className={`pill ${metodo === 'email' ? 'active' : ''}`} onClick={() => { setMetodo('email'); setFase('inicio'); setValor(localStorage.getItem('ecosurf:last_email') || ''); setMsg(null) }}>E-mail</button>
        <button className={`pill ${metodo === 'telefone' ? 'active' : ''}`} onClick={() => { setMetodo('telefone'); setFase('inicio'); setValor('+55 '); setMsg(null) }}>Telefone</button>
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
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={aceitouTermos} 
                onChange={(e) => setAceitouTermos(e.target.checked)} 
                style={{ marginTop: 2, accentColor: 'var(--turq)', width: 16, height: 16, flexShrink: 0 }} 
              />
              <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>
                Li e aceito a <a href="/termos" target="_blank" rel="noreferrer" style={{ color: 'var(--turq)', textDecoration: 'none', fontWeight: 600 }}>Declaração de Conformidade, Responsabilidade e Uso</a>.
              </span>
            </label>
            <button className="btn full" onClick={iniciar} disabled={(metodo === 'email' ? !valor.includes('@') : valor.trim().length < 8) || !aceitouTermos} style={{ marginTop: 8 }}>
              {metodo === 'email' ? 'Enviar código de acesso' : 'Enviar código'}
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
