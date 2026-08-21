import { useState, useEffect } from 'react'
import { SkeletonFormulario } from '../components/Skeleton'
import { toast } from '../lib/toast'
import { dentroDoBrasil } from '../lib/regiao'
import { useNavigate } from 'react-router-dom'
import { IconUsers,
  IconArrowLeft, IconArrowRight, IconCheck, IconMapPin,
  IconCamera, IconUpload, IconBookmark, IconShieldLock,
} from '@tabler/icons-react'
import { Header } from '../components/Header'
import { MapaPickerLazy as MapaPicker } from '../components/MapasLazy'
import { SeletorCategoria, categoriaPorId, categoriaSensivel } from '../components/SeletorCategoria'
import { CampoGravidade } from '../components/CampoGravidade'
import { CheckboxAceite } from '../components/CheckboxAceite'
import { publicarAlerta, salvarRascunho, type DadosAlerta } from '../services/alertas'
import { SeletorComunidade } from '../components/SeletorComunidade'
import { CorteFoto } from '../components/CorteFotoLazy'
import { arquivoDe } from '../lib/imagem'
import { formatarArea, lerArea, AREA_MAX_M2 } from '../lib/area'
import { statusPerfil } from '../services/perfil'
import type { CategoriaRegistro, GravidadeAlerta, TipoRegistro } from '../types/domain'
import { SUPABASE_URL } from '../services/supabase/config'

/**
 * As etapas do formulário, por família.
 *
 * O registro positivo NÃO passa por "Gravidade": uma tartaruga avistada não
 * tem intensidade para avaliar, e perguntar seria pedir uma resposta sem
 * sentido só para manter as duas telas iguais. Por isso a contagem é derivada
 * da lista, e não seis fixo — senão a barra de progresso e o "Etapa 4 de 6"
 * passariam a mentir na hora em que o passo saísse do caminho.
 */
type Passo = 'categoria' | 'foto' | 'local' | 'gravidade' | 'descricao' | 'revisao'

const PASSOS: Record<TipoRegistro, Passo[]> = {
  alerta: ['categoria', 'foto', 'local', 'gravidade', 'descricao', 'revisao'],
  positivo: ['categoria', 'foto', 'local', 'descricao', 'revisao'],
}

const ROTULO_PASSO: Record<Passo, string> = {
  categoria: 'Categoria',
  foto: 'Foto',
  local: 'Local',
  gravidade: 'Gravidade',
  descricao: 'Descrição',
  revisao: 'Revisão',
}

/** O que muda de palavra entre as duas famílias. */
const COPY: Record<TipoRegistro, {
  header: string
  tituloCategoria: string
  ajudaCategoria: string
  tituloDescricao: string
  placeholderDescricao: string
  aviso: string
  headerSucesso: string
  tituloSucesso: string
  corpoSucesso: string
  corAcento: string
}> = {
  alerta: {
    header: 'Registrar Alerta',
    tituloCategoria: 'Tipo de ocorrência',
    ajudaCategoria: 'Escolha a categoria que melhor descreve o que você observou.',
    tituloDescricao: 'O que está acontecendo? *',
    placeholderDescricao: 'Descreva o que observou: tipo de resíduo, volume, cheiro, proximidade da água, risco para pessoas ou animais...',
    aviso: '🦺 Registre apenas se for seguro. Não toque em resíduos perigosos e não se aproxime de animais silvestres.',
    headerSucesso: 'Seu registro agora faz parte do mapa colaborativo.',
    tituloSucesso: 'Registro publicado com sucesso!',
    corpoSucesso: 'Ele agora faz parte do mapa colaborativo do Ecosurf.app.',
    corAcento: '#E84855',
  },
  positivo: {
    header: 'Registro Positivo',
    tituloCategoria: 'O que você encontrou de bom?',
    ajudaCategoria: 'Fauna, desova, filhotes, vegetação preservada ou coleta seletiva — o mapa também precisa mostrar o que vai bem.',
    tituloDescricao: 'O que você observou? *',
    placeholderDescricao: 'Descreva o que viu: espécie (se souber), quantos indivíduos, comportamento, estado da vegetação ou como funciona o ponto de coleta...',
    aviso: '🐢 Observe de longe. Não toque, não alimente e não use flash — principalmente com ninhos e filhotes.',
    headerSucesso: 'Sua observação agora faz parte do mapa colaborativo.',
    tituloSucesso: 'Registro positivo publicado!',
    corpoSucesso: 'Ele entra no mapa ao lado dos alertas — porque o litoral também é feito do que está dando certo.',
    corAcento: '#2E9B6B',
  },
}

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

