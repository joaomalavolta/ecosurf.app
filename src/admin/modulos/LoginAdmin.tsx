import { useState } from 'react'
import { Link } from 'react-router-dom'
import { enviarCodigo, confirmarCodigo } from '../../services/perfil'
import {
  IconShieldLock,
} from '@tabler/icons-react'
import { TelaCheia } from '../shared'

export function LoginAdmin({ onEntrar }: { onEntrar: () => void }) {
  const [etapa, setEtapa] = useState<'email' | 'codigo'>('email')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function enviar() {
    setErro(''); setOcupado(true)
    try { await enviarCodigo(email); setEtapa('codigo') }
    catch (e) { setErro(String((e as Error)?.message ?? e)) }
    finally { setOcupado(false) }
  }
  async function confirmar() {
    setErro(''); setOcupado(true)
    try { await confirmarCodigo(email, codigo); onEntrar() }
    catch { setErro('Código inválido ou expirado.'); setOcupado(false) }
  }

  return (
    <TelaCheia>
      <div className="card pad stack" style={{ textAlign: 'center' }}>
        <div style={{ display: 'grid', placeItems: 'center', gap: 8 }}>
          <IconShieldLock size={34} stroke={1.6} color="var(--azul)" />
          <h2 style={{ fontSize: 19, color: 'var(--azul-abissal)' }}>Painel Ecosurf</h2>
          <p className="muted">Acesso restrito à equipe. Entre com seu e-mail.</p>
        </div>
        {etapa === 'email' ? (
          <>
            <input className="input" type="email" inputMode="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn full" disabled={ocupado || !email.includes('@')} onClick={enviar}>{ocupado ? 'Enviando…' : 'Enviar código'}</button>
          </>
        ) : (
          <>
            <input className="input" inputMode="numeric" placeholder="Código do e-mail" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            <button className="btn full" disabled={ocupado || codigo.length < 4} onClick={confirmar}>{ocupado ? 'Verificando…' : 'Entrar'}</button>
            <button className="btn outline full" onClick={() => setEtapa('email')}>Trocar e-mail</button>
          </>
        )}
        {erro && <p className="muted" style={{ color: 'var(--perigo)' }}>{erro}</p>}
        <Link to="/" style={{ color: 'var(--muted)', fontSize: 13 }}>← Voltar ao app</Link>
      </div>
    </TelaCheia>
  )
}

