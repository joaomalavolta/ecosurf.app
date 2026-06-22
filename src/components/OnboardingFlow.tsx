import { useEffect, useRef, useState } from 'react'
import { IconRipple, IconMail, IconUser, IconMapPin, IconCamera, IconCheck } from '@tabler/icons-react'
import { statusPerfil, enviarCodigo, confirmarCodigo, salvarPerfil } from '../services/perfil'
import { carregarPicos } from '../services/picos'
import { cpfValido, formatCpf } from '../lib/cpf'
import type { Pico } from '../types/domain'

type Etapa = 'boas-vindas' | 'email' | 'codigo' | 'perfil' | 'pronto'

async function resizeAvatar(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const size = 512
  const escala = Math.min(1, size / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * escala)
  const h = Math.round(bmp.height * escala)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d')?.drawImage(bmp, 0, 0, w, h)
  bmp.close?.()
  return await new Promise<Blob>((res) => c.toBlob((b) => res(b as Blob), 'image/webp', 0.85))
}

const SHELL: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 300,
  maxWidth: 'var(--largura-app)',
  margin: '0 auto',
  background: 'linear-gradient(160deg, var(--azul-abissal), var(--azul) 70%, var(--verde))',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  padding: 'calc(env(safe-area-inset-top,0px) + 40px) 22px calc(env(safe-area-inset-bottom,0px) + 24px)',
  overflowY: 'auto',
}

