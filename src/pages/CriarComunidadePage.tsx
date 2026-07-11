import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconCamera, IconUsers, IconPhoto } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { toast } from '../lib/toast'
import { versoesDeArquivo } from '../lib/imagem'
import { criarComunidade, type CategoriaComunidade } from '../services/comunidades'

const CATEGORIAS: { id: CategoriaComunidade; label: string; desc: string }[] = [
  { id: 'territorial', label: 'Territorial', desc: 'Uma praia, pico, bairro ou município' },
  { id: 'ambiental', label: 'Ambiental', desc: 'Um tema: lixo, água, fauna, erosão' },
  { id: 'projeto', label: 'Projeto', desc: 'Uma iniciativa com começo e objetivo' },
  { id: 'coletivo', label: 'Coletivo', desc: 'Um grupo de pessoas organizado' },
  { id: 'escola', label: 'Escola de surf', desc: 'Alunos, professores e famílias' },
  { id: 'outro', label: 'Outro', desc: 'Fora das opções acima' },
]

/**
 * Criar comunidade — enxuto de propósito: nome, categoria, descrição, lugar
 * e as duas imagens que dão rosto ao grupo (avatar e capa). Quem cria vira
 * admin automaticamente (trigger no banco) e convida pelo link.
 */
export function CriarComunidadePage() {
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState<CategoriaComunidade>('territorial')
  const [municipio, setMunicipio] = useState('')
  const [uf, setUf] = useState('')
  const [avatar, setAvatar] = useState<{ blob: Blob; url: string } | null>(null)
  const [capa, setCapa] = useState<{ blob: Blob; url: string } | null>(null)
  const [enviando, setEnviando] = useState(false)

  const refAvatar = useRef<HTMLInputElement>(null)
  const refCapa = useRef<HTMLInputElement>(null)

  async function escolherImagem(file: File | undefined, tipo: 'avatar' | 'capa') {
    if (!file) return
    const v = await versoesDeArquivo(file)
    // avatar usa a versão leve (400px basta num círculo); capa usa a cheia
    const blob = tipo === 'avatar' ? (v.thumb ?? v.full) : (v.full ?? v.thumb)
    if (!blob) { toast('Não foi possível processar a imagem.'); return }
    const url = URL.createObjectURL(blob)
    if (tipo === 'avatar') setAvatar({ blob, url })
    else setCapa({ blob, url })
  }

  async function publicar() {
    if (nome.trim().length < 2) { toast('Dê um nome à comunidade.'); return }
    setEnviando(true)
    try {
      const id = await criarComunidade({
        nome,
        descricao: descricao || undefined,
        categoria,
        municipio: municipio || undefined,
        uf: uf || undefined,
        avatarBlob: avatar?.blob,
        capaBlob: capa?.blob,
      })
      toast('Comunidade criada! Convide as primeiras pessoas.', 'sucesso')
      navigate(`/comunidade/${id}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível criar a comunidade.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="page">
      <Header title="Nova comunidade" sub="Reúna pessoas em torno de um lugar ou causa." />

      <div className="page-pad">
        {/* Capa + avatar (a identidade visual do grupo) */}
        <div style={{ position: 'relative', marginBottom: 50 }}>
          <button
            onClick={() => refCapa.current?.click()}
            style={{
              width: '100%', height: 118, borderRadius: 16, cursor: 'pointer',
              border: capa ? 'none' : '1px dashed var(--line)',
              background: capa ? `url('${capa.url}') center/cover no-repeat` : 'var(--card-soft)',
              display: 'grid', placeItems: 'center', color: 'var(--muted)',
            }}
          >
            {!capa && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <IconPhoto size={18} stroke={1.9} /> Adicionar capa
              </span>
            )}
          </button>
          <button
            onClick={() => refAvatar.current?.click()}
            style={{
              position: 'absolute', left: 14, bottom: -34,
              width: 72, height: 72, borderRadius: 20, cursor: 'pointer',
              border: '3px solid var(--bg)',
              background: avatar
                ? `url('${avatar.url}') center/cover no-repeat`
                : 'linear-gradient(135deg, #0D6EA8, #2E9BD6)',
              display: 'grid', placeItems: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,.18)',
            }}
            aria-label="Adicionar logo da comunidade"
          >
            {!avatar && <IconCamera size={24} stroke={1.9} color="#fff" />}
          </button>
          <input ref={refCapa} type="file" accept="image/*" hidden
            onChange={(e) => void escolherImagem(e.target.files?.[0], 'capa')} />
          <input ref={refAvatar} type="file" accept="image/*" hidden
            onChange={(e) => void escolherImagem(e.target.files?.[0], 'avatar')} />
        </div>

        <label className="form-label">Nome da comunidade *</label>
        <input
          className="input"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Guardiões do Rio Itanhaém"
          maxLength={60}
        />

        <div style={{ marginTop: 14 }}>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>Categoria</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CATEGORIAS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoria(c.id)}
                className="card pad"
                style={{
                  textAlign: 'left', cursor: 'pointer',
                  border: categoria === c.id ? '1.5px solid var(--turq)' : '1px solid var(--line)',
                  background: categoria === c.id ? 'color-mix(in srgb, var(--turq) 8%, var(--card))' : 'var(--card)',
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.label}</div>
                <div className="muted" style={{ fontSize: 11 }}>{c.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <label className="form-label" style={{ marginTop: 14 }}>Descrição</label>
        <textarea
          className="input"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="O que esta comunidade faz? Quem pode participar?"
          rows={3}
          maxLength={600}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Município</label>
            <input className="input" value={municipio} onChange={(e) => setMunicipio(e.target.value)} placeholder="Itanhaém" />
          </div>
          <div style={{ width: 88 }}>
            <label className="form-label">UF</label>
            <input className="input" value={uf} onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" maxLength={2} />
          </div>
        </div>

        <button className="btn acento full" style={{ marginTop: 20 }} onClick={publicar} disabled={enviando}>
          <IconUsers size={17} stroke={2} /> {enviando ? 'Criando…' : 'Criar comunidade'}
        </button>
        <p className="muted" style={{ fontSize: 11.5, textAlign: 'center', marginTop: 10 }}>
          Você será o administrador e poderá convidar pessoas e promover co-autores.
        </p>
      </div>
    </div>
  )
}
