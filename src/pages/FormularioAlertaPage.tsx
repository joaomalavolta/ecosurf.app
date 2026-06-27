import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconArrowRight, IconCheck, IconMapPin,
  IconCamera, IconUpload, IconBookmark,
} from '@tabler/icons-react'
import { Header } from '../components/Header'
import { MapaPicker } from '../components/MapaPicker'
import { SeletorCategoria, categoriaPorId } from '../components/SeletorCategoria'
import { CampoGravidade } from '../components/CampoGravidade'
import { CheckboxAceite } from '../components/CheckboxAceite'
import { publicarAlerta, atualizarAlerta, carregarAlertaParaEdicao, salvarRascunho, type DadosAlerta } from '../services/alertas'
import { statusPerfil } from '../services/perfil'
import type { CategoriaAlerta, GravidadeAlerta } from '../types/domain'
import { SUPABASE_URL } from '../services/supabase/config'

type Etapa = 1 | 2 | 3 | 4 | 5 | 6

const ETAPA_LABELS = ['Categoria', 'Foto', 'Local', 'Gravidade', 'Descrição', 'Revisão']

function obterCoords(): Promise<{ lat?: number; lng?: number }> {
  return new Promise((res) => {
    if (!navigator.geolocation) return res({})
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res({}),
      { enableHighAccuracy: true, timeout: 5000 },
    )
  })
}

