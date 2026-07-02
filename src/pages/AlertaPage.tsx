import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { IconMapPin, IconAlertTriangle, IconArrowLeft, IconShare, IconCalendar, IconRefresh, IconCamera, IconUpload } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { MapaLocal } from '../components/MapaLocal'
import { MapaPicker } from '../components/MapaPicker'
import { SeletorCategoria, categoriaPorId } from '../components/SeletorCategoria'
import { CampoGravidade } from '../components/CampoGravidade'
import { SUPABASE_URL, SUPABASE_KEY } from '../services/supabase/config'
import { atualizarAlerta } from '../services/alertas'
import type { CategoriaAlerta, GravidadeAlerta } from '../types/domain'

interface AlertaDetalhe {
  id: string
  titulo: string
  categoria: string
  status: string
  municipio: string
  uf: string
  descricao: string | null
  local_nome: string | null
  gravidade: string | null
  recorrente: boolean
  images: string[] | null
  criada_em: string
  autor_id: string | null
  lat: number | null
  lng: number | null
}

const STATUS_LABELS: Record<string, string> = {
  identificado: 'Identificado',
  'em-observacao': 'Em observação',
  recorrente: 'Recorrente',
  resolvido: 'Resolvido',
}

export function AlertaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [alerta, setAlerta] = useState<AlertaDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [ver, setVer] = useState(0)
  const [acoesVinculadas, setAcoesVinculadas] = useState<import('../types/domain').Mutirao[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  // Edit states
  const [isEditing, setIsEditing] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [editCategoria, setEditCategoria] = useState<CategoriaAlerta | undefined>()
  const [editGravidade, setEditGravidade] = useState<GravidadeAlerta | undefined>()
  const [editDescricao, setEditDescricao] = useState('')
  const [editLat, setEditLat] = useState<number | undefined>()
  const [editLng, setEditLng] = useState<number | undefined>()
  const [editFotos, setEditFotos] = useState<File[]>([])
  const [keptImages, setKeptImages] = useState<string[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  useEffect(() => {
    if (!id) return
    let vivo = true
    import('../services/picos').then(({ carregarMutiroes }) =>
      carregarMutiroes().then((ms) => {
        if (vivo) setAcoesVinculadas(ms.filter((m) => m.alertaId === id))
      })
    ).catch(() => {})
    return () => { vivo = false }
  }, [id, ver])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    
    import('../services/supabase/client').then(({ sb }) => {
      // 1) Verify ownership
      sb().auth.getSession().then(({ data }) => {
        const uid = data.session?.user?.id ?? null
        setUserId(uid)
        if (uid) {
          sb().from('ameacas').select('id').eq('id', id).eq('denunciante_id', uid).single()
            .then(({ data: ameaca }) => {
              if (ameaca) setIsOwner(true)
            })
        }
      })

      // 2) Fetch data as authenticated user so view returns exact coordinates for author
      Promise.resolve(sb().from('ameacas_publicas').select('*').eq('id', id))
        .then(({ data }) => {
          if (data && data.length > 0) {
            const a = data[0] as unknown as AlertaDetalhe
            setAlerta(a)
            setEditCategoria(a.categoria as CategoriaAlerta)
            setEditGravidade(a.gravidade as GravidadeAlerta)
            setEditDescricao(a.descricao ?? '')
            setEditLat(a.lat ?? undefined)
            setEditLng(a.lng ?? undefined)
            setKeptImages(a.images ?? [])
          }
          setLoading(false)
        })
        .catch(() => setLoading(false))
    })
  }, [id, ver])

  if (loading) {
    return (
      <div className="page">
        <Header title="Carregando..." />
        <div className="page-pad" style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" />
        </div>
      </div>
    )
  }

  if (!alerta) {
    return (
      <div className="page">
        <Header title="Alerta não encontrado" />
        <div className="page-pad stack" style={{ textAlign: 'center', paddingTop: 40 }}>
          <IconAlertTriangle size={48} stroke={1.5} color="var(--muted)" />
          <p className="muted">Esse registro não existe ou foi removido.</p>
          <button className="btn acento" onClick={() => navigate('/acoes')}>Voltar para Ações</button>
        </div>
      </div>
    )
  }

  const cat = categoriaPorId(isEditing ? editCategoria! : (alerta.categoria as any))
  const CategoriaIcon = cat?.icone ?? IconAlertTriangle
  const corCategoria = cat?.cor ?? 'var(--muted)'
  const isPico = alerta.categoria === 'Pico de surf'

  const badgeColor =
    alerta.status === 'resolvido'
      ? 'var(--sucesso)'
      : alerta.status === 'arquivado'
        ? 'var(--texto-mutado)'
        : corCategoria

  // Render variables that are safe now that !alerta is checked
  const dataFormatada = new Date(alerta.criada_em).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const localTexto = `${alerta.local_nome ? `${alerta.local_nome} — ` : ''}${alerta.municipio}/${alerta.uf}`

  async function compartilhar() {
    const url = window.location.href
    const coordsTexto = alerta!.lat && alerta!.lng
      ? `\n📍 Coordenadas: ${alerta!.lat.toFixed(5)}, ${alerta!.lng.toFixed(5)}\n🗺️ Google Maps: https://www.google.com/maps?q=${alerta!.lat},${alerta!.lng}`
      : ''
    const texto = `⚠️ Registro Ambiental: ${alerta!.titulo}\n📋 ${alerta!.categoria} · ${STATUS_LABELS[alerta!.status] ?? alerta!.status}\n📍 ${localTexto}${coordsTexto}\n📅 ${dataFormatada}\n\nVeja o registro completo: ${url}`

    if (navigator.share) {
      try {
        await navigator.share({ title: alerta!.titulo, text: texto, url })
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(texto)
      alert('Link e localização copiados!')
    }
  }

  function adicionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const total = keptImages.length + editFotos.length
    const files = Array.from(e.target.files ?? []).slice(0, 3 - total)
    if (files.length === 0) return
    setEditFotos((prev) => [...prev, ...files])
    setPreviewUrls((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
    e.target.value = ''
  }

  function removerKeptImage(path: string) {
    setKeptImages((prev) => prev.filter((p) => p !== path))
  }

  function removerNewImage(i: number) {
    URL.revokeObjectURL(previewUrls[i])
    setEditFotos((prev) => prev.filter((_, idx) => idx !== i))
    setPreviewUrls((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function salvarEdicao() {
    if (!editCategoria || !editGravidade || !editLat || !editLng || !id) return
    setSalvando(true)
    try {
      await atualizarAlerta(id, {
        titulo: `${editCategoria} — ${alerta!.local_nome || alerta!.municipio}`,
        categoria: editCategoria,
        gravidade: editGravidade,
        descricao: editDescricao,
        localNome: alerta!.local_nome ?? undefined,
        municipio: alerta!.municipio,
        uf: alerta!.uf,
        lat: editLat,
        lng: editLng,
        recorrente: alerta!.recorrente,
        checkboxAceite: true,
        images: editFotos,
        keptImages: keptImages,
      })
      setIsEditing(false)
      setEditFotos([])
      setPreviewUrls([])
      setVer(v => v + 1) // Reload data
    } catch (e) {
      alert(`Erro ao salvar: ${e instanceof Error ? e.message : 'desconhecido'}`)
    } finally {
      setSalvando(false)
    }
  }

  function cancelarEdicao() {
    setIsEditing(false)
    setEditCategoria(alerta!.categoria as CategoriaAlerta)
    setEditGravidade(alerta!.gravidade as GravidadeAlerta)
    setEditDescricao(alerta!.descricao ?? '')
    setEditLat(alerta!.lat ?? undefined)
    setEditLng(alerta!.lng ?? undefined)
    setKeptImages(alerta!.images ?? [])
    setEditFotos([])
    setPreviewUrls([])
  }

  return (
    <div className="page">
      <Header title={isEditing ? "Editar Registro" : "Registro Ambiental"} sub={isEditing ? "Modifique os dados abaixo" : alerta.titulo} />
      <div className="page-pad stack" style={{ paddingTop: 16, paddingBottom: 80 }}>
        {/* Badge categoria + compartilhar */}
        {!isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: `${corCategoria}18`, color: corCategoria,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <CategoriaIcon size={24} stroke={2} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{alerta.titulo}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {alerta.categoria} · {STATUS_LABELS[alerta.status] ?? alerta.status}
                </div>
              </div>
            </div>
            <button
              className="btn outline"
              onClick={compartilhar}
              style={{ fontSize: 12, padding: '6px 14px', flexShrink: 0 }}
            >
              <IconShare size={15} /> Compartilhar
            </button>
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>Categoria</h3>
            <SeletorCategoria selecionada={editCategoria} onSelecionar={setEditCategoria} />
          </div>
        )}

        {/* Fotos */}
        {!isEditing ? (
          alerta.images && alerta.images.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {alerta.images.map((path, i) => (
                <img
                  key={i}
                  src={`${SUPABASE_URL}/storage/v1/object/public/fotos/${path}`}
                  alt={`Foto ${i + 1}`}
                  style={{
                    width: alerta.images!.length === 1 ? '100%' : 260,
                    height: 200,
                    objectFit: 'cover',
                    borderRadius: 14,
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          )
        ) : (
          <div>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>Fotos</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {keptImages.map((path) => (
                <div key={path} style={{ position: 'relative', width: 100, height: 100, borderRadius: 12, overflow: 'hidden' }}>
                  <img src={`${SUPABASE_URL}/storage/v1/object/public/fotos/${path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => removerKeptImage(path)}
                    style={{
                      position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%',
                      background: 'rgba(0,0,0,.6)', color: '#fff', border: 0, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                    }}
                  >✕</button>
                </div>
              ))}
              {previewUrls.map((url, i) => (
                <div key={i} style={{ position: 'relative', width: 100, height: 100, borderRadius: 12, overflow: 'hidden' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => removerNewImage(i)}
                    style={{
                      position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%',
                      background: 'rgba(0,0,0,.6)', color: '#fff', border: 0, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
            {keptImages.length + editFotos.length < 3 && (
              <div style={{ display: 'flex', gap: 10 }}>
                <label className="btn outline full" style={{ cursor: 'pointer' }}>
                  <IconCamera size={18} /> Tirar foto
                  <input type="file" accept="image/*" capture="environment" onChange={adicionarFoto} style={{ display: 'none' }} />
                </label>
                <label className="btn outline full" style={{ cursor: 'pointer' }}>
                  <IconUpload size={18} /> Galeria
                  <input type="file" accept="image/*" multiple onChange={adicionarFoto} style={{ display: 'none' }} />
                </label>
              </div>
            )}
          </div>
        )}

        {/* Info card (only view) */}
        {!isEditing && (
          <div className="card pad stack" style={{ gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconMapPin size={16} stroke={2} color="var(--turq)" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{localTexto}</span>
            </div>
            {alerta.lat && alerta.lng && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 24 }}>
                Coordenadas: {alerta.lat.toFixed(5)}, {alerta.lng.toFixed(5)}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconCalendar size={16} stroke={2} color="var(--turq)" />
              <span style={{ fontSize: 13 }}>Registrado em {dataFormatada}</span>
            </div>
            {alerta.gravidade && (
              <div style={{ fontSize: 13 }}>
                <b>Gravidade:</b> {alerta.gravidade}
              </div>
            )}
            {alerta.recorrente && (
              <div style={{ fontSize: 13, color: 'var(--perigo)', marginTop: 4 }}>
                ⚠ Problema recorrente neste local
              </div>
            )}
          </div>
        )}

        {isEditing && (
          <div>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>Gravidade</h3>
            <CampoGravidade
              valor={editGravidade}
              onChange={setEditGravidade}
            />
          </div>
        )}

        {/* Mapa do local */}
        {!isEditing ? (
          alerta.lat != null && alerta.lng != null && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconMapPin size={16} stroke={2} color="var(--turq)" /> Local do registro
              </h3>
              <MapaLocal
                lat={alerta.lat}
                lng={alerta.lng}
                label={alerta.local_nome ?? alerta.titulo}
                height={200}
              />
              <a
                href={`https://www.google.com/maps?q=${alerta.lat},${alerta.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 8,
                  fontSize: 12,
                  color: 'var(--turq)',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                <IconMapPin size={14} /> Abrir no Google Maps
              </a>
            </div>
          )
        ) : (
          <div>
            <h3 style={{ fontSize: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconMapPin size={16} stroke={2} color="var(--turq)" /> Ajustar Localização
            </h3>
            <MapaPicker
              lat={editLat}
              lng={editLng}
              height={200}
              onChange={(newLat, newLng) => {
                setEditLat(newLat)
                setEditLng(newLng)
              }}
            />
          </div>
        )}

        {/* Descrição */}
        {!isEditing ? (
          alerta.descricao && (
            <div>
              <h3 style={{ fontSize: 14, marginBottom: 6 }}>Descrição</h3>
              <p style={{ fontSize: 13, color: 'var(--texto)', lineHeight: 1.6 }}>{alerta.descricao}</p>
            </div>
          )
        ) : (
          <div>
            <h3 style={{ fontSize: 14, marginBottom: 6 }}>Descrição</h3>
            <textarea
              className="input"
              style={{ minHeight: 100, width: '100%', resize: 'none' }}
              placeholder="Descreva a ocorrência detalhadamente..."
              value={editDescricao}
              onChange={(e) => setEditDescricao(e.target.value)}
            />
          </div>
        )}

        {!isEditing && acoesVinculadas.length > 0 && (
          <div className="card pad" style={{ marginTop: 12, borderLeft: '3px solid #2E9B6B' }}>
            <span className="eyebrow" style={{ color: '#2E9B6B' }}>🌱 Esta ocorrência gerou ação</span>
            <div className="stack" style={{ marginTop: 8 }}>
              {acoesVinculadas.map((m) => (
                <Link key={m.id} to={`/mutirao/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.titulo}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{m.quando}{m.horario ? ` · ${m.horario}` : ''} — toque para participar</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!isEditing && (
          <button
            className="btn full"
            style={{ marginTop: 12, background: '#2E9B6B', color: '#fff', fontWeight: 700 }}
            onClick={() => {
              const deLimpeza = ['lixo-praia', 'lixo-rio', 'entulho', 'microplasticos', 'Lixo na praia', 'Lixo no rio', 'Entulho', 'Microplásticos'].includes(alerta.categoria)
              const onde = alerta.local_nome || alerta.municipio || ''
              const titulo = `${deLimpeza ? 'Mutirão de limpeza' : 'Mutirão'}${onde ? ` — ${onde}` : ''}`
              const qs = new URLSearchParams({ titulo, alerta: alerta.id })
              if (alerta.municipio) qs.set('municipio', alerta.municipio)
              if (alerta.uf) qs.set('uf', alerta.uf)
              if (alerta.local_nome) qs.set('local', alerta.local_nome)
              if (alerta.lat != null && alerta.lng != null) { qs.set('lat', String(alerta.lat)); qs.set('lng', String(alerta.lng)) }
              navigate(`/nova-acao/mutirao?${qs.toString()}`)
            }}
          >
            🤝 Criar mutirão para esta ocorrência
          </button>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          {!isEditing ? (
            <>
              <button className="btn outline full" onClick={() => navigate('/acoes')}>
                <IconArrowLeft size={16} /> Voltar
              </button>
              {(isOwner || userId === alerta.autor_id) && (
                <button className="btn outline full" onClick={() => setIsEditing(true)}>
                  Editar
                </button>
              )}
              <button className="btn acento full" onClick={() => setVer(v => v + 1)}>
                <IconRefresh size={16} /> Atualizar
              </button>
            </>
          ) : (
            <>
              <button className="btn outline full" onClick={cancelarEdicao} disabled={salvando}>
                Cancelar
              </button>
              <button className="btn acento full" onClick={salvarEdicao} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
