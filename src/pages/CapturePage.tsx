import { useEffect, useRef, useState, useMemo, lazy, Suspense } from 'react'
import { toast } from '../lib/toast'
import { useNavigate } from 'react-router-dom'
import { usePinchZoom } from '../hooks/usePinchZoom'
import { IconUsers, IconPlus,
  IconX,
  IconCamera,
  IconVideo,
  IconMapPin,
  IconRipple,
  IconAlertTriangle,
  IconTrash,
  IconCheck,
  IconPhoto,
  IconCurrentLocation,
  IconMap2,
} from '@tabler/icons-react'
import { enfileirar, definirTipo } from '../offline/uploadQueue'
import { gravarClipe, validarVideoGaleria, carregarVideoParaPoster, recortarVideoParaClipe, melhorMimeGravacao, type GravacaoAtiva } from '../lib/video'
import { SeletorComunidade } from '../components/SeletorComunidade'
import { ConfirmarPico } from '../components/ConfirmarPico'

const MapaPicker = lazy(() => import('../components/MapaPicker').then((m) => ({ default: m.MapaPicker })))
import { acaoDoVoltar } from './captura-voltar'
import { RecortarVideo } from '../components/RecortarVideo'
import { SeletorCategoria } from '../components/SeletorCategoria'
import { CampoGravidade } from '../components/CampoGravidade'
import { statusPerfil } from '../services/perfil'
import { BotaoVoltarOverlay } from '../components/BotaoVoltarOverlay'

type TipoRegistro = 'report' | 'alerta' | 'lixo'
const SIGLA_UF: Record<string, string> = {
  'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM', 'Bahia': 'BA',
  'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES', 'Goiás': 'GO',
  'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG',
  'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR', 'Pernambuco': 'PE', 'Piauí': 'PI',
  'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN', 'Rio Grande do Sul': 'RS',
  'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC', 'São Paulo': 'SP',
  'Sergipe': 'SE', 'Tocantins': 'TO',
}

type Etapa = 'tipo' | 'localizacao' | 'onde-quando' | 'camera' | 'confirmar-pico' | 'selecionar-pico' | 'classificar-alerta' | 'concluido'

/** Data de hoje em 'YYYY-MM-DD' (max do seletor: sem registro no futuro). */
function hojeISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const campoDataEstilo: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)',
  color: '#fff', fontSize: 14, fontFamily: 'inherit',
}

function obterCoords(): Promise<{ lat?: number; lng?: number; precisaoM?: number }> {
  return new Promise((res) => {
    if (!navigator.geolocation) return res({})
    navigator.geolocation.getCurrentPosition(
      // A precisão (accuracy) sempre veio do navegador e era descartada. Ela é
      // decisiva: com erro de 80m, "o pico mais próximo" pode ser o errado.
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, precisaoM: p.coords.accuracy }),
      () => res({}),
      { enableHighAccuracy: true, timeout: 6000 },
    )
  })
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const TIPOS: { id: TipoRegistro; icone: typeof IconRipple; titulo: string; desc: string; cor: string }[] = [
  { id: 'report', icone: IconRipple, titulo: 'Report do mar', desc: 'Registro das condições de surf agora', cor: '#1ECBC3' },
  { id: 'alerta', icone: IconAlertTriangle, titulo: 'Alerta ambiental', desc: 'Esgoto, erosão, obra, poluição, óleo', cor: '#E84855' },
  { id: 'lixo', icone: IconTrash, titulo: 'Lixo na praia', desc: 'Resíduo na praia ou no mar', cor: '#FF8C42' },
]