export function FormularioAlertaPage() {
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState<Etapa>(1)
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [carregando, setCarregando] = useState(false)

  // Dados do formulário
  const [categoria, setCategoria] = useState<CategoriaAlerta | undefined>()
  const [fotos, setFotos] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [lat, setLat] = useState<number | undefined>()
  const [lng, setLng] = useState<number | undefined>()
  const [localNome, setLocalNome] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [uf, setUf] = useState('')
  const [gravidade, setGravidade] = useState<GravidadeAlerta | undefined>()
  const [descricao, setDescricao] = useState('')
  const [recorrente, setRecorrente] = useState(false)
  const [aceite, setAceite] = useState(false)

  // Auth check e Carregamento para edição
  useEffect(() => {
    statusPerfil().then(async (s) => {
      if (!s.sessao) {
        window.alert('Faça login para registrar um alerta ambiental.')
        navigate('/perfil', { replace: true })
        return
      }
      
      if (id) {
        try {
          const dados = await carregarAlertaParaEdicao(id)
          setCategoria(dados.categoria)
          setGravidade(dados.gravidade)
          setDescricao(dados.descricao ?? '')
          setLocalNome(dados.localNome ?? '')
          setMunicipio(dados.municipio)
          setUf(dados.uf)
          setLat(dados.lat)
          setLng(dados.lng)
          setRecorrente(dados.recorrente ?? false)
          setAceite(dados.checkboxAceite)
          
          if (dados.imagesUrl && dados.imagesUrl.length > 0) {
            setPreviewUrls(dados.imagesUrl.map(path => `${SUPABASE_URL}/storage/v1/object/public/fotos/${path}`))
            // Note: We don't populate 'fotos' (File objects) for pre-existing images 
            // since we can't easily turn URLs back to Files without fetching them.
            // If they want to change photos, they will have to upload new ones which will overwrite.
          }
        } catch (e) {
          alert('Erro ao carregar registro para edição.')
          navigate('/acoes', { replace: true })
        } finally {
          setCarregando(false)
        }
      }
    })
  }, [id, navigate])

  // Auto GPS na etapa 3
  useEffect(() => {
    if (etapa === 3 && !lat) {
      obterCoords().then((pos) => {
        if (pos.lat) setLat(pos.lat)
        if (pos.lng) setLng(pos.lng)
      })
    }
  }, [etapa, lat])

  function adicionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3 - fotos.length)
    if (files.length === 0) return
    setFotos((prev) => [...prev, ...files])
    setPreviewUrls((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
    e.target.value = ''
  }

  function removerFoto(i: number) {
    URL.revokeObjectURL(previewUrls[i])
    setFotos((prev) => prev.filter((_, idx) => idx !== i))
    setPreviewUrls((prev) => prev.filter((_, idx) => idx !== i))
  }

  function podeAvancar(): boolean {
    switch (etapa) {
      case 1: return !!categoria
      case 2: return true // fotos são opcionais
      case 3: return !!municipio && !!uf
      case 4: return !!gravidade
      case 5: return descricao.trim().length > 3
      case 6: return aceite
      default: return false
    }
  }

  async function publicar() {
    if (!categoria || !gravidade || !lat || !lng) return
    setEnviando(true)
    try {
      const catInfo = categoriaPorId(categoria)
      const dados: DadosAlerta = {
        titulo: `${catInfo.label} — ${localNome || municipio}`,
        categoria,
        gravidade,
        descricao,
        localNome: localNome || undefined,
        municipio,
        uf,
        lat,
        lng,
        recorrente,
        checkboxAceite: aceite,
        images: fotos.length > 0 ? fotos : undefined,
      }
      if (id) {
        await atualizarAlerta(id, dados)
      } else {
        await publicarAlerta(dados)
      }
      setSucesso(true)
    } catch (e) {
      alert(`Erro: ${e instanceof Error ? e.message : 'desconhecido'}`)
    } finally {
      setEnviando(false)
    }
  }

  async function salvarComoRascunho() {
    try {
      await salvarRascunho('alerta', {
        categoria, localNome, municipio, uf, lat, lng, gravidade, descricao, recorrente,
      })
      alert('Rascunho salvo com sucesso!')
    } catch (e) {
      alert(`Erro: ${e instanceof Error ? e.message : 'desconhecido'}`)
    }
  }

  if (sucesso) {
    return (
      <div className="page">
        <Header title="Registro publicado" sub="Seu registro agora faz parte do mapa colaborativo." />
        <div className="page-pad stack" style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(31,227,200,0.15)', color: 'var(--turq)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <IconCheck size={36} stroke={2} />
          </div>
          <h2 style={{ fontSize: 20, marginTop: 16 }}>Registro publicado com sucesso!</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>
            Ele agora faz parte do mapa colaborativo do Ecosurf.app.
            <br /><br />
            Caso a situação exija providência oficial, procure diretamente os órgãos públicos competentes.
          </p>
          <button className="btn acento full" style={{ marginTop: 24 }} onClick={() => navigate('/mapa')}>
            Ver no mapa
          </button>
          <button className="btn outline full" style={{ marginTop: 8 }} onClick={() => navigate('/acoes')}>
            Voltar às ações
          </button>
        </div>
      </div>
    )
  }

  if (carregando) {
    return (
      <div className="page">
        <Header title="Carregando..." />
        <div className="page-pad" style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <Header title={id ? "Editar Registro" : "Registrar Alerta"} sub={`Etapa ${etapa} de 6 — ${ETAPA_LABELS[etapa - 1]}`} />

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--cinza)' }}>
        <div style={{ height: '100%', width: `${(etapa / 6) * 100}%`, background: 'var(--turq)', borderRadius: 2, transition: 'width .3s ease' }} />
      </div>

      <div className="page-pad stack" style={{ paddingTop: 16, paddingBottom: 100 }}>
        {/* Etapa 1: Categoria */}
        {etapa === 1 && (
          <>
            <h2 style={{ fontSize: 18 }}>Tipo de ocorrência</h2>
            <p className="muted" style={{ fontSize: 13 }}>Escolha a categoria que melhor descreve o que você observou.</p>
            <SeletorCategoria selecionada={categoria} onSelecionar={setCategoria} />
          </>
        )}

        {/* Etapa 2: Foto */}
        {etapa === 2 && (
          <>
            <h2 style={{ fontSize: 18 }}>Foto ou evidência</h2>
            <p className="muted" style={{ fontSize: 13 }}>Adicione até 3 fotos. Isso ajuda na validação do registro.</p>

            <div style={{
              padding: '10px 12px', borderRadius: 10,
              background: '#F59E0B15', border: '1px solid #F59E0B40',
              fontSize: 11.5, color: 'var(--text)', lineHeight: 1.4,
            }}>
              🦺 Registre apenas se for seguro. Não toque em resíduos perigosos e não se aproxime de animais silvestres.
            </div>

            {previewUrls.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {previewUrls.map((url, i) => (
                  <div key={i} style={{ position: 'relative', width: 100, height: 100, borderRadius: 12, overflow: 'hidden' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => removerFoto(i)}
                      style={{
                        position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%',
                        background: 'rgba(0,0,0,.6)', color: '#fff', border: 0, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {fotos.length < 3 && (
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

            <p className="muted" style={{ fontSize: 12, textAlign: 'center' }}>
              {fotos.length === 0 ? 'Opcional — você pode pular esta etapa' : `${fotos.length}/3 foto(s)`}
            </p>
          </>
        )}

        {/* Etapa 3: Localização */}
        {etapa === 3 && (
          <>
            <h2 style={{ fontSize: 18 }}>Localização</h2>

            {/* Mini-mapa com pin arrastável */}
            <MapaPicker
              lat={lat}
              lng={lng}
              height={180}
              onChange={(newLat, newLng) => {
                setLat(newLat)
                setLng(newLng)
              }}
            />

            {/* Botão GPS + coordenadas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="btn outline"
                style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}
                onClick={() => {
                  obterCoords().then((pos) => {
                    if (pos.lat && pos.lng) {
                      setLat(pos.lat)
                      setLng(pos.lng)
                    } else {
                      alert('Não foi possível obter GPS.')
                    }
                  })
                }}
              >
                <IconMapPin size={14} stroke={2} /> Usar meu GPS
              </button>
              {lat && lng && (
                <span className="muted" style={{ fontSize: 11 }}>
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </span>
              )}
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Nome do local</label>
              <input className="input" placeholder="Praia, rio, rua, bairro ou ponto de referência" value={localNome} onChange={(e) => setLocalNome(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Cidade *</label>
                <input className="input" placeholder="Ex: Itanhaém" value={municipio} onChange={(e) => setMunicipio(e.target.value)} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Estado *</label>
                <input className="input" placeholder="SP" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} required />
              </div>
            </div>
          </>
        )}

        {/* Etapa 4: Gravidade */}
        {etapa === 4 && (
          <>
            <h2 style={{ fontSize: 18 }}>Gravidade percebida</h2>
            <p className="muted" style={{ fontSize: 13 }}>Como você avalia a intensidade do problema?</p>
            <CampoGravidade valor={gravidade} onChange={setGravidade} />
          </>
        )}

        {/* Etapa 5: Descrição */}
        {etapa === 5 && (
          <>
            <h2 style={{ fontSize: 18 }}>Descrição</h2>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>O que está acontecendo? *</label>
              <textarea
                className="input"
                placeholder="Descreva o que observou: tipo de resíduo, volume, cheiro, proximidade da água, risco para pessoas ou animais..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                style={{ minHeight: 100, resize: 'vertical' }}
              />
            </div>

            <label style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--line)', cursor: 'pointer' }}>
              <input type="checkbox" checked={recorrente} onChange={(e) => setRecorrente(e.target.checked)} style={{ accentColor: 'var(--turq)' }} />
              <span style={{ fontSize: 13 }}>O problema parece recorrente neste local</span>
            </label>
          </>
        )}

        {/* Etapa 6: Revisão */}
        {etapa === 6 && (
          <>
            <h2 style={{ fontSize: 18 }}>Revisão e publicação</h2>

            <div className="card pad stack" style={{ gap: 8 }}>
              <div><span className="muted" style={{ fontSize: 12 }}>Categoria:</span> <b>{categoria ? categoriaPorId(categoria).label : '—'}</b></div>
              <div><span className="muted" style={{ fontSize: 12 }}>Fotos:</span> {fotos.length} imagem(ns)</div>
              <div><span className="muted" style={{ fontSize: 12 }}>Local:</span> {localNome || '—'} — {municipio}/{uf}</div>
              <div><span className="muted" style={{ fontSize: 12 }}>Gravidade:</span> <b>{gravidade ?? '—'}</b></div>
              <div><span className="muted" style={{ fontSize: 12 }}>Recorrente:</span> {recorrente ? 'Sim' : 'Não'}</div>
              {descricao && <div style={{ fontSize: 13, marginTop: 4, padding: '8px 10px', background: 'var(--cinza)', borderRadius: 8 }}>{descricao.slice(0, 200)}{descricao.length > 200 ? '...' : ''}</div>}
            </div>

            <CheckboxAceite aceito={aceite} onChange={setAceite} />
          </>
        )}
      </div>

      {/* Barra de navegação fixa */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(var(--altura-nav) + env(safe-area-inset-bottom, 0px))',
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 'var(--largura-app)',
        padding: '12px 18px',
        background: 'var(--bg)',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        gap: 10,
        zIndex: 40,
      }}>
        {etapa > 1 && (
          <button className="btn outline" style={{ flex: 0 }} onClick={() => setEtapa((e) => Math.max(1, e - 1) as Etapa)}>
            <IconArrowLeft size={18} />
          </button>
        )}

        {etapa < 6 && (
          <button className="btn outline" onClick={salvarComoRascunho} style={{ flex: 0, fontSize: 13 }}>
            <IconBookmark size={16} /> Rascunho
          </button>
        )}

        <div style={{ flex: 1 }} />

        {etapa < 6 ? (
          <button className="btn acento" disabled={!podeAvancar()} onClick={() => setEtapa((e) => Math.min(6, e + 1) as Etapa)}>
            Próximo <IconArrowRight size={16} />
          </button>
        ) : (
          <button className="btn acento full" disabled={!aceite || enviando} onClick={publicar}>
            {enviando ? 'Publicando...' : 'Publicar Registro'}
          </button>
        )}
      </div>
    </div>
  )
}
