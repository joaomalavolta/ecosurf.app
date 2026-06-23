import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconCheck, IconMapPin, IconCamera, IconUpload, IconBookmark } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { publicarMutirao, salvarRascunho, type DadosMutirao } from '../services/alertas'
import { statusPerfil } from '../services/perfil'

const TIPOS_ACAO = [
  { id: 'limpeza', label: 'Limpeza de praia / rio / costão' },
  { id: 'educativa', label: 'Ação educativa' },
  { id: 'restauracao', label: 'Restauração ecológica' },
  { id: 'monitoramento', label: 'Monitoramento ambiental' },
  { id: 'outro', label: 'Outro' },
]

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

export function FormularioMutiraoPage() {
  const navigate = useNavigate()
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  // Campos
  const [tipoAcao, setTipoAcao] = useState('limpeza')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [uf, setUf] = useState('')
  const [lat, setLat] = useState<number | undefined>()
  const [lng, setLng] = useState<number | undefined>()
  const [pontoEncontro, setPontoEncontro] = useState('')
  const [quando, setQuando] = useState('')
  const [horarioInicio, setHorarioInicio] = useState('')
  const [horarioFim, setHorarioFim] = useState('')
  const [organizador, setOrganizador] = useState('')
  const [instituicao, setInstituicao] = useState('')
  const [contato, setContato] = useState('')
  const [vagas, setVagas] = useState<number | undefined>()
  const [infoVoluntarios, setInfoVoluntarios] = useState('')
  const [imagemCapa, setImagemCapa] = useState<File | undefined>()
  const [previewUrl, setPreviewUrl] = useState<string | undefined>()

  useEffect(() => {
    statusPerfil().then((s) => {
      if (!s.sessao) {
        window.alert('Faça login para criar um mutirão.')
        navigate('/perfil', { replace: true })
      }
    })
  }, [navigate])

  useEffect(() => {
    if (!lat) {
      obterCoords().then((pos) => {
        if (pos.lat) setLat(pos.lat)
        if (pos.lng) setLng(pos.lng)
      })
    }
  }, [lat])

  function selecionarImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setImagemCapa(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function podePublicar(): boolean {
    return titulo.trim().length > 3 && municipio.trim().length > 0 && uf.trim().length === 2 && !!quando
  }

  async function publicar(comoRascunho = false) {
    if (!lat || !lng) {
      alert('Aguarde a localização GPS ou informe manualmente.')
      return
    }
    setEnviando(true)
    try {
      const dados: DadosMutirao = {
        titulo: titulo.trim(),
        tipoAcao,
        descricao: descricao.trim() || undefined,
        municipio: municipio.trim(),
        uf: uf.toUpperCase(),
        lat,
        lng,
        quando: new Date(quando).toISOString(),
        horarioInicio: horarioInicio || undefined,
        horarioFim: horarioFim || undefined,
        pontoEncontro: pontoEncontro.trim() || undefined,
        organizador: organizador.trim() || undefined,
        instituicao: instituicao.trim() || undefined,
        contato: contato.trim() || undefined,
        vagas: vagas ?? undefined,
        infoVoluntarios: infoVoluntarios.trim() || undefined,
        imagemCapa,
        rascunho: comoRascunho,
      }

      if (comoRascunho) {
        const { imagemCapa: _, ...rest } = dados
        await salvarRascunho('mutirao', rest as Record<string, unknown>)
        alert('Rascunho salvo com sucesso!')
        setEnviando(false)
        return
      }

      await publicarMutirao(dados)
      setSucesso(true)
    } catch (e) {
      alert(`Erro: ${e instanceof Error ? e.message : 'desconhecido'}`)
    } finally {
      setEnviando(false)
    }
  }

  if (sucesso) {
    return (
      <div className="page">
        <Header title="Mutirão criado!" sub="Agora ele está visível para toda a comunidade." />
        <div className="page-pad stack" style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,140,66,0.15)', color: '#FF8C42', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <IconCheck size={36} stroke={2} />
          </div>
          <h2 style={{ fontSize: 20, marginTop: 16 }}>Mutirão publicado!</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>
            O mutirão aparece no mapa e na lista de ações.
            Convide amigos para participar!
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

  return (
    <div className="page">
      <Header title="Criar Mutirão" sub="Organize uma ação ambiental colaborativa." />

      <div className="page-pad stack" style={{ paddingTop: 16, paddingBottom: 100, gap: 16 }}>
        {/* Tipo */}
        <div>
          <label className="form-label">Tipo de ação *</label>
          <select className="input" value={tipoAcao} onChange={(e) => setTipoAcao(e.target.value)}>
            {TIPOS_ACAO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>

        {/* Título */}
        <div>
          <label className="form-label">Título do mutirão *</label>
          <input className="input" placeholder="Ex: Limpeza da Praia do Sonho" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>

        {/* Descrição */}
        <div>
          <label className="form-label">Descrição</label>
          <textarea className="input" placeholder="Conte mais sobre a ação: objetivo, contexto, o que esperar..." value={descricao} onChange={(e) => setDescricao(e.target.value)} style={{ minHeight: 80, resize: 'vertical' }} />
        </div>

        {/* Local */}
        <fieldset style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 14, margin: 0 }}>
          <legend style={{ fontSize: 14, fontWeight: 700, padding: '0 8px' }}>📍 Local da ação</legend>

          {lat && lng && (
            <div className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <IconMapPin size={18} stroke={2} color="var(--turq)" />
              <span className="muted" style={{ fontSize: 12 }}>GPS: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 2 }}>
              <label className="form-label">Cidade *</label>
              <input className="input" placeholder="Itanhaém" value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">UF *</label>
              <input className="input" placeholder="SP" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
            </div>
          </div>

          <div>
            <label className="form-label">Ponto de encontro</label>
            <input className="input" placeholder="Entrada principal da praia, quiosque X..." value={pontoEncontro} onChange={(e) => setPontoEncontro(e.target.value)} />
          </div>
        </fieldset>

        {/* Data e horário */}
        <fieldset style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 14, margin: 0 }}>
          <legend style={{ fontSize: 14, fontWeight: 700, padding: '0 8px' }}>📅 Data e horário</legend>
          <div>
            <label className="form-label">Data *</label>
            <input className="input" type="date" value={quando} onChange={(e) => setQuando(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Início</label>
              <input className="input" type="time" value={horarioInicio} onChange={(e) => setHorarioInicio(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Término</label>
              <input className="input" type="time" value={horarioFim} onChange={(e) => setHorarioFim(e.target.value)} />
            </div>
          </div>
        </fieldset>

        {/* Organizador */}
        <fieldset style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 14, margin: 0 }}>
          <legend style={{ fontSize: 14, fontWeight: 700, padding: '0 8px' }}>👤 Organizador</legend>
          <div>
            <label className="form-label">Nome</label>
            <input className="input" placeholder="Seu nome ou apelido" value={organizador} onChange={(e) => setOrganizador(e.target.value)} />
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="form-label">Instituição, coletivo ou grupo</label>
            <input className="input" placeholder="Ex: Instituto Ecosurf, Coletivo Mar Limpo..." value={instituicao} onChange={(e) => setInstituicao(e.target.value)} />
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="form-label">Contato</label>
            <input className="input" placeholder="Instagram, e-mail ou WhatsApp" value={contato} onChange={(e) => setContato(e.target.value)} />
          </div>
        </fieldset>

        {/* Vagas e info */}
        <fieldset style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 14, margin: 0 }}>
          <legend style={{ fontSize: 14, fontWeight: 700, padding: '0 8px' }}>🙋 Voluntários</legend>
          <div>
            <label className="form-label">Número estimado de vagas</label>
            <input className="input" type="number" min={1} placeholder="30" value={vagas ?? ''} onChange={(e) => setVagas(e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="form-label">Informações para voluntários</label>
            <textarea className="input" placeholder="O que levar, vestimenta, idade mínima, etc." value={infoVoluntarios} onChange={(e) => setInfoVoluntarios(e.target.value)} style={{ minHeight: 70, resize: 'vertical' }} />
          </div>
        </fieldset>

        {/* Imagem de capa */}
        <div>
          <label className="form-label">Imagem de capa</label>
          {previewUrl && (
            <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
              <img src={previewUrl} alt="Capa" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <label className="btn outline full" style={{ cursor: 'pointer' }}>
              <IconCamera size={18} /> Tirar foto
              <input type="file" accept="image/*" capture="environment" onChange={selecionarImagem} hidden />
            </label>
            <label className="btn outline full" style={{ cursor: 'pointer' }}>
              <IconUpload size={18} /> Galeria
              <input type="file" accept="image/*" onChange={selecionarImagem} hidden />
            </label>
          </div>
        </div>
      </div>

      {/* Barra fixa */}
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
        <button className="btn outline" onClick={() => publicar(true)} disabled={enviando} style={{ fontSize: 13 }}>
          <IconBookmark size={16} /> Rascunho
        </button>
        <button className="btn acento full" disabled={!podePublicar() || enviando} onClick={() => publicar(false)}>
          {enviando ? 'Publicando...' : 'Publicar Mutirão'}
        </button>
      </div>
    </div>
  )
}