export function CapturePage() {
  const [etapa, setEtapa] = useState<Etapa>('tipo')
  const [tipo, setTipo] = useState<TipoRegistro | null>(null)
  const [comunidadeId, setComunidadeId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // Vídeo de até 5s: gravação (segurar o botão) ou galeria (com porteiro).
  const gravacaoRef = useRef<GravacaoAtiva | null>(null)
  const timerSegurar = useRef<ReturnType<typeof setTimeout> | null>(null)
  const segurou = useRef(false)
  const [gravando, setGravando] = useState(false)
  const [progGrav, setProgGrav] = useState(0)
  const [erroVideo, setErroVideo] = useState<string | null>(null)
  /** 0..1 enquanto recorta um vídeo da galeria; null quando não há corte em curso. */
  const [procVideo, setProcVideo] = useState<number | null>(null)
  /** Arquivo aguardando o autor escolher o trecho de 5s na linha de edição. */
  const [recortando, setRecortando] = useState<File | null>(null)
  // Clipe de vídeo do registro atual. Ref (não state) porque setState é
  // assíncrono e finalizarUpload podia lê-lo ANTES da atualização — o clipe
  // se perdia e o registro "sumia". O ref atualiza na hora.
  const videoCapturadoRef = useRef<{ blob: Blob; mime: string; duracaoS: number } | undefined>(undefined)
  const definirVideoCapturado = (v: { blob: Blob; mime: string; duracaoS: number } | undefined) => {
    videoCapturadoRef.current = v
  }
  const podeGravar = useMemo(() => !!melhorMimeGravacao(), [])
  const cameraBoxRef = useRef<HTMLDivElement>(null)
  const uploadId = useRef<string | null>(null)
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const [picoSelecionado] = useState<string | null>(new URLSearchParams(window.location.search).get('pico'))
  const [blobCapturado, setBlobCapturado] = useState<Blob | undefined>()
  const [thumbCapturado, setThumbCapturado] = useState<Blob | undefined>()
  const [posCapturada, setPosCapturada] = useState<{lat?: number, lng?: number, precisaoM?: number}>({})
  // Confirmação do vínculo: o "mais próximo vence" pode errar quando há picos
  // colados (há duplicatas a 120m no acervo) ou quando o GPS está impreciso.
  // A foto espera aqui até o autor confirmar para qual pico ela vai.
  const [confirmar, setConfirmar] = useState<{
    blob?: Blob
    thumb?: Blob
    pos: { lat?: number; lng?: number; precisaoM?: number }
    candidatos: { pico: import('../types/domain').Pico; metros: number }[]
    escolhido: string
    ambiguo: boolean
  } | null>(null)
  const [novaPraiaNome, setNovaPraiaNome] = useState('')
  const [novoPicoNome, setNovoPicoNome] = useState('')
  const [novaOndaNome, setNovaOndaNome] = useState('')
  
  const [picosExistentes, setPicosExistentes] = useState<import('../types/domain').Pico[]>([])
  const [modoNovoPico, setModoNovoPico] = useState(false)

  // Picos a até 300 m de onde a pessoa está: se existem, criar outro aqui é
  // quase certamente uma duplicata. (O banco também barra nome-eco a <600 m,
  // mas o aviso aqui evita que ela chegue a esbarrar no erro.)
  const picosProximosDaqui = useMemo(() => {
    if (!posCapturada.lat || !posCapturada.lng) return []
    return picosExistentes
      .map((p) => ({ pico: p, metros: Math.round(haversineKm(posCapturada.lat!, posCapturada.lng!, p.lat, p.lng) * 1000) }))
      .filter((c) => c.metros <= 300)
      .sort((a, b) => a.metros - b.metros)
      .slice(0, 3)
  }, [posCapturada, picosExistentes])
  const [picoFinal, setPicoFinal] = useState<string | null>(null)
  const [catAlerta, setCatAlerta] = useState<import('../types/domain').CategoriaAlerta | undefined>()
  const [gravAlerta, setGravAlerta] = useState<import('../types/domain').GravidadeAlerta | undefined>()
  const [aceiteAlerta, setAceiteAlerta] = useState(false)
  const [municipioAlerta, setMunicipioAlerta] = useState('')
  const [ufAlerta, setUfAlerta] = useState('')
  const [alertaCriadoId, setAlertaCriadoId] = useState<string | null>(null)
  const [publicandoAlerta, setPublicandoAlerta] = useState(false)
  const [buscandoLocalAlerta, setBuscandoLocalAlerta] = useState(false)
  const [mostrarMapaAlerta, setMostrarMapaAlerta] = useState(false)
  const [alertaNaFila, setAlertaNaFila] = useState(false)
  const [picoAutoNome, setPicoAutoNome] = useState<string | null>(null)
  const [picoAutoId, setPicoAutoId] = useState<string | null>(null)
  const [noLocal, setNoLocal] = useState<boolean | null>(null)
  // "Não estou no local": o ponto vem do mapa e a data é escolhida (pode ser
  // registro de outro dia/lugar). Sem GPS, "aqui e agora" seria mentira.
  const [localManual, setLocalManual] = useState<{ lat: number; lng: number } | null>(null)
  const [dataRegistro, setDataRegistro] = useState('') // 'YYYY-MM-DD'
  const [horaRegistro, setHoraRegistro] = useState('') // 'HH:MM' (opcional)
  const [detectandoGps, setDetectandoGps] = useState(false)

  useEffect(() => {
    import('../services/picos').then(({ carregarPicos }) =>
      carregarPicos().then(setPicosExistentes)
    ).catch(() => { /* sem lista: o formulário de novo local cobre */ })
  }, [])

  useEffect(() => {
    let vivo = true
    statusPerfil().then((s) => {
      if (!vivo) return
      if (!s.sessao) {
        toast('Faça login para poder registrar.')
        navigate('/perfil', { replace: true })
      } else {
        setCarregando(false)
      }
    })
    return () => { vivo = false }
  }, [navigate])

  // Botão voltar físico do Android / popstate do navegador.
  //
  // Antes, este efeito empilhava um pushState a CADA mudança de etapa e de
  // 'recortando'. No fluxo do vídeo da galeria as transições são rápidas
  // (recortando→null, depois etapa→selecionar-pico), gerando entradas em
  // cascata; um popstate espúrio caía em setEtapa('confirmar-pico') sem haver
  // 'confirmar', e a tela sumia sem botão publicar. Agora empilhamos UMA vez
  // ao entrar no overlay e lemos a etapa atual por ref no momento do voltar.
  const etapaRef = useRef(etapa)
  etapaRef.current = etapa
  const recortandoRef = useRef(recortando)
  recortandoRef.current = recortando

  useEffect(() => {
    // Só interessa quando há um overlay ativo (fora de 'tipo'/'concluido').
    if (etapa === 'tipo' || etapa === 'concluido') return

    window.history.pushState({ captureOverlay: true }, '')

    const lidarComPopState = () => {
      // Decisão na função pura testada (src/pages/captura-voltar.ts) —
      // blinda o bug de 'selecionar-pico' cair em 'confirmar-pico' vazio.
      const acao = acaoDoVoltar({
        recortando: !!recortandoRef.current,
        etapa: etapaRef.current,
      })
      switch (acao.tipo) {
        case 'fechar-recorte':
          setRecortando(null)
          break
        case 'abrir-camera':
          setConfirmar(null)
          definirVideoCapturado(undefined)
          setBlobCapturado(undefined)
          setThumbCapturado(undefined)
          void abrirCamera()
          break
        case 'ir-etapa':
          setEtapa(acao.etapa)
          break
      }
    }

    window.addEventListener('popstate', lidarComPopState)
    return () => window.removeEventListener('popstate', lidarComPopState)
    // Registra o overlay UMA vez por entrada real (transição de fora do overlay
    // para dentro). As transições internas usam os refs, sem re-empilhar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa === 'tipo' || etapa === 'concluido'])


  // Quando o user diz "sim, estou no local", detectar GPS e achar pico
  async function detectarLocalEAbrir() {
    setDetectandoGps(true)
    const pos = await obterCoords()
    setPosCapturada(pos)

    // A promessa do manual, enfim ligada: "estou no local" + pico a ≤600m
    // = vínculo automático. A UI desta detecção sempre existiu (selo na
    // câmera, "enviada direto para X") — mas picoAutoNome nunca era setado.
    if (pos.lat && pos.lng && picosExistentes.length > 0) {
      const maisPerto = picosExistentes
        .map((p) => ({ p, d: haversineKm(pos.lat!, pos.lng!, p.lat, p.lng) }))
        .sort((a, b) => a.d - b.d)[0]
      if (maisPerto && maisPerto.d <= 0.6) {
        setPicoAutoId(maisPerto.p.id)
        setPicoAutoNome(maisPerto.p.nome)
      }
    }

    if (pos.lat && pos.lng) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json&zoom=14`)
        const geo = await geoRes.json()
        const praiaSugerida = geo.address?.suburb || geo.address?.village || geo.address?.neighbourhood || geo.address?.city || ''
        if (praiaSugerida) setNovaPraiaNome(praiaSugerida)
      } catch { /* ignorar */ }
    }
    setDetectandoGps(false)
    abrirCamera()
  }

  async function abrirCamera() {
    setErro(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      setEtapa('camera')
    } catch {
      setErro('Câmera indisponível neste dispositivo ou permissão negada.')
      setEtapa('camera')
    }
  }

  useEffect(() => {
    if (etapa === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [etapa])

  // Pinça para zoom na câmera (e impede o zoom-de-página que movia a tela).
  const { zoomDisponivel, zoomAtual } = usePinchZoom(cameraBoxRef, streamRef, etapa === 'camera')

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // ─── Vídeo (≤5s) ───────────────────────────────────────────────────────
  // Dois caminhos, um destino: câmera (selo "no local") e galeria (selo
  // "galeria"). Ambos terminam em disparar(), reusando GPS, vínculo ao pico
  // e a decisão de procedência que já existem para a foto.
  function iniciarGravacao() {
    const stream = streamRef.current
    if (!stream || gravando) return
    const g = gravarClipe(stream, setProgGrav)
    if (!g) {
      setErroVideo('Este aparelho não permite gravar vídeo pelo navegador. A foto continua funcionando.')
      return
    }
    gravacaoRef.current = g
    setErroVideo(null)
    setGravando(true)
    void g.clipe
      .then(async (clipe) => {
        setGravando(false)
        setProgGrav(0)
        const v = videoRef.current
        if (!v || v.videoWidth === 0) return
        const { versoesDeVideo } = await import('../lib/imagem')
        const poster = await versoesDeVideo(v)
        await disparar({ ...clipe, poster: poster.full, posterThumb: poster.thumb })
      })
      .catch(() => {
        setGravando(false)
        setProgGrav(0)
        setErroVideo('Não deu para gravar o vídeo. Tente novamente ou registre uma foto.')
      })
  }

  function pararGravacao() {
    gravacaoRef.current?.parar()
  }

  /**
   * Foto da galeria. Nasce com selo "galeria" (procedência decidida no
   * servidor) e segue o MESMO caminho de uma foto tirada na hora: vira o
   * poster/foto do registro e cai na etapa de vínculo ao pico. Sem GPS —
   * caso natural de foto da galeria — o fluxo leva a "selecionar-pico", onde
   * dá para escolher um pico cadastrado ou reportar um novo.
   */
  async function escolherFotoGaleria(file: File) {
    setErroVideo(null)
    if (!file.type.startsWith('image/')) {
      setErroVideo('O arquivo escolhido não é uma imagem.')
      return
    }
    try {
      const { versoesDeArquivo } = await import('../lib/imagem')
      const versoes = await versoesDeArquivo(file)
      // Sem clipe: é foto. disparar(ehFoto) trata o poster como a própria foto.
      await disparar({ blob: file, mime: file.type, duracaoS: 0, poster: versoes.full, posterThumb: versoes.thumb, ehFoto: true })
    } catch {
      setErroVideo('Não deu para preparar esta foto neste aparelho. Tente outra imagem.')
    }
  }

  async function escolherVideoGaleria(file: File) {
    setErroVideo(null)
    const veredicto = await validarVideoGaleria(file)
    if (!veredicto.ok) {
      setErroVideo(veredicto.motivo ?? 'Vídeo não aceito.')
      return
    }
    if (veredicto.acao === 'recortar') {
      // Não decidimos por ele: o autor escolhe QUAIS 5 segundos entram.
      setRecortando(file)
      return
    }
    await prepararClipe({ blob: file, mime: file.type, duracaoS: veredicto.duracaoS ?? 0 })
  }

  /** Recorta o trecho escolhido na linha de edição e segue para a publicação. */
  async function confirmarRecorte(file: File, inicioS: number) {
    setRecortando(null)
    setProcVideo(0)
    try {
      const clipe = await recortarVideoParaClipe(file, { inicioS, onProgresso: setProcVideo })
      setProcVideo(null)
      await prepararClipe(clipe)
    } catch {
      setProcVideo(null)
      setErroVideo('Não deu para preparar este vídeo neste aparelho. Tente gravar pelo app ou escolher outro arquivo.')
    }
  }

  /** Poster + envio: sai do clipe FINAL, que é o que a comunidade vai ver. */
  async function prepararClipe(clipe: { blob: Blob; mime: string; duracaoS: number; posterBlob?: Blob }) {
    // O poster é DESEJÁVEL, não obrigatório: se falhar, o vídeo ainda sobe.
    // Preferimos o poster capturado no canvas do corte (clipe.posterBlob) —
    // reler o blob recém-gravado do MediaRecorder costuma falhar (sem duração
    // nos metadados), e era isso que fazia o registro "sumir".
    let poster: { full?: Blob; thumb?: Blob } = {}
    try {
      const { versoesDeArquivo, versoesDeVideo } = await import('../lib/imagem')
      if (clipe.posterBlob) {
        poster = await versoesDeArquivo(clipe.posterBlob)
      } else {
        const arquivoPoster = clipe.blob instanceof File
          ? clipe.blob
          : new File([clipe.blob], 'clipe', { type: clipe.mime })
        const el = await carregarVideoParaPoster(arquivoPoster)
        poster = await versoesDeVideo(el)
        URL.revokeObjectURL(el.src)
      }
    } catch (e) {
      console.warn('poster do vídeo falhou; seguindo sem miniatura', e)
    }
    try {
      await disparar({
        blob: clipe.blob,
        mime: clipe.mime,
        duracaoS: clipe.duracaoS,
        poster: poster.full,
        posterThumb: poster.thumb,
      })
    } catch (e) {
      console.error('falha ao preparar o vídeo para envio', e)
      setErroVideo('Não deu para preparar este vídeo neste aparelho. Tente gravar pelo app ou escolher outro arquivo.')
    }
  }

  async function disparar(pronto?: { blob: Blob; mime: string; duracaoS: number; poster?: Blob; posterThumb?: Blob; ehFoto?: boolean }) {
    const v = videoRef.current
    let blob: Blob | undefined
    let thumb: Blob | undefined
    if (pronto?.ehFoto) {
      // Foto da galeria: o próprio arquivo é a foto; nada de clipe.
      blob = pronto.poster
      thumb = pronto.posterThumb
      definirVideoCapturado(undefined)
    } else if (pronto) {
      // Vídeo: o "poster" (frame) faz o papel da foto — feed e timeline nem
      // percebem a diferença; o clipe viaja ao lado.
      blob = pronto.poster
      thumb = pronto.posterThumb
      definirVideoCapturado({ blob: pronto.blob, mime: pronto.mime, duracaoS: pronto.duracaoS })
    } else if (v && v.videoWidth > 0) {
      const { versoesDeVideo } = await import('../lib/imagem')
      const versoes = await versoesDeVideo(v)
      blob = versoes.full
      thumb = versoes.thumb
      definirVideoCapturado(undefined)
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())

    setThumbCapturado(thumb)
    setBlobCapturado(blob)

    // Alerta/lixo: o GPS é essencial (denúncia sem lugar não existe),
    // então buscamos mesmo se a pessoa marcou "estou em casa".
    const precisaGPS = !noLocal || tipo === 'alerta' || tipo === 'lixo'
    let pos: { lat?: number; lng?: number; precisaoM?: number } = {}
    if (precisaGPS) {
      pos = await obterCoords()
      setPosCapturada(pos)
      if (pos.lat && pos.lng) {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json&zoom=14`)
          const geo = await geoRes.json()
          const praiaSugerida = geo.address?.suburb || geo.address?.village || geo.address?.neighbourhood || geo.address?.city || ''
          if (praiaSugerida) setNovaPraiaNome(praiaSugerida)
          const cidade = geo.address?.city || geo.address?.town || geo.address?.municipality || ''
          if (cidade) setMunicipioAlerta(cidade)
          const uf = SIGLA_UF[geo.address?.state ?? ''] ?? ''
          if (uf) setUfAlerta(uf)
        } catch { /* ignorar */ }
      }
    }

    // ── BIFURCAÇÃO POR NATUREZA ──
    // Report do mar → foto de pico (timeline). Alerta/lixo → registro de
    // AMEAÇA com a foto anexa: nasce no carrossel, no mapa e nas Ações —
    // nunca na tábua de marés. (Antes, tudo virava foto de pico: o tipo
    // escolhido era descartado no salvamento.)
    if (tipo === 'alerta' || tipo === 'lixo') {
      if (tipo === 'lixo' && !catAlerta) setCatAlerta('lixo-praia')
      setEtapa('classificar-alerta')
      return
    }

    // FIX: nos caminhos diretos, o GPS pode ter vindo ANTES da câmera
    // (detectarLocalEAbrir) — o pos local fica vazio e as coordenadas se
    // perdiam, derrubando o selo de procedência. Prioriza o mais fresco.
    const coordsEnvio = pos.lat ? pos : posCapturada

    // Registro iniciado na página de um pico já nasce vinculado a ele.
    if (picoSelecionado) {
      await finalizarUpload(picoSelecionado, blob, coordsEnvio, thumb)
      return
    }
    // "Estou no local" + pico detectado: NÃO sobe direto. O manual promete
    // "Fotografar → Vincular ao pico → Classificar → Enviar", e a etapa de
    // vínculo faltava: a foto ia para o pico mais próximo sem o autor ver qual.
    if (noLocal && picoAutoId && coordsEnvio.lat && coordsEnvio.lng) {
      const candidatos = picosExistentes
        .map((p) => ({ pico: p, metros: Math.round(haversineKm(coordsEnvio.lat!, coordsEnvio.lng!, p.lat, p.lng) * 1000) }))
        .sort((a, b) => a.metros - b.metros)
        .slice(0, 6)

      // Ambíguo quando o 2º pico está quase tão perto quanto o 1º, ou quando a
      // imprecisão do GPS é maior que a folga entre eles — nesses casos a lista
      // já abre expandida, com aviso. Fora disso, um toque basta.
      const d1 = candidatos[0]?.metros ?? Infinity
      const d2 = candidatos[1]?.metros ?? Infinity
      const folga = d2 - d1
      const precisao = coordsEnvio.precisaoM ?? 0
      const ambiguo = folga < 250 || (precisao > 0 && folga < precisao)

      setConfirmar({
        blob, thumb, pos: coordsEnvio,
        candidatos,
        escolhido: picoAutoId,
        ambiguo,
      })
      setEtapa('confirmar-pico')
      return
    }
    setEtapa('selecionar-pico')
  }

  /** Define o local do alerta (GPS atual ou ponto do mapa) e resolve cidade/UF. */
  async function definirLocalAlerta(lat: number, lng: number) {
    setPosCapturada({ lat, lng })
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`)
      const g = await r.json()
      const cidade = g.address?.city || g.address?.town || g.address?.municipality || g.address?.village || ''
      if (cidade) setMunicipioAlerta(cidade)
      const uf = SIGLA_UF[g.address?.state ?? ''] ?? ''
      if (uf) setUfAlerta(uf)
      const praia = g.address?.suburb || g.address?.neighbourhood || ''
      if (praia && !novaPraiaNome) setNovaPraiaNome(praia)
    } catch { /* rede: segue com a coordenada, sem o nome do lugar */ }
  }

  async function publicarAlertaDaCamera() {
    if (!catAlerta || !gravAlerta || !posCapturada.lat || !posCapturada.lng || !blobCapturado) return
    setPublicandoAlerta(true)
    const { categoriaPorId } = await import('../components/SeletorCategoria')
    const rotulo = categoriaPorId(catAlerta).label
    const dados = {
      titulo: `${rotulo} — ${novaPraiaNome || municipioAlerta || 'local registrado'}`,
      categoria: catAlerta,
      gravidade: gravAlerta,
      localNome: novaPraiaNome || undefined,
      municipio: municipioAlerta || 'Não informado',
      uf: ufAlerta || 'SP',
      lat: posCapturada.lat,
      lng: posCapturada.lng,
      comunidadeId,
    }

    // Sem sinal? Direto pra fila — denúncia não espera rede.
    if (!navigator.onLine) {
      const { enfileirarAlerta } = await import('../offline/alertaQueue')
      await enfileirarAlerta({ id: crypto.randomUUID(), ...dados, blob: blobCapturado })
      setAlertaNaFila(true)
      setEtapa('concluido')
      setPublicandoAlerta(false)
      return
    }

    try {
      const { publicarAlerta } = await import('../services/alertas')
      const id = await publicarAlerta({
        ...dados,
        checkboxAceite: aceiteAlerta,
        images: [new File([blobCapturado], `alerta-${Date.now()}.webp`, { type: 'image/webp' })],
      })
      setAlertaCriadoId(id)
      setEtapa('concluido')
    } catch {
      // rede caiu no meio do envio: mesma rede de proteção
      const { enfileirarAlerta } = await import('../offline/alertaQueue')
      await enfileirarAlerta({ id: crypto.randomUUID(), ...dados, blob: blobCapturado })
      setAlertaNaFila(true)
      setEtapa('concluido')
    } finally {
      setPublicandoAlerta(false)
    }
  }

  /** Data ISO do registro: usa a data/hora escolhida (fluxo "não estou no
   *  local"), senão "agora". Sem hora, ancora ao meio-dia — evita cair no dia
   *  anterior por fuso e mantém a foto no meio da timeline daquele dia. */
  function capturadaEmISO(): string {
    if (noLocal === false && dataRegistro) {
      const hora = horaRegistro || '12:00'
      const d = new Date(`${dataRegistro}T${hora}:00`)
      if (!isNaN(d.getTime())) return d.toISOString()
    }
    return new Date().toISOString()
  }

  async function finalizarUpload(picoId: string, blob?: Blob, pos?: {lat?: number, lng?: number}, thumb?: Blob, picoNovo?: import('../services/api').PicoNovo) {
    const id = crypto.randomUUID()
    uploadId.current = id
    // No fluxo "não estou no local", o ponto do mapa é a coordenada do registro.
    const coords = (noLocal === false && localManual) ? localManual : pos
    try {
      await enfileirar({
        id,
        picoId,
        capturadaEm: capturadaEmISO(),
        blob,
        thumbBlob: thumb,
        capturaLat: coords?.lat,
        capturaLng: coords?.lng,
        picoNovo,
        comunidadeId,
        videoBlob: videoCapturadoRef.current?.blob,
        videoMime: videoCapturadoRef.current?.mime,
        videoDuracaoS: videoCapturadoRef.current?.duracaoS,
      })
      if (tipo) await definirTipo(id, tipo)
      setPicoFinal(picoId)
      setEtapa('concluido')
    } catch (e) {
      // Sem este guard, uma falha ao gravar na fila (ex.: Blob grande, cota do
      // IndexedDB, campo não serializável) subia sem ser tratada e a tela de
      // "enviado" nunca aparecia — o registro "sumia" sem explicação.
      console.error('falha ao enfileirar o registro', e)
      setErroVideo('Não deu para salvar o registro neste aparelho. Tente novamente ou reinicie o app.')
    }
  }

  async function criarNovoPico() {
    if (!novoPicoNome.trim()) return
    try {
      let municipio = ''
      let uf = 'SP'
      if (posCapturada.lat && posCapturada.lng) {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${posCapturada.lat}&lon=${posCapturada.lng}&format=json&zoom=10`)
          const geo = await geoRes.json()
          municipio = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.municipality || ''
          uf = geo.address?.state_code?.toUpperCase() || geo.address?.['ISO3166-2-lvl4']?.split('-')[1] || 'SP'
        } catch { /* sem geocode: segue sem município, resolve no envio */ }
      }
      const nomePicoCompleto = novaOndaNome.trim()
        ? `${novoPicoNome.trim()} - ${novaOndaNome.trim()}`
        : novoPicoNome.trim()

      // Não cria o pico aqui: enfileira o registro com os dados do pico. O
      // envio (que roda pela fila offline, com retry e sync) cria o pico e sobe
      // a foto como uma unidade. Resultado: registrar funciona 100% offline.
      const { slug } = await import('../services/supabase/rest')
      const picoIdPrevisto = slug(nomePicoCompleto)
      await finalizarUpload(picoIdPrevisto, blobCapturado, posCapturada, thumbCapturado, {
        nome: nomePicoCompleto,
        lat: posCapturada.lat ?? 0,
        lng: posCapturada.lng ?? 0,
        municipio,
        uf,
        praia: novaPraiaNome.trim(),
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      toast('Não foi possível preparar o registro: ' + msg)
    }
  }

  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'linear-gradient(160deg,#0b3a53,#04141d)', color: '#fff' }}>
        <div className="spinner" />
      </div>
    )
  }

  const tipoInfo = tipo ? TIPOS.find(t => t.id === tipo) : null

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100dvh',
      color: '#fff', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background — mesmo da Landing Page */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: "url('/wave-header.webp')",
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(4,28,48,.45) 0%, rgba(4,28,48,.62) 35%, rgba(4,28,48,.88) 100%)',
        }} />
      </div>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 0', zIndex: 10, position: 'relative' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
          <IconX size={22} stroke={2} />
        </button>
        <b>Registrar</b>
        <span style={{ width: 24 }} />
      </div>

      {/* ETAPA 1: Escolher tipo */}
      {etapa === 'tipo' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24, position: 'relative', zIndex: 1 }}>
          <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: 4 }}>O que você vai registrar?</h2>
          <p style={{ color: 'rgba(255,255,255,.6)', textAlign: 'center', fontSize: 13, marginBottom: 20 }}>
            Escolha o tipo para organizar melhor o registro.
          </p>
          <div className="stack" style={{ gap: 12 }}>
            {TIPOS.map((t) => {
              const Icon = t.icone
              const selecionado = tipo === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTipo(t.id)
                    setNoLocal(null) // reset
                  }}
                  style={{
                    textAlign: 'left', width: '100%',
                    background: selecionado ? `${t.cor}25` : 'rgba(255,255,255,.06)',
                    border: selecionado ? `2px solid ${t.cor}` : '2px solid rgba(255,255,255,.1)',
                    borderRadius: 16, padding: 16, color: '#fff',
                    display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: `${t.cor}20`, color: t.cor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={24} stroke={2} />
                  </div>
                  <span style={{ flex: 1 }}>
                    <b style={{ fontSize: 15 }}>{t.titulo}</b>
                    <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, marginTop: 2 }}>{t.desc}</div>
                  </span>
                  {selecionado && <IconCheck size={20} stroke={2.5} color={t.cor} style={{ flexShrink: 0 }} />}
                </button>
              )
            })}
          </div>
          <button
            className="btn acento full"
            style={{ marginTop: 20, minHeight: 50, fontSize: 15 }}
            disabled={!tipo}
            onClick={() => setEtapa('localizacao')}
          >
            {tipo ? 'Próximo →' : 'Selecione o tipo acima'}
          </button>
        </div>
      )}

      {/* ETAPA 2: Localização */}
      {etapa === 'localizacao' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24, position: 'relative', zIndex: 1 }}>
          {/* Tipo selecionado badge */}
          {tipoInfo && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: `${tipoInfo.cor}30`, color: tipoInfo.cor,
                borderRadius: 20, padding: '5px 16px', fontSize: 12, fontWeight: 600,
              }}>
                <tipoInfo.icone size={14} stroke={2} /> {tipoInfo.titulo}
              </span>
            </div>
          )}

          <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: 6 }}>
            <IconMapPin size={24} stroke={2} style={{ verticalAlign: -4, marginRight: 6, color: '#1ECBC3' }} />
            Você está no local agora?
          </h2>
          <p style={{ color: 'rgba(255,255,255,.55)', textAlign: 'center', fontSize: 13, lineHeight: 1.5, marginBottom: 24 }}>
            Se você está na praia ou no pico, o app detecta sua posição automaticamente e já associa ao pico mais próximo.
          </p>

          {detectandoGps && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 20 }}>
              <div className="spinner" />
              <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, animation: 'pulse 2s ease-in-out infinite' }}>
                Detectando sua localização...
              </p>
            </div>
          )}

          {!detectandoGps && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Sim — estou no local */}
              <button
                onClick={() => {
                  setNoLocal(true)
                  detectarLocalEAbrir()
                }}
                style={{
                  textAlign: 'left',
                  background: 'rgba(30,203,195,.1)',
                  border: '2px solid rgba(30,203,195,.4)',
                  borderRadius: 16, padding: 18, color: '#fff',
                  display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'rgba(30,203,195,.2)', color: '#1ECBC3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <IconCurrentLocation size={26} stroke={2} />
                </div>
                <span>
                  <b style={{ fontSize: 15 }}>Sim, estou no local</b>
                  <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>
                    O app detecta o GPS e associa automaticamente ao pico mais próximo. Mais rápido!
                  </div>
                </span>
              </button>

              {/* Não — enviar de outro lugar: local no mapa + data ANTES da foto */}
              <button
                onClick={() => {
                  setNoLocal(false)
                  setDataRegistro(hojeISO()) // padrão hoje; o usuário pode mudar
                  setHoraRegistro('')
                  setEtapa('onde-quando')
                }}
                style={{
                  textAlign: 'left',
                  background: 'rgba(255,255,255,.05)',
                  border: '2px solid rgba(255,255,255,.15)',
                  borderRadius: 16, padding: 18, color: '#fff',
                  display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <IconMap2 size={26} stroke={2} />
                </div>
                <span>
                  <b style={{ fontSize: 15 }}>Não, vou escolher o local</b>
                  <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>
                    Estou em casa ou em outro lugar. Marco o ponto no mapa e a data do registro.
                  </div>
                </span>
              </button>

              <button
                onClick={() => setEtapa('tipo')}
                style={{
                  background: 'none', border: 'none', color: 'rgba(255,255,255,.4)',
                  cursor: 'pointer', fontSize: 13, marginTop: 8, textAlign: 'center',
                }}
              >
                ← Voltar
              </button>
            </div>
          )}
        </div>
      )}

      {/* ETAPA "Onde e quando": local (mapa/endereço) + data, ANTES da foto.
          Só no fluxo "não estou no local", onde "aqui e agora" não vale. */}
      {etapa === 'onde-quando' && (
        <div style={{ position: 'fixed', inset: 0, background: '#06222E', zIndex: 50, overflowY: 'auto', padding: '24px 18px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
          <BotaoVoltarOverlay onClick={() => setEtapa('localizacao')} label="Voltar" style={{ marginBottom: 12 }} />

          <h2 style={{ color: '#fff', margin: '0 0 4px', fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconMapPin size={20} stroke={2} /> Onde e quando?
          </h2>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, marginBottom: 18, lineHeight: 1.45 }}>
            Marque o ponto no mapa e diga quando aconteceu. Depois você tira ou escolhe a foto.
          </p>

          {/* LOCAL — pin arrastável, toque no mapa ou busca por endereço */}
          <label style={{ color: 'rgba(255,255,255,.75)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
            Local do registro
          </label>
          <Suspense fallback={<div style={{ height: 240, borderRadius: 12, background: 'rgba(255,255,255,.06)', display: 'grid', placeItems: 'center' }}><span style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>Carregando mapa…</span></div>}>
            <MapaPicker
              lat={localManual?.lat}
              lng={localManual?.lng}
              height={240}
              onChange={(lat, lng) => setLocalManual({ lat, lng })}
            />
          </Suspense>
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, margin: '8px 2px 20px', lineHeight: 1.4 }}>
            Arraste o pino, toque no mapa ou busque o endereço acima.
          </p>

          {/* QUANDO — data obrigatória, hora opcional */}
          <label style={{ color: 'rgba(255,255,255,.75)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
            Quando aconteceu?
          </label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, display: 'block', marginBottom: 4 }}>Data</span>
              <input type="date" value={dataRegistro} max={hojeISO()}
                onChange={(e) => setDataRegistro(e.target.value)} style={campoDataEstilo} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, display: 'block', marginBottom: 4 }}>Hora (opcional)</span>
              <input type="time" value={horaRegistro}
                onChange={(e) => setHoraRegistro(e.target.value)} style={campoDataEstilo} />
            </div>
          </div>
          <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, margin: '2px 2px 22px', lineHeight: 1.4 }}>
            Sem a hora, usamos o meio-dia como referência do dia.
          </p>

          <button
            className="btn full"
            disabled={!localManual || !dataRegistro}
            onClick={() => {
              // O ponto do mapa passa a ser a posição do registro: a busca de
              // picos próximos e a tela de seleção usam posCapturada.
              if (localManual) {
                setPosCapturada({ lat: localManual.lat, lng: localManual.lng })
                const perto = picosExistentes
                  .map((p) => ({ p, m: haversineKm(localManual.lat, localManual.lng, p.lat, p.lng) * 1000 }))
                  .sort((a, b) => a.m - b.m)[0]
                if (perto && perto.m < 500) {
                  setPicoAutoId(perto.p.id)
                  setPicoAutoNome(perto.p.nome)
                }
              }
              void abrirCamera()
            }}
            style={{ opacity: (!localManual || !dataRegistro) ? 0.5 : 1 }}
          >
            <IconCamera size={18} stroke={2} /> Continuar para a foto
          </button>
          {(!localManual || !dataRegistro) && (
            <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 11.5, textAlign: 'center', marginTop: 8 }}>
              {!localManual ? 'Marque o local no mapa para continuar.' : 'Escolha a data do registro.'}
            </p>
          )}
        </div>
      )}

      {/* ETAPA 3: Câmera */}
      {etapa === 'camera' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          {/* Badge tipo + local */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {tipoInfo && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: `${tipoInfo.cor}30`, color: tipoInfo.cor,
                borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600,
              }}>
                <tipoInfo.icone size={13} stroke={2} /> {tipoInfo.titulo}
              </span>
            )}
            {noLocal && picoAutoNome && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(30,203,195,.2)', color: '#1ECBC3',
                borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600,
              }}>
                <IconMapPin size={13} stroke={2} /> {picoAutoNome}
              </span>
            )}
          </div>

          <div ref={cameraBoxRef} style={{ flex: 1, position: 'relative', background: '#000', margin: '0 8px', borderRadius: 20, overflow: 'hidden', touchAction: 'none' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {zoomDisponivel && zoomAtual > 1.05 && (
              <div className="dado" style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 3, background: 'rgba(4,20,27,.6)', color: '#fff', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, pointerEvents: 'none' }}>
                {zoomAtual.toFixed(1)}×
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.45) 100%)', zIndex: 1 }} />
            {erro && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, color: 'rgba(255,255,255,.8)', background: 'linear-gradient(160deg,#0b3a53,#04141d)', zIndex: 10 }}>
                <IconAlertTriangle size={48} stroke={1.5} style={{ marginBottom: 16, color: 'var(--perigo)' }} />
                <p>{erro}</p>
                <button onClick={() => setEtapa('tipo')} className="btn outline" style={{ marginTop: 24, borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>Tentar novamente</button>
              </div>
            )}
            {noLocal && (
              <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 500, color: '#1ECBC3',
                }}>
                  <IconCurrentLocation size={14} stroke={2} /> Localização detectada
                </span>
              </div>
            )}
          </div>

          <div style={{ padding: '16px 0 calc(env(safe-area-inset-bottom,0px) + 20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            {/* Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {['Tipo', 'Local', 'Foto'].map((label, i) => (
                <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && <span style={{ width: 16, height: 1, background: 'rgba(255,255,255,.2)' }} />}
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: i < 2 ? 'rgba(255,255,255,.4)' : '#fff',
                  }} />
                  <span style={{
                    fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
                    color: i < 2 ? 'rgba(255,255,255,.4)' : '#fff',
                  }}>{label}</span>
                </span>
              ))}
            </div>

            <div style={{ position: 'relative', width: 72, height: 72 }}>
              {/* Anel de progresso da gravação (5s) */}
              {gravando && (
                <svg viewBox="0 0 72 72" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', pointerEvents: 'none' }}>
                  <circle cx="36" cy="36" r="34" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="4" />
                  <circle
                    cx="36" cy="36" r="34" fill="none" stroke="#FF4D4D" strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={2 * Math.PI * 34 * (1 - progGrav)}
                  />
                </svg>
              )}
              <button
                className="btn-obturador"
                onClick={() => { if (!segurou.current) void disparar() }}
                onContextMenu={(e) => e.preventDefault()}
                disabled={!!erro}
                aria-label={gravando ? 'Gravando vídeo — solte para parar' : 'Tocar: foto · Segurar: vídeo de 5s'}
                style={{
                  width: 72, height: 72, borderRadius: '50%', cursor: 'pointer',
                  background: gravando
                    ? 'radial-gradient(circle at 40% 35%, #ff6b6b, #c22)'
                    : 'radial-gradient(circle at 40% 35%, #29e0d5, #0D6EA8)',
                  border: '4px solid rgba(255,255,255,.85)',
                  boxShadow: gravando ? '0 4px 20px rgba(255,77,77,.55)' : '0 4px 20px rgba(30,203,195,.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform .1s, background .2s',
                }}
                onPointerDown={(e) => {
                  e.currentTarget.style.transform = 'scale(.9)'
                  segurou.current = false
                  timerSegurar.current = setTimeout(() => { segurou.current = true; iniciarGravacao() }, 350)
                }}
                onPointerUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  if (timerSegurar.current) clearTimeout(timerSegurar.current)
                  if (gravando) pararGravacao()
                }}
                onPointerLeave={() => {
                  if (timerSegurar.current) clearTimeout(timerSegurar.current)
                  if (gravando) pararGravacao()
                }}
              >
                {gravando
                  ? <span style={{ width: 22, height: 22, borderRadius: 4, background: '#fff' }} />
                  : <IconCamera size={28} stroke={2.2} color="#fff" />}
              </button>
            </div>

            {!gravando && podeGravar && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', textAlign: 'center', margin: 0 }}>
                Toque para foto · segure para gravar até 5s
              </p>
            )}

            {/* Galeria: foto ou vídeo. Ambos nascem com selo "galeria" e caem
                no mesmo fluxo de vínculo ao pico (escolher ou cadastrar). */}
            {procVideo === null ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  fontSize: 12, color: 'rgba(255,255,255,.75)', padding: '6px 12px',
                  border: '1px solid rgba(255,255,255,.18)', borderRadius: 99,
                }}>
                  <IconPhoto size={15} stroke={2} />
                  Enviar foto da galeria
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void escolherFotoGaleria(f); e.target.value = '' }}
                  />
                </label>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  fontSize: 12, color: 'rgba(255,255,255,.75)', padding: '6px 12px',
                  border: '1px solid rgba(255,255,255,.18)', borderRadius: 99,
                }}>
                  <IconVideo size={15} stroke={2} />
                  Enviar vídeo da galeria
                  <input
                    type="file"
                    accept="video/*"
                    style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void escolherVideoGaleria(f); e.target.value = '' }}
                  />
                </label>
              </div>
            ) : (
              <div style={{ width: 220, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', marginBottom: 6 }}>
                  Preparando o trecho escolhido…
                </div>
                <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.round(procVideo * 100)}%`, height: '100%',
                    background: '#1ECBC3', transition: 'width .2s linear',
                  }} />
                </div>
              </div>
            )}
            {erroVideo && (
              <p style={{ fontSize: 12, color: '#FFB4B4', textAlign: 'center', maxWidth: 280, lineHeight: 1.4 }}>
                {erroVideo}
              </p>
            )}

            {noLocal && picoAutoNome && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', textAlign: 'center' }}>
                A foto será enviada direto para <b style={{ color: '#1ECBC3' }}>{picoAutoNome}</b>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ETAPA 4: Informar localização (orgânico) */}
      {/* Linha de edição: o autor escolhe QUAIS 5 segundos do vídeo entram */}
      {recortando && (
        <RecortarVideo
          file={recortando}
          onCancelar={() => { setRecortando(null) }}
          onConfirmar={(inicioS) => { void confirmarRecorte(recortando, inicioS) }}
        />
      )}

      {etapa === 'confirmar-pico' && confirmar && (
        <ConfirmarPico
          dados={confirmar}
          comunidadeId={comunidadeId}
          onComunidade={setComunidadeId}
          onEscolher={(id) => setConfirmar((c) => (c ? { ...c, escolhido: id } : c))}
          onOutro={() => { setEtapa('selecionar-pico') }}
          onVoltar={() => {
            // Refazer: descarta o registro atual e volta para a câmera. Nada
            // foi enviado ainda — o gesto é seguro e reversível.
            window.history.back()
          }}
          onPublicar={async () => {
            const c = confirmar
            setConfirmar(null)
            await finalizarUpload(c.escolhido, c.blob, c.pos, c.thumb)
          }}
        />
      )}

      {etapa === 'classificar-alerta' && (
        <div style={{ position: 'fixed', inset: 0, background: '#06222E', zIndex: 50, overflowY: 'auto', padding: '24px 18px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
          <BotaoVoltarOverlay onClick={() => window.history.back()} label="Voltar para a câmera" style={{ marginBottom: 16 }} />
          <h2 style={{ color: '#fff', marginBottom: 4 }}>Classifique o alerta</h2>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, marginBottom: 14 }}>
            Sua foto vira um registro ambiental oficial no mapa da comunidade.
          </p>

          <SeletorComunidade valor={comunidadeId} onChange={setComunidadeId} escuro />

          <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 14, padding: 12, marginBottom: 14 }}>
            <SeletorCategoria selecionada={catAlerta} onSelecionar={setCatAlerta} />
          </div>

          <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 14, padding: 12, marginBottom: 14 }}>
            <CampoGravidade valor={gravAlerta} onChange={setGravAlerta} />
          </div>

          <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 14, padding: 12, marginBottom: 14 }}>
            <label style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, display: 'block', marginBottom: 6 }}>Nome do local</label>
            <input
              value={novaPraiaNome}
              onChange={(e) => setNovaPraiaNome(e.target.value)}
              placeholder="Ex.: Rio Itanhaém, Baixio"
              style={{ width: '100%', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 14 }}
            />
            {posCapturada.lat && posCapturada.lng ? (
              <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 11.5, marginTop: 6 }}>
                <IconCurrentLocation size={12} stroke={2} style={{ verticalAlign: '-2px' }} /> Ponto marcado pelo GPS da captura{municipioAlerta ? ` · ${municipioAlerta}${ufAlerta ? `/${ufAlerta}` : ''}` : ''}
              </p>
            ) : (
              <p style={{ color: '#F0A05A', fontSize: 11.5, marginTop: 6 }}>
                Sem GPS não dá para marcar o ponto. Ative a localização e capture de novo, ou use o formulário completo em Ações.
              </p>
            )}
          </div>

          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: 'rgba(255,255,255,.75)', fontSize: 12.5, marginBottom: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={aceiteAlerta} onChange={(e) => setAceiteAlerta(e.target.checked)} style={{ marginTop: 2 }} />
            Declaro que o registro é verdadeiro e feito de forma segura, sem me expor a riscos.
          </label>

          {/* Alerta EXIGE coordenada (denúncia sem lugar não vai ao mapa). Sem
              GPS — caso típico de vídeo/foto "de outro lugar" — o botão publicar
              ficaria mudo. Em vez disso, explicamos e damos DOIS caminhos:
              usar a posição atual OU apontar no mapa. O mapa cobre o caso de um
              vídeo filmado ontem, noutra praia: o GPS de agora estaria errado. */}
          {!posCapturada.lat && (
            <div style={{
              background: 'rgba(232,115,74,.13)', border: '1px solid rgba(232,115,74,.34)',
              borderRadius: 12, padding: '12px 14px', marginBottom: 12,
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                <IconMapPin size={16} stroke={2} style={{ color: '#F0A17E', flexShrink: 0, marginTop: 1 }} />
                <span style={{ color: 'rgba(255,255,255,.9)', fontSize: 12.5, lineHeight: 1.45 }}>
                  Um alerta ambiental precisa de localização para aparecer no mapa. Onde isto aconteceu?
                </span>
              </div>

              {mostrarMapaAlerta ? (
                <>
                  <Suspense fallback={<div style={{ height: 220, borderRadius: 12, background: 'rgba(255,255,255,.06)', display: 'grid', placeItems: 'center' }}><span style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>Carregando mapa…</span></div>}>
                    <MapaPicker
                      lat={posCapturada.lat}
                      lng={posCapturada.lng}
                      height={220}
                      onChange={(lat, lng) => { void definirLocalAlerta(lat, lng) }}
                    />
                  </Suspense>
                  <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 11, margin: '8px 2px 0', lineHeight: 1.4 }}>
                    Arraste o pino, toque no mapa ou busque o endereço do local do registro.
                  </p>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    className="btn full"
                    disabled={buscandoLocalAlerta}
                    onClick={async () => {
                      setBuscandoLocalAlerta(true)
                      const p = await obterCoords()
                      if (p.lat && p.lng) await definirLocalAlerta(p.lat, p.lng)
                      setBuscandoLocalAlerta(false)
                    }}
                  >
                    <IconCurrentLocation size={16} stroke={2} />
                    {buscandoLocalAlerta ? 'Buscando…' : 'Estou no local agora'}
                  </button>
                  <button
                    className="btn outline full"
                    style={{ borderColor: 'rgba(255,255,255,.3)', color: '#fff' }}
                    onClick={() => setMostrarMapaAlerta(true)}
                  >
                    <IconMapPin size={16} stroke={2} /> Apontar no mapa
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Confirmação discreta de que já há um ponto definido */}
          {posCapturada.lat != null && mostrarMapaAlerta && (
            <p style={{ color: '#1ECBC3', fontSize: 12, margin: '0 2px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconMapPin size={13} stroke={2.5} /> Local definido{municipioAlerta ? ` · ${municipioAlerta}${ufAlerta ? `/${ufAlerta}` : ''}` : ''}
            </p>
          )}

          <button
            className="btn acento full"
            disabled={!catAlerta || !gravAlerta || !aceiteAlerta || !posCapturada.lat || publicandoAlerta}
            onClick={publicarAlertaDaCamera}
          >
            {publicandoAlerta ? 'Publicando…' : 'Publicar alerta'}
          </button>
        </div>
      )}

      {etapa === 'selecionar-pico' && (
        <div style={{ flex: 1, padding: 20, overflow: 'auto', position: 'relative', zIndex: 1 }}>
          {tipoInfo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, justifyContent: 'center' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: `${tipoInfo.cor}30`, color: tipoInfo.cor,
                borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600,
              }}>
                <tipoInfo.icone size={14} stroke={2} /> {tipoInfo.titulo}
              </span>
            </div>
          )}

          <h2 style={{ color: '#fff', marginBottom: 6 }}>Onde foi feito o registro?</h2>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, marginBottom: 16 }}>
            {modoNovoPico || picosExistentes.length === 0
              ? 'Adicione o local exato para que outras pessoas saibam.'
              : noLocal
                ? 'Nenhum pico cadastrado aqui pertinho — escolha o mais próximo ou reporte este local.'
                : 'Escolha o pico deste registro — ou reporte um local novo.'}
          </p>

          <SeletorComunidade valor={comunidadeId} onChange={setComunidadeId} escuro />

          {/* Picos já cadastrados primeiro: evita locais duplicados no mapa */}
          {!modoNovoPico && picosExistentes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {[...picosExistentes]
                .map((p) => ({
                  p,
                  dist: posCapturada.lat && posCapturada.lng
                    ? haversineKm(posCapturada.lat, posCapturada.lng, p.lat, p.lng)
                    : null,
                }))
                .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity) || a.p.nome.localeCompare(b.p.nome))
                .slice(0, 8)
                .map(({ p, dist }) => (
                  <button
                    key={p.id}
                    onClick={() => finalizarUpload(p.id, blobCapturado, posCapturada, thumbCapturado)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.18)',
                      borderRadius: 14, padding: '13px 14px', cursor: 'pointer', textAlign: 'left', color: '#fff',
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 600, fontSize: 14.5 }}>{p.nome}</span>
                      <span style={{ display: 'block', fontSize: 11.5, opacity: .65 }}>{p.municipio}/{p.uf}</span>
                    </span>
                    {dist != null && (
                      <span className="dado" style={{ fontSize: 11.5, color: dist <= 0.6 ? '#1ECBC3' : 'rgba(255,255,255,.6)', flexShrink: 0, fontWeight: 700 }}>
                        {dist <= 0.6 ? <><IconMapPin size={11} stroke={2.5} style={{ verticalAlign: '-1px' }} /> aqui</> : dist < 10 ? `${dist.toFixed(1)} km` : `${Math.round(dist)} km`}
                      </span>
                    )}
                  </button>
                ))}
              <button
                onClick={() => setModoNovoPico(true)}
                className="btn outline full"
                style={{ marginTop: 4, color: '#fff', borderColor: 'rgba(255,255,255,.35)' }}
              >
                <IconPlus size={16} stroke={2} /> Reportar um local novo
              </button>
            </div>
          )}

          {(modoNovoPico || picosExistentes.length === 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Antes de criar, mostramos o que já existe por perto. A duplicata
                "Boca Da Barra" × "Boca Da Barra - Boca Da Barra" (120 m) nasceu
                justamente porque o pico existente não estava à vista aqui. */}
            {picosProximosDaqui.length > 0 && (
              <div style={{
                background: 'rgba(232,115,74,.13)', border: '1px solid rgba(232,115,74,.34)',
                borderRadius: 12, padding: '11px 12px',
              }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 9 }}>
                  <IconAlertTriangle size={16} stroke={2} style={{ color: '#F0A17E', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ color: 'rgba(255,255,255,.9)', fontSize: 12.5, lineHeight: 1.45 }}>
                    {picosProximosDaqui.length === 1
                      ? 'Já existe um pico cadastrado bem aqui. É este?'
                      : 'Já existem picos cadastrados bem aqui. É algum destes?'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {picosProximosDaqui.map(({ pico, metros }) => (
                    <button
                      key={pico.id}
                      onClick={() => { setModoNovoPico(false); void finalizarUpload(pico.id, blobCapturado, posCapturada, thumbCapturado) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '9px 10px', borderRadius: 10, cursor: 'pointer',
                        fontFamily: 'inherit', textAlign: 'left',
                        background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.16)',
                      }}
                    >
                      <IconRipple size={15} stroke={2} style={{ color: '#7FE7E1', flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 13.5, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {pico.nome}
                        </span>
                        <span className="dado" style={{ color: 'rgba(255,255,255,.5)', fontSize: 10.5 }}>
                          a {metros} m — usar este pico
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,.8)', fontSize: 12, marginBottom: 4, paddingLeft: 4 }}>
                Praia (ou Cidade)
              </label>
              <input
                className="input"
                placeholder="Ex: Praia das Pitangueiras"
                value={novaPraiaNome}
                onChange={(e) => setNovaPraiaNome(e.target.value)}
                style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,.8)', fontSize: 12, marginBottom: 4, paddingLeft: 4 }}>
                Nome do Pico / Canto
              </label>
              <input
                className="input"
                placeholder="Ex: Canto do Maluf"
                value={novoPicoNome}
                onChange={(e) => setNovoPicoNome(e.target.value)}
                style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,.8)', fontSize: 12, marginBottom: 4, paddingLeft: 4 }}>
                Onda (opcional)
              </label>
              <input
                className="input"
                placeholder="Ex: Direitas do canal"
                value={novaOndaNome}
                onChange={(e) => setNovaOndaNome(e.target.value)}
                style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff' }}
              />
            </div>

            <button className="btn acento full" onClick={criarNovoPico} disabled={!novoPicoNome.trim()} style={{ marginTop: 10 }}>
              Enviar Foto
            </button>
            {picosExistentes.length > 0 && (
              <button onClick={() => setModoNovoPico(false)} style={{ background: 'none', border: 0, color: 'rgba(255,255,255,.6)', fontSize: 13, cursor: 'pointer', marginTop: 2 }}>
                ← Voltar aos picos cadastrados
              </button>
            )}
          </div>
          )}
        </div>
      )}

      {/* ETAPA 5: Concluído */}
      {etapa === 'concluido' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 24, position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(30,203,195,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <IconCheck size={40} stroke={2} color="#1ECBC3" />
          </div>
          <h2 style={{ color: '#fff', marginBottom: 8 }}>Registro enviado!</h2>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            {tipoInfo && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: `${tipoInfo.cor}30`, color: tipoInfo.cor,
                borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600,
              }}>
                <tipoInfo.icone size={14} stroke={2} /> {tipoInfo.titulo}
              </span>
            )}
            {picoAutoNome && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(30,203,195,.2)', color: '#1ECBC3',
                borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600,
              }}>
                <IconMapPin size={14} stroke={2} /> {picoAutoNome}
              </span>
            )}
          </div>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, lineHeight: 1.5, maxWidth: 280 }}>
            Sua foto está sendo enviada em background. Obrigado por contribuir!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24, width: '100%', maxWidth: 320 }}>
            {(tipo === 'lixo' || tipo === 'alerta') && (
              <button
                className="btn full"
                style={{ background: '#2E9B6B', color: '#fff', fontWeight: 700 }}
                onClick={() => {
                  const nomePico = picosExistentes.find((p) => p.id === picoFinal)?.nome
                    ?? picoAutoNome ?? novoPicoNome ?? ''
                  const titulo = tipo === 'lixo'
                    ? `Mutirão de limpeza${nomePico ? ` — ${nomePico}` : ''}`
                    : `Mutirão${nomePico ? ` — ${nomePico}` : ''}`
                  const qs = new URLSearchParams({ titulo })
                  if (alertaCriadoId) qs.set('alerta', alertaCriadoId)
                  const p = picosExistentes.find((x) => x.id === picoFinal)
                  if (p) {
                    qs.set('municipio', p.municipio); qs.set('uf', p.uf)
                    qs.set('local', p.nome)
                    qs.set('lat', String(p.lat)); qs.set('lng', String(p.lng))
                  } else if (posCapturada.lat && posCapturada.lng) {
                    qs.set('lat', String(posCapturada.lat)); qs.set('lng', String(posCapturada.lng))
                  }
                  navigate(`/nova-acao/mutirao?${qs.toString()}`)
                }}
              >
                <IconUsers size={17} stroke={2} /> Criar mutirão e convidar a comunidade
              </button>
            )}
            {alertaNaFila && (
              <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 13.5, textAlign: 'center', lineHeight: 1.55, background: 'rgba(30,203,195,.12)', border: '1px solid rgba(30,203,195,.35)', borderRadius: 12, padding: '12px 14px' }}>
                Sem sinal por aqui — seu alerta ficou <b style={{ color: '#1ECBC3' }}>guardado na fila</b> e será publicado sozinho assim que a conexão voltar. A denúncia não se perde.
              </p>
            )}
            {alertaCriadoId && (
              <button className="btn acento full" onClick={() => navigate(`/alerta/${alertaCriadoId}`)}>
                <IconAlertTriangle size={18} stroke={2} /> Ver alerta no mapa
              </button>
            )}
            {picoFinal && (
              <button className="btn acento full" onClick={() => navigate(`/pico/${picoFinal}`)}>
                <IconPhoto size={18} /> Ver pico
              </button>
            )}
            <button className="btn outline full" style={{ borderColor: 'rgba(255,255,255,.3)', color: '#fff' }} onClick={() => {
              setTipo(null)
              setNoLocal(null)
              setEtapa('tipo')
              setBlobCapturado(undefined)
              setPicoFinal(null)
              setPicoAutoNome(null)
            }}>
              <IconCamera size={18} /> Novo registro
            </button>
            <button className="btn outline full" style={{ borderColor: 'rgba(255,255,255,.2)', color: 'rgba(255,255,255,.7)' }} onClick={() => navigate('/')}>
              Voltar ao Radar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
