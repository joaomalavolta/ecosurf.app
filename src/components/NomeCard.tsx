import { useState } from 'react'
import { IconCamera, IconCheck } from '@tabler/icons-react'
import { temBackend } from '../services/api'

/**
 * Card de setup inicial: define nome de exibição + avatar.
 * Quando o user já tem nome salvo, mostra estado "salvo".
 */
export function NomeCard({ defaultNome = '', defaultAvatar = '' }: { defaultNome?: string; defaultAvatar?: string }) {
  const [nome, setNome] = useState(defaultNome)
  const [salvoComo, setSalvoComo] = useState(defaultNome)
  const [msg, setMsg] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatar)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const ativo = temBackend()

  function selecionarFoto(file: File) {
    setAvatarFile(file)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    setMsg(null)
  }

  async function uploadAvatar(file: File): Promise<string | null> {
    try {
      const img = await createImageBitmap(file)
      const size = 512
      const escala = Math.min(1, size / Math.max(img.width, img.height))
      const w = Math.round(img.width * escala)
      const h = Math.round(img.height * escala)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(img, 0, 0, w, h)
      if (typeof img.close === 'function') img.close()

      const blob = await new Promise<Blob>((resolve, reject) =>
        c.toBlob((b) => b ? resolve(b) : reject(new Error('Falha')), 'image/webp', 0.85)
      )

      const { sb } = await import('../services/supabase/client')
      const { data } = await sb().auth.getSession()
      const u = data.session?.user
      if (!u) return null

      const path = `${u.id}/avatar.webp`
      await sb().storage.from('avatars').remove([path]).catch(() => {})
      const up = await sb().storage.from('avatars').upload(path, blob, { contentType: 'image/webp', upsert: true })
      if (up.error) return null

      const url = sb().storage.from('avatars').getPublicUrl(path).data.publicUrl + '?t=' + Date.now()
      await sb().from('perfis').update({ foto_url: url }).eq('id', u.id)
      return url
    } catch {
      return null
    }
  }

  async function salvar() {
    if (!ativo) {
      setMsg('Backend não configurado — demonstração.')
      return
    }
    setSalvando(true)
    try {
      // Salvar nome
      if (nome.trim() && nome.trim() !== salvoComo) {
        const { definirNome } = await import('../services/supabase/auth')
        await definirNome(nome.trim())
        setSalvoComo(nome.trim())
      }

      // Upload avatar se selecionado
      if (avatarFile) {
        const url = await uploadAvatar(avatarFile)
        if (url) {
          setAvatarUrl(url)
          setAvatarFile(null)
          if (previewUrl) URL.revokeObjectURL(previewUrl)
          setPreviewUrl(null)
        }
      }

      setMsg('Perfil salvo com sucesso!')
    } catch {
      setMsg('Não foi possível salvar agora.')
    } finally {
      setSalvando(false)
    }
  }

  const temAlteracao = (nome.trim() !== salvoComo && nome.trim().length > 0) || !!avatarFile
  const fotoExibida = previewUrl || avatarUrl

  return (
    <div className="card pad">
      <span className="eyebrow">Seu perfil</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
        {/* Avatar com botão de upload */}
        <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) selecionarFoto(f)
            }}
          />
          {fotoExibida ? (
            <img
              src={fotoExibida}
              alt="Avatar"
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid var(--turq)',
              }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1ECBC320, #0D6EA820)',
                border: '2px dashed var(--turq)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                color: 'var(--turq)',
              }}
            >
              <IconCamera size={22} stroke={1.5} />
              <span style={{ fontSize: 9, fontWeight: 600 }}>Foto</span>
            </div>
          )}
          {/* Badge de câmera */}
          <div
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              background: 'var(--turq)',
              color: '#fff',
              borderRadius: '50%',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            <IconCamera size={13} stroke={2} />
          </div>
        </label>

        {/* Nome */}
        <div style={{ flex: 1 }}>
          <label className="form-label" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
            Nome de exibição
          </label>
          <input
            className="input"
            placeholder="ex.: Rafa do Sonho"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value)
              setMsg(null)
            }}
            aria-label="Nome de exibição"
            style={{ fontSize: 14 }}
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {temAlteracao ? (
          <button className="btn full" onClick={salvar} disabled={salvando || !nome.trim()}>
            {salvando ? 'Salvando...' : <><IconCheck size={16} stroke={2} /> Salvar perfil</>}
          </button>
        ) : salvoComo ? (
          <div className="muted" style={{ textAlign: 'center', fontSize: 13, padding: '6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <IconCheck size={14} stroke={2.5} color="var(--turq)" />
            Nome salvo como <b>{salvoComo}</b>
          </div>
        ) : (
          <button className="btn full" disabled style={{ opacity: 0.5 }}>
            Digite seu nome acima
          </button>
        )}
        {msg && <p className="muted" style={{ textAlign: 'center', marginTop: 6 }}>{msg}</p>}
      </div>
    </div>
  )
}