export function FormularioAlertaPage({ tipo = 'alerta' }: { tipo?: TipoRegistro }) {
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState(1)
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [alertaCriadoId, setAlertaCriadoId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  const passos = PASSOS[tipo]
  const total = passos.length
  const passo = passos[etapa - 1]
  const copy = COPY[tipo]
  const ehPositivo = tipo === 'positivo'

  // Dados do formulário
  const [categoria, setCategoria] = useState<CategoriaRegistro | undefined>()
  const [comunidadeId, setComunidadeId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('comunidade'),
  )
  const [fotos, setFotos] = useState<File[]>([])
  const [filaCorte, setFilaCorte] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [lat, setLat] = useState<number | undefined>()
  const [lng, setLng] = useState<number | undefined>()
  const [localNome, setLocalNome] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [uf, setUf] = useState('')
  const [gravidade, setGravidade] = useState<GravidadeAlerta | undefined>()
  const [descricao, setDescricao] = useState('')
  const [recorrente, setRecorrente] = useState(false)
  /** Texto cru do campo de área — só a vegetação pergunta. */
  const [area, setArea] = useState('')
  const [aceite, setAceite] = useState(false)

  /**
   * Só a vegetação pergunta o tamanho: é a única categoria em que a área é
   * parte do fato. Um canteiro de restinga e um hectare de mata ciliar são
   * coisas diferentes, e sem o número entram no mapa como o mesmo ponto.
   */
  const pedeArea = categoria === 'vegetacao-recuperacao'
  const areaLida = lerArea(area)

  // Auth check e Carregamento para edição
  useEffect(() => {
    statusPerfil().then(async (s) => {
      if (!s.sessao) {
        toast(ehPositivo
          ? 'Faça login para publicar um registro positivo.'
          : 'Faça login para registrar um alerta ambiental.')
        navigate('/perfil', { replace: true })
        return
      }
      setCarregando(false)
    })
  }, [navigate, ehPositivo])

  // Auto GPS quando a etapa do local abre — por posição na lista, não por
  // número: no registro positivo o "Local" é a mesma etapa 3, mas amarrar ao
  // índice quebraria na primeira vez que a ordem mudasse.
  useEffect(() => {
    if (passo === 'local' && !lat) {
      obterCoords().then((pos) => {
        if (pos.lat) setLat(pos.lat)
        if (pos.lng) setLng(pos.lng)
      })
    }
  }, [passo, lat])

  // Cada foto escolhida entra numa fila de corte 4:3. Padronizar na origem é
  // o que permite exibir tudo com o quadro cheio, sem cortar o assunto nem
  // deixar cada denúncia com uma proporção diferente.
  function adicionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3 - fotos.length)
    if (files.length === 0) return
    setFilaCorte(files)
    e.target.value = ''
  }

  function aoCortarFoto(blob: Blob) {
    const original = filaCorte[0]
    // O nome e o tipo saem do blob, não de um palpite: em aparelho sem
    // encoder webp o corte volta JPEG (ou PNG), e carimbar '.webp' fazia o
    // storage guardar a etiqueta errada. Ver lib/imagem.ts.
    const cortada = arquivoDe(blob, original?.name)
    setFotos((prev) => [...prev, cortada])
    setPreviewUrls((prev) => [...prev, URL.createObjectURL(cortada)])
    setFilaCorte((f) => f.slice(1))
  }

  function removerFoto(i: number) {
    URL.revokeObjectURL(previewUrls[i])
    setFotos((prev) => prev.filter((_, idx) => idx !== i))
    setPreviewUrls((prev) => prev.filter((_, idx) => idx !== i))
  }

  function podeAvancar(): boolean {
    switch (passo) {
      case 'categoria': return !!categoria
      case 'foto': return true // fotos são opcionais
      case 'local': return !!municipio && !!uf
      case 'gravidade': return !!gravidade
      case 'descricao': return descricao.trim().length > 3
      case 'revisao': return aceite
      default: return false
    }
  }

  async function publicar() {
    // Mesma guarda dos outros formulários: num mapa afastado o dedo erra por
    // centenas de quilômetros. Ver lib/regiao.ts e a migration 0060.
    if (lat && lng && !dentroDoBrasil(lng, lat)) {
      toast('Esse ponto está fora do Brasil. Toque no mapa de novo, mais perto do local.')
      return
    }
    if (!categoria || !lat || !lng) return
    if (!ehPositivo && !gravidade) return
    // O CHECK do banco recusa acima de 10 km². Melhor dizer aqui do que
    // deixar o INSERT voltar 23514 no fim do formulário inteiro.
    if (pedeArea && areaLida != null && areaLida > AREA_MAX_M2) {
      toast('Essa área passa de 10 km². Confira o número antes de publicar.')
      return
    }
    setEnviando(true)
    try {
      const catInfo = categoriaPorId(categoria)
      // trim em tudo: um espaço sobrando no município cria uma "outra cidade"
      // no Explorar (que agrupa por nome) — foi o que aconteceu com Itanhaém.
      const municipioLimpo = municipio.trim()
      const localLimpo = localNome.trim()
      const dados: DadosAlerta = {
        titulo: `${catInfo.label} — ${localLimpo || municipioLimpo}`,
        categoria,
        tipoRegistro: tipo,
        // Sem gravidade no positivo: a coluna aceita NULL e é isso que ela quer
        // dizer aqui — "não se aplica", não "média".
        gravidade: ehPositivo ? undefined : gravidade,
        descricao: descricao.trim(),
        localNome: localLimpo || undefined,
        municipio: municipioLimpo,
        uf: uf.trim().toUpperCase(),
        lat,
        lng,
        recorrente,
        areaM2: pedeArea ? lerArea(area) : null,
        checkboxAceite: aceite,
        comunidadeId,
        images: fotos.length > 0 ? fotos : undefined,
      }
      const idCriado = await publicarAlerta(dados)
      setAlertaCriadoId(idCriado)
      setSucesso(true)
    } catch (e) {
      toast(`Erro: ${e instanceof Error ? e.message : 'desconhecido'}`)
    } finally {
      setEnviando(false)
    }
  }

  async function salvarComoRascunho() {
    try {
      await salvarRascunho('alerta', {
        tipoRegistro: tipo,
        categoria, localNome, municipio, uf, lat, lng, gravidade, descricao, recorrente, area,
      })
      toast('Rascunho salvo com sucesso!')
    } catch (e) {
      toast(`Erro: ${e instanceof Error ? e.message : 'desconhecido'}`)
    }
  }

  if (sucesso) {
    return (
      <div className="page">
        <Header title={ehPositivo ? 'Registro positivo publicado' : 'Registro publicado'} sub={copy.headerSucesso} />
        <div className="page-pad stack" style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(31,227,200,0.15)', color: 'var(--turq)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <IconCheck size={36} stroke={2} />
          </div>
          <h2 style={{ fontSize: 20, marginTop: 16 }}>{copy.tituloSucesso}</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>
            {copy.corpoSucesso}
            {!ehPositivo && (
              <>
                <br /><br />
                Caso a situação exija providência oficial, procure diretamente os órgãos públicos competentes.
              </>
            )}
          </p>

          {/* Confirmação de que a proteção agiu. Sem isto, quem marcou o ninho
              com cuidado fica sem saber se o app respeitou o cuidado. */}
          {categoria && categoriaSensivel(categoria) && (
            <div style={{
              marginTop: 16, padding: '10px 12px', borderRadius: 10, textAlign: 'left',
              background: '#0E9AA715', border: '1px solid #0E9AA740',
              fontSize: 12, lineHeight: 1.45, display: 'flex', gap: 8,
            }}>
              <IconShieldLock size={17} stroke={2} color="#0E9AA7" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                O mapa público mostra este ponto de forma aproximada. A coordenada
                exata fica guardada e visível só para você e para a moderação.
              </span>
            </div>
          )}

          {/* Mutirão só faz sentido para problema: não se convoca gente para
              limpar uma tartaruga. */}
          {!ehPositivo && (
            <button
              className="btn full"
              style={{ marginTop: 24, background: '#2E9B6B', color: '#fff', fontWeight: 700 }}
              onClick={() => {
                const deLimpeza = ['lixo-praia', 'lixo-rio', 'entulho', 'microplasticos'].includes(categoria ?? '')
                const onde = (localNome || municipio).trim()
                const titulo = `${deLimpeza ? 'Mutirão de limpeza' : 'Mutirão'}${onde ? ` — ${onde}` : ''}`
                const qs = new URLSearchParams({ titulo })
                if (alertaCriadoId) qs.set('alerta', alertaCriadoId)
                if (municipio) qs.set('municipio', municipio)
                if (uf) qs.set('uf', uf)
                if (localNome) qs.set('local', localNome)
                if (lat != null && lng != null) { qs.set('lat', String(lat)); qs.set('lng', String(lng)) }
                navigate(`/nova-acao/mutirao?${qs.toString()}`)
              }}
            >
              <IconUsers size={17} stroke={2} /> Criar mutirão e convidar a comunidade
            </button>
          )}
          <button className="btn acento full" style={{ marginTop: ehPositivo ? 24 : 8 }} onClick={() => navigate('/mapa')}>
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
        <Header title="" />
        <SkeletonFormulario />
      </div>
    )
  }

  return (
    <div className="page">
      <Header title={copy.header} sub={`Etapa ${etapa} de ${total} — ${ROTULO_PASSO[passo]}`} />

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--cinza)' }}>
        <div style={{ height: '100%', width: `${(etapa / total) * 100}%`, background: 'var(--turq)', borderRadius: 2, transition: 'width .3s ease' }} />
      </div>

      <div className="page-pad stack" style={{ paddingTop: 16, paddingBottom: 100 }}>
        <SeletorComunidade valor={comunidadeId} onChange={setComunidadeId} />

        {passo === 'categoria' && (
          <>
            <h2 style={{ fontSize: 18 }}>{copy.tituloCategoria}</h2>
            <p className="muted" style={{ fontSize: 13 }}>{copy.ajudaCategoria}</p>
            <SeletorCategoria tipo={tipo} selecionada={categoria} onSelecionar={setCategoria} />

            {/* O aviso aparece assim que a categoria sensível é escolhida —
                antes de a pessoa marcar o ponto, que é quando a informação
                ainda muda a decisão dela. */}
            {categoria && categoriaSensivel(categoria) && (
              <div style={{
                padding: '10px 12px', borderRadius: 10,
                background: '#0E9AA715', border: '1px solid #0E9AA740',
                fontSize: 12, color: 'var(--text)', lineHeight: 1.45,
                display: 'flex', gap: 8,
              }}>
                <IconShieldLock size={17} stroke={2} color="#0E9AA7" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  <b>Localização protegida.</b> Ninhos e filhotes atraem quem quer
                  perturbar. O mapa público vai mostrar uma área aproximada; a
                  coordenada exata fica guardada e só você e a moderação enxergam.
                </span>
              </div>
            )}
          </>
        )}

        {passo === 'foto' && (
          <>
            <h2 style={{ fontSize: 18 }}>Foto ou evidência</h2>
            <p className="muted" style={{ fontSize: 13 }}>Adicione até 3 fotos. Isso ajuda na validação do registro.</p>

            <div style={{
              padding: '10px 12px', borderRadius: 10,
              background: '#F59E0B15', border: '1px solid #F59E0B40',
              fontSize: 11.5, color: 'var(--text)', lineHeight: 1.4,
            }}>
              {copy.aviso}
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

        {passo === 'local' && (
          <>
            <h2 style={{ fontSize: 18 }}>Localização</h2>

            {categoria && categoriaSensivel(categoria) && (
              <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.45, margin: 0 }}>
                Marque o ponto <b>exato</b> mesmo assim: ele é guardado com
                precisão para a moderação e para pesquisa. Quem é aproximado é
                só o que aparece no mapa público.
              </p>
            )}

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
                      toast('Não foi possível obter GPS.')
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

        {passo === 'gravidade' && (
          <>
            <h2 style={{ fontSize: 18 }}>Gravidade percebida</h2>
            <p className="muted" style={{ fontSize: 13 }}>Como você avalia a intensidade do problema?</p>
            <CampoGravidade valor={gravidade} onChange={setGravidade} />
          </>
        )}

        {passo === 'descricao' && (
          <>
            <h2 style={{ fontSize: 18 }}>Descrição</h2>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>{copy.tituloDescricao}</label>
              <textarea
                className="input"
                placeholder={copy.placeholderDescricao}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                style={{ minHeight: 100, resize: 'vertical' }}
              />
            </div>

            {pedeArea && (
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Área aproximada (m²)
                </label>
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="Ex.: 1850"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
                <p className="muted" style={{ fontSize: 11.5, marginTop: 5, lineHeight: 1.45 }}>
                  Opcional, e um palpite serve — "mais ou menos meio campo de
                  futebol" é 3.500 m². {areaLida != null && <b>{formatarArea(areaLida)}</b>}
                  {area.trim() && areaLida == null && (
                    <span style={{ color: 'var(--coral)' }}> Não entendi esse número.</span>
                  )}
                  {areaLida != null && areaLida > AREA_MAX_M2 && (
                    <span style={{ color: 'var(--coral)' }}> — acima do limite de 10 km²; confira o número.</span>
                  )}
                </p>
              </div>
            )}

            {/* "Recorrente" tem os dois sentidos, e os dois são úteis: um
                problema que volta pede cobrança; uma fauna que volta é o
                indício de que o lugar virou território dela. */}
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--line)', cursor: 'pointer' }}>
              <input type="checkbox" checked={recorrente} onChange={(e) => setRecorrente(e.target.checked)} style={{ accentColor: 'var(--turq)' }} />
              <span style={{ fontSize: 13 }}>
                {ehPositivo
                  ? 'Costuma acontecer neste local (não foi uma vez só)'
                  : 'O problema parece recorrente neste local'}
              </span>
            </label>
          </>
        )}

        {passo === 'revisao' && (
          <>
            <h2 style={{ fontSize: 18 }}>Revisão e publicação</h2>

            <div className="card pad stack" style={{ gap: 8 }}>
              <div><span className="muted" style={{ fontSize: 12 }}>Categoria:</span> <b>{categoria ? categoriaPorId(categoria).label : '—'}</b></div>
              <div><span className="muted" style={{ fontSize: 12 }}>Fotos:</span> {fotos.length} imagem(ns)</div>
              <div><span className="muted" style={{ fontSize: 12 }}>Local:</span> {localNome || '—'} — {municipio}/{uf}</div>
              {!ehPositivo && <div><span className="muted" style={{ fontSize: 12 }}>Gravidade:</span> <b>{gravidade ?? '—'}</b></div>}
              <div><span className="muted" style={{ fontSize: 12 }}>Recorrente:</span> {recorrente ? 'Sim' : 'Não'}</div>
              {pedeArea && areaLida != null && (
                <div><span className="muted" style={{ fontSize: 12 }}>Área:</span> <b>{formatarArea(areaLida)}</b></div>
              )}
              {categoria && categoriaSensivel(categoria) && (
                <div style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6, color: '#0E9AA7', fontWeight: 600 }}>
                  <IconShieldLock size={15} stroke={2} /> Local aproximado no mapa público
                </div>
              )}
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
          <button className="btn outline" style={{ flex: 0 }} onClick={() => setEtapa((e) => Math.max(1, e - 1))}>
            <IconArrowLeft size={18} />
          </button>
        )}

        {etapa < total && (
          <button className="btn outline" onClick={salvarComoRascunho} style={{ flex: 0, fontSize: 13 }}>
            <IconBookmark size={16} /> Rascunho
          </button>
        )}

        <div style={{ flex: 1 }} />

        {etapa < total ? (
          <button className="btn acento" disabled={!podeAvancar()} onClick={() => setEtapa((e) => Math.min(total, e + 1))}>
            Próximo <IconArrowRight size={16} />
          </button>
        ) : (
          <button className="btn acento full" disabled={!aceite || enviando} onClick={publicar}>
            {enviando ? 'Publicando...' : ehPositivo ? 'Publicar Registro Positivo' : 'Publicar Registro'}
          </button>
        )}
      </div>

      {filaCorte.length > 0 && (
        <CorteFoto
          key={filaCorte.length}
          arquivo={filaCorte[0]}
          proporcao={4 / 3}
          maxLargura={1600}
          titulo={filaCorte.length > 1 ? `Enquadre a foto (${filaCorte.length} restantes)` : 'Enquadre a foto'}
          onPronto={aoCortarFoto}
          onCancelar={() => setFilaCorte((f) => f.slice(1))}
        />
      )}
    </div>
  )
}