export function OnboardingFlow({ onConcluir, onExplorar }: { onConcluir: () => void; onExplorar: () => void }) {
  const [etapa, setEtapa] = useState<Etapa>('boas-vindas')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [cidade, setCidade] = useState('')
  const [picoPrincipal, setPicoPrincipal] = useState('')
  const [picos, setPicos] = useState<Pico[]>([])
  const [foto, setFoto] = useState<{ blob: Blob; url: string } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Se já tem sessão mas não terminou o cadastro, pula direto pro perfil.
    statusPerfil().then((s) => {
      if (s.onboarded) onConcluir()
      else if (s.sessao) setEtapa('perfil')
    })
    carregarPicos().then(setPicos)
  }, [])

  async function acao<T>(fn: () => Promise<T>, depois?: () => void) {
    setMsg(null)
    setCarregando(true)
    try {
      await fn()
      depois?.()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.')
    } finally {
      setCarregando(false)
    }
  }

  async function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const blob = await resizeAvatar(f)
    setFoto({ blob, url: URL.createObjectURL(blob) })
  }

  async function ativarPermissoes() {
    try {
      await new Promise<void>((res) => navigator.geolocation?.getCurrentPosition(() => res(), () => res(), { timeout: 5000 }))
    } catch { /* ok */ }
    try {
      const s = await navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
      s?.getTracks().forEach((t) => t.stop())
    } catch { /* ok */ }
    onConcluir()
  }

  const cpfOk = cpfValido(cpf)
  const perfilOk = nome.trim().length > 1 && cpfOk && cidade.trim().length > 1

  return (
    <div style={SHELL}>
      {etapa === 'boas-vindas' && (
        <div style={{ margin: 'auto 0' }}>
          <IconRipple size={44} stroke={1.6} />
          <h1 style={{ fontFamily: 'var(--fonte-titulo)', fontSize: 30, lineHeight: 1.05, marginTop: 14 }}>
            Bem-vindo ao Ecosurf
          </h1>
          <p style={{ color: 'rgba(255,255,255,.88)', marginTop: 12, lineHeight: 1.5 }}>
            Aqui o mar é lido por quem está nele. Para contribuir — registrar a condição dos
            picos e defender o litoral — a gente pede um cadastro rápido (toda contribuição é
            identificada, sem anônimo).
          </p>
          <div className="stack" style={{ marginTop: 24 }}>
            <button className="btn acento full" onClick={() => setEtapa('email')}>Criar conta e contribuir</button>
            <button onClick={onExplorar} style={{ background: 'none', border: 0, color: 'rgba(255,255,255,.8)', fontSize: 14, cursor: 'pointer' }}>
              Explorar primeiro
            </button>
          </div>
        </div>
      )}

      {etapa === 'email' && (
        <div style={{ margin: 'auto 0' }}>
          <IconMail size={36} stroke={1.8} />
          <h2 style={{ marginTop: 12 }}>Seu e-mail</h2>
          <p style={{ color: 'rgba(255,255,255,.8)', marginTop: 8, lineHeight: 1.5 }}>
            Enviamos um código de acesso. Sem senha.
          </p>
          <div className="stack" style={{ marginTop: 16 }}>
            <input className="input" type="email" inputMode="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn acento full" disabled={!email.includes('@') || carregando} onClick={() => acao(() => enviarCodigo(email), () => { setMsg('Código enviado — confira o e-mail.'); setEtapa('codigo') })}>
              {carregando ? 'Enviando…' : 'Enviar código'}
            </button>
            {msg && <p style={{ color: 'rgba(255,255,255,.85)', fontSize: 13 }}>{msg}</p>}
          </div>
        </div>
      )}

      {etapa === 'codigo' && (
        <div style={{ margin: 'auto 0' }}>
          <IconMail size={36} stroke={1.8} />
          <h2 style={{ marginTop: 12 }}>Código do e-mail</h2>
          <p style={{ color: 'rgba(255,255,255,.8)', marginTop: 8 }}>Enviado para {email}.</p>
          <div className="stack" style={{ marginTop: 16 }}>
            <input className="input" inputMode="numeric" placeholder="000000" value={codigo} onChange={(e) => setCodigo(e.target.value)} style={{ letterSpacing: 4, fontWeight: 700 }} />
            <button className="btn acento full" disabled={codigo.trim().length < 6 || carregando} onClick={() => acao(() => confirmarCodigo(email, codigo), () => setEtapa('perfil'))}>
              {carregando ? 'Confirmando…' : 'Confirmar'}
            </button>
            <button onClick={() => acao(() => enviarCodigo(email), () => setMsg('Reenviado.'))} style={{ background: 'none', border: 0, color: 'rgba(255,255,255,.8)', fontSize: 13, cursor: 'pointer' }}>
              Reenviar código
            </button>
            {msg && <p style={{ color: 'rgba(255,255,255,.85)', fontSize: 13 }}>{msg}</p>}
          </div>
        </div>
      )}

      {etapa === 'perfil' && (
        <div>
          <IconUser size={36} stroke={1.8} />
          <h2 style={{ marginTop: 12 }}>Seu perfil</h2>
          <div className="stack" style={{ marginTop: 16 }}>
            <div className="row" style={{ gap: 14 }}>
              <button onClick={() => fileRef.current?.click()} aria-label="Foto de perfil" style={{ width: 72, height: 72, borderRadius: 24, border: '2px solid rgba(255,255,255,.4)', background: foto ? `center/cover url(${foto.url})` : 'rgba(255,255,255,.12)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', cursor: 'pointer' }}>
                {!foto && <IconCamera size={24} stroke={2} />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" capture="user" onChange={onArquivo} style={{ display: 'none' }} />
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)' }}>Toque pra adicionar sua foto (opcional).</div>
            </div>
            <input className="input" placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            <input className="input" inputMode="numeric" placeholder="CPF" value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))}
              style={{ borderColor: cpf && !cpfOk ? 'var(--por-do-sol,#e07)' : undefined }} />
            {cpf && !cpfOk && <span style={{ fontSize: 12, color: '#ffd9c9' }}>CPF inválido</span>}
            <input className="input" placeholder="Sua cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
            <select className="input" value={picoPrincipal} onChange={(e) => setPicoPrincipal(e.target.value)}>
              <option value="">Pico de surf principal (opcional)</option>
              {picos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome} · {p.municipio}</option>
              ))}
            </select>
            <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)' }}>
              Seu CPF é usado só para validar contas reais (anti-fake) e não fica visível para ninguém.
            </p>
            <button className="btn acento full" disabled={!perfilOk || carregando} onClick={() => acao(() => salvarPerfil({ nome, cpf, cidade, picoPrincipal, fotoBlob: foto?.blob }), () => setEtapa('pronto'))}>
              {carregando ? 'Salvando…' : 'Salvar e continuar'}
            </button>
            {msg && <p style={{ color: 'rgba(255,255,255,.85)', fontSize: 13 }}>{msg}</p>}
          </div>
        </div>
      )}

      {etapa === 'pronto' && (
        <div style={{ margin: 'auto 0', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 999, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <IconCheck size={40} stroke={2.2} />
          </div>
          <h2 style={{ marginTop: 16 }}>Tudo pronto{nome ? `, ${nome.split(' ')[0]}` : ''}!</h2>
          <p style={{ color: 'rgba(255,255,255,.85)', marginTop: 8, lineHeight: 1.5 }}>
            Você já pode contribuir no Ecosurf. Pra registrar o mar, a gente usa a câmera e a
            localização (a localização confirma que a foto é do pico).
          </p>
          <div className="stack" style={{ marginTop: 22 }}>
            <button className="btn acento full" onClick={ativarPermissoes}>
              <IconMapPin size={18} stroke={2} /> Ativar câmera e localização
            </button>
            <button onClick={onConcluir} style={{ background: 'none', border: 0, color: 'rgba(255,255,255,.8)', fontSize: 14, cursor: 'pointer' }}>
              Agora não
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
