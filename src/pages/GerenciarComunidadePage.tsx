import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IconShieldCheck, IconPencil, IconEye, IconShare2, IconPhoto, IconCamera, IconTrash } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { SkeletonLinha } from '../components/Skeleton'
import { toast } from '../lib/toast'
import { CorteFoto } from '../components/CorteFotoLazy'
import { restMinhaConta } from '../services/conta'
import {
  carregarComunidade, listarMembros, definirPapel, meuPapel, atualizarComunidade,
  type Comunidade, type PapelComunidade,
} from '../services/comunidades'

const PAPEIS: { id: PapelComunidade; label: string; desc: string; Icone: typeof IconEye }[] = [
  { id: 'admin', label: 'Admin', desc: 'Gerencia e publica', Icone: IconShieldCheck },
  { id: 'autor', label: 'Autor', desc: 'Publica em nome da comunidade', Icone: IconPencil },
  { id: 'seguidor', label: 'Seguidor', desc: 'Acompanha as publicações', Icone: IconEye },
]

/**
 * Gestão da comunidade (só admin): promove seguidores a co-autores — o
 * coração da opção B, que permite ao coletivo publicar a várias mãos.
 */
export function GerenciarComunidadePage() {
  const { comunidadeId } = useParams<{ comunidadeId: string }>()
  const navigate = useNavigate()
  const [c, setC] = useState<Comunidade | null>(null)
  const [membros, setMembros] = useState<{ usuarioId: string; nome: string; avatar?: string; papel: PapelComunidade }[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvandoImg, setSalvandoImg] = useState(false)
  const [cortando, setCortando] = useState<{ file: File; tipo: 'avatar' | 'capa' } | null>(null)
  const refCapa = useRef<HTMLInputElement>(null)
  const refAvatar = useRef<HTMLInputElement>(null)
  const [conta, setConta] = useState<{ id?: string; papel: string }>({ papel: 'user' })
  const [nomeEdit, setNomeEdit] = useState('')
  const [descEdit, setDescEdit] = useState('')
  const [salvandoDados, setSalvandoDados] = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  const souSuperAdmin = conta.papel === 'admin' || conta.papel === 'super_admin'
  const souCriador = !!conta.id && conta.id === c?.criadorId
  const podeExcluir = souSuperAdmin || souCriador
  // Só o fundador entrega (e tira) a chave de admin. Um admin promovido
  // gerencia a comunidade, mas não cria outros admins nem se auto-perpetua.
  const podeDarAdmin = souCriador || souSuperAdmin

  // Escolher a foto abre o corte; o upload só acontece com o enquadramento
  // confirmado — capa e logo mantêm a proporção padrão do sistema.
  function escolherImagem(file: File | undefined, tipo: 'avatar' | 'capa') {
    if (!file) return
    setCortando({ file, tipo })
  }

  async function aoCortar(blob: Blob) {
    const tipo = cortando?.tipo
    setCortando(null)
    if (!tipo || !comunidadeId) return
    setSalvandoImg(true)
    try {
      await atualizarComunidade(comunidadeId, tipo === 'avatar' ? { avatarBlob: blob } : { capaBlob: blob })
      const atualizada = await carregarComunidade(comunidadeId)
      setC(atualizada)
      toast(tipo === 'avatar' ? 'Logo atualizada!' : 'Capa atualizada!', 'sucesso')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível salvar a imagem.')
    } finally {
      setSalvandoImg(false)
    }
  }

  useEffect(() => {
    if (!comunidadeId) return
    let vivo = true
    void (async () => {
      const [p, minhaConta] = await Promise.all([meuPapel(comunidadeId), restMinhaConta()])
      if (!vivo) return
      setConta({ id: minhaConta.id, papel: minhaConta.papel })
      const sa = minhaConta.papel === 'admin' || minhaConta.papel === 'super_admin'
      if (p !== 'admin' && !sa) {
        toast('Só administradores gerenciam a comunidade.')
        navigate(`/comunidade/${comunidadeId}`)
        return
      }
      const [com, ms] = await Promise.all([carregarComunidade(comunidadeId), listarMembros(comunidadeId)])
      if (!vivo) return
      setC(com)
      setNomeEdit(com?.nome ?? '')
      setDescEdit(com?.descricao ?? '')
      setMembros(ms)
      setCarregando(false)
    })()
    return () => { vivo = false }
  }, [comunidadeId, navigate])

  async function mudarPapel(usuarioId: string, papel: PapelComunidade) {
    if (!comunidadeId) return
    const antes = membros
    setMembros((ms) => ms.map((m) => m.usuarioId === usuarioId ? { ...m, papel } : m))
    try {
      await definirPapel(comunidadeId, usuarioId, papel)
      toast('Papel atualizado.', 'sucesso')
    } catch (e) {
      setMembros(antes)
      const msg = e instanceof Error ? e.message : ''
      toast(msg || 'Não foi possível atualizar o papel.')
    }
  }

  function convidar() {
    const url = `${window.location.origin}/comunidade/${comunidadeId}`
    const texto = `Participe da comunidade ${c?.nome} no Ecosurf`
    if (navigator.share) navigator.share({ title: c?.nome, text: texto, url }).catch(() => {})
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`, '_blank')
  }

  async function salvarDados() {
    if (!comunidadeId || !nomeEdit.trim()) return
    setSalvandoDados(true)
    try {
      await atualizarComunidade(comunidadeId, { nome: nomeEdit, descricao: descEdit })
      setC((prev) => prev ? { ...prev, nome: nomeEdit.trim(), descricao: descEdit.trim() || undefined } : prev)
      toast('Dados atualizados!', 'sucesso')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível salvar os dados.')
    } finally {
      setSalvandoDados(false)
    }
  }

  async function excluir() {
    if (!comunidadeId) return
    setExcluindo(true)
    try {
      // Soft-delete: some do app (comunidades_leitura filtra deleted_at) mas
      // fica no banco. A RLS libera ao fundador e ao super admin.
      const { sb } = await import('../services/supabase/client')
      const { error } = await sb().from('comunidades').update({ deleted_at: new Date().toISOString() }).eq('id', comunidadeId)
      if (error) throw new Error(error.message)
      toast('Comunidade excluída.', 'sucesso')
      navigate('/acoes')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível excluir a comunidade.')
      setExcluindo(false)
    }
  }

  return (
    <div className="page">
      <Header title="Gerenciar" sub={c?.nome} />
      <div className="page-pad">
        {/* Identidade visual: capa e logo editáveis a qualquer momento */}
        <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>Identidade visual</span>
        <div style={{ position: 'relative', marginBottom: 46 }}>
          <button
            onClick={() => refCapa.current?.click()}
            disabled={salvandoImg}
            aria-label="Trocar foto de capa"
            style={{
              width: '100%', height: 110, borderRadius: 16, cursor: 'pointer', padding: 0,
              border: c?.capaUrl ? 'none' : '1px dashed var(--line)',
              background: c?.capaUrl
                ? `url('${c.capaUrl}') center/cover no-repeat`
                : 'var(--card-soft)',
              display: 'grid', placeItems: 'center', color: 'var(--muted)',
              opacity: salvandoImg ? 0.6 : 1,
            }}
          >
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600,
              background: c?.capaUrl ? 'rgba(6,34,46,.55)' : 'transparent',
              color: c?.capaUrl ? '#fff' : 'var(--muted)',
              padding: c?.capaUrl ? '5px 10px' : 0, borderRadius: 9,
            }}>
              <IconPhoto size={16} stroke={1.9} /> {c?.capaUrl ? 'Trocar capa' : 'Adicionar capa'}
            </span>
          </button>
          <button
            onClick={() => refAvatar.current?.click()}
            disabled={salvandoImg}
            aria-label="Trocar logo da comunidade"
            style={{
              position: 'absolute', left: 14, bottom: -32,
              width: 66, height: 66, borderRadius: 18, cursor: 'pointer', padding: 0,
              border: '3px solid var(--bg)',
              background: c?.avatarUrl
                ? `url('${c.avatarUrl}') center/cover no-repeat`
                : 'linear-gradient(135deg, #0D6EA8, #2E9BD6)',
              display: 'grid', placeItems: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,.18)',
              opacity: salvandoImg ? 0.6 : 1,
            }}
          >
            {!c?.avatarUrl && <IconCamera size={22} stroke={1.9} color="#fff" />}
          </button>
          <input ref={refCapa} type="file" accept="image/*" hidden
            onChange={(e) => escolherImagem(e.target.files?.[0], 'capa')} />
          <input ref={refAvatar} type="file" accept="image/*" hidden
            onChange={(e) => escolherImagem(e.target.files?.[0], 'avatar')} />
        </div>

        <button className="btn acento full" onClick={convidar}>
          <IconShare2 size={17} stroke={2} /> Convidar pessoas
        </button>

        <div className="card pad" style={{ marginTop: 16 }}>
          <span className="eyebrow" style={{ display: 'block' }}>Dados da comunidade</span>
          <input
            className="input"
            style={{ marginTop: 10 }}
            value={nomeEdit}
            onChange={(e) => setNomeEdit(e.target.value)}
            placeholder="Nome da comunidade"
            maxLength={60}
          />
          <textarea
            className="input"
            style={{ marginTop: 8, minHeight: 74, resize: 'vertical' }}
            value={descEdit}
            onChange={(e) => setDescEdit(e.target.value)}
            placeholder="Descrição (opcional)"
            maxLength={280}
          />
          <button
            className="btn full"
            style={{ marginTop: 10 }}
            disabled={salvandoDados || !nomeEdit.trim() || (nomeEdit.trim() === c?.nome && descEdit.trim() === (c?.descricao ?? ''))}
            onClick={() => void salvarDados()}
          >
            {salvandoDados ? 'Salvando…' : 'Salvar dados'}
          </button>
        </div>

        <span className="eyebrow" style={{ display: 'block', margin: '20px 0 10px' }}>
          Membros ({membros.length})
        </span>

        {carregando ? (
          <><SkeletonLinha /><SkeletonLinha /></>
        ) : (
          <div className="stack">
            {membros.map((m) => (
              <div key={m.usuarioId} className="card pad">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {m.avatar
                    ? <img src={m.avatar} alt="" style={{ width: 38, height: 38, borderRadius: 99, objectFit: 'cover' }} />
                    : <span style={{ width: 38, height: 38, borderRadius: 99, background: 'color-mix(in srgb, var(--turq) 18%, transparent)', display: 'grid', placeItems: 'center', fontWeight: 700, color: 'var(--turq)' }}>{m.nome[0]?.toUpperCase()}</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.nome}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      {PAPEIS.find((p) => p.id === m.papel)?.desc}
                    </div>
                  </div>
                </div>

                {/* Seletor de papel */}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  {PAPEIS.map((p) => {
                    const ehFundador = m.usuarioId === c?.criadorId
                    // Conceder/retirar 'admin' é privilégio do fundador. Os
                    // demais papéis qualquer admin da comunidade ajusta.
                    const bloqueado = ehFundador
                      || (p.id === 'admin' && !podeDarAdmin)
                      || (m.papel === 'admin' && !podeDarAdmin)
                    const selecionado = m.papel === p.id
                    return (
                      <button
                        key={p.id}
                        onClick={() => !bloqueado && !selecionado && void mudarPapel(m.usuarioId, p.id)}
                        disabled={bloqueado}
                        title={bloqueado && !ehFundador ? 'Só o fundador define quem é admin.' : undefined}
                        style={{
                          flex: 1, padding: '7px 6px', borderRadius: 10, cursor: bloqueado ? 'default' : 'pointer',
                          border: selecionado ? '1.5px solid var(--turq)' : '1px solid var(--line)',
                          background: selecionado ? 'color-mix(in srgb, var(--turq) 10%, transparent)' : 'transparent',
                          color: selecionado ? 'var(--turq)' : 'var(--muted)',
                          fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                          opacity: bloqueado && !selecionado ? 0.4 : 1,
                        }}
                      >
                        <p.Icone size={13} stroke={2} /> {p.label}
                      </button>
                    )
                  })}
                </div>
                {m.usuarioId === c?.criadorId ? (
                  <p className="muted" style={{ fontSize: 10.5, marginTop: 6 }}>
                    Fundador — o papel não pode ser alterado.
                  </p>
                ) : m.papel === 'admin' ? (
                  <p className="muted" style={{ fontSize: 10.5, marginTop: 6 }}>
                    Administrador da comunidade{podeDarAdmin ? ' — você pode remover este status.' : ' — só o fundador pode remover este status.'}
                  </p>
                ) : !podeDarAdmin ? (
                  <p className="muted" style={{ fontSize: 10.5, marginTop: 6 }}>
                    Só o fundador pode tornar alguém administrador.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {!carregando && podeExcluir && (
          <div className="card pad" style={{ marginTop: 22, border: '1px solid color-mix(in srgb, var(--coral) 55%, transparent)' }}>
            <span className="eyebrow" style={{ color: 'var(--coral)' }}>Zona de perigo</span>
            <p className="muted" style={{ marginTop: 6 }}>
              {souSuperAdmin && conta.id !== c?.criadorId
                ? 'Excluir tira a comunidade do ar. Você está excluindo como super administrador.'
                : 'Excluir tira a comunidade do ar. Só o fundador e um super administrador podem fazer isso.'}
            </p>
            {!confirmExcluir ? (
              <button
                className="btn outline full"
                style={{ marginTop: 10, color: 'var(--coral)', borderColor: 'color-mix(in srgb, var(--coral) 55%, transparent)' }}
                onClick={() => setConfirmExcluir(true)}
              >
                <IconTrash size={16} stroke={2} /> Excluir comunidade
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn outline full" disabled={excluindo} onClick={() => setConfirmExcluir(false)}>Cancelar</button>
                <button className="btn full" style={{ background: 'var(--coral)' }} disabled={excluindo} onClick={() => void excluir()}>
                  {excluindo ? 'Excluindo…' : 'Confirmar exclusão'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {cortando && (
        <CorteFoto
          arquivo={cortando.file}
          proporcao={cortando.tipo === 'avatar' ? 1 : 16 / 5}
          maxLargura={cortando.tipo === 'avatar' ? 400 : 1600}
          titulo={cortando.tipo === 'avatar' ? 'Enquadre a logo' : 'Enquadre a capa'}
          onPronto={(b) => void aoCortar(b)}
          onCancelar={() => setCortando(null)}
        />
      )}
    </div>
  )
}
