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

      {/* Termos — obrigatório para qualquer método */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 10, cursor: 'pointer' }}>
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

      {/* Google OAuth */}
      <button
        className="btn full auth-google"
        disabled={!aceitouTermos}
        style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          minHeight: 46,
          background: '#fff',
          color: '#333',
          border: '1px solid rgba(0,0,0,0.12)',
          fontWeight: 600,
          fontSize: 14,
          opacity: aceitouTermos ? 1 : 0.45,
        }}
        onClick={async () => {
          try {
            const { entrarComGoogle } = await import('../services/supabase/auth')
            await entrarComGoogle()
          } catch (e: any) {
            setMsg(e?.message || 'Erro ao conectar com Google.')
          }
        }}
      >
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.09 24.09 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Entrar com Google
      </button>

      {/* Divisor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0 10px' }}>
        <div style={{ flex: 1, height: 1, background: 'currentColor', opacity: 0.15 }} />
        <span style={{ fontSize: 12, opacity: 0.5, fontWeight: 500 }}>ou</span>
        <div style={{ flex: 1, height: 1, background: 'currentColor', opacity: 0.15 }} />
      </div>

      <div className="pills" style={{ margin: '0 0 10px' }}>
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
