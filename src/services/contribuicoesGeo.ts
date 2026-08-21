/**
 * O território de alguém — o que uma pessoa ou uma comunidade colocou no mapa.
 *
 * O mapa público responde "o que está acontecendo no litoral". Este responde
 * outra pergunta, que é a pergunta de quem abre um perfil: "o que ESTA pessoa
 * mapeou?". São os mesmos dados, recortados por autoria — e o recorte muda o
 * sentido: vira o rastro de quem contribuiu, não um mapa de ocorrências.
 *
 * Cinco camadas, na ordem em que importam:
 *  · picos cadastrados — o que a pessoa acrescentou ao mapa do Brasil
 *  · alertas ambientais — o que ela denunciou
 *  · registros positivos — o que ela encontrou de bom
 *  · mutirões — o que ela convocou
 *  · picos fotografados — onde ela esteve registrando (sem foto, o pico não
 *    entra: é a presença que conta, não a intenção)
 *
 * Tudo sai das views públicas, então vale a mesma RLS do resto do app: não há
 * nada aqui que a pessoa já não pudesse ver navegando pelo mapa.
 */

import { rest } from './supabase/rest'
import { temBackend } from './api'
import type { Alerta, Mutirao, Pico } from '../types/domain'

export interface ContribuicoesGeo {
  /** Picos que esta pessoa/comunidade cadastrou. */
  picosCriados: Pico[]
  /** Picos onde publicou foto (sem repetir os que já cadastrou). */
  picosFotografados: Pico[]
  alertas: Alerta[]
  /**
   * Registros positivos. Vêm da MESMA consulta dos alertas e são separados
   * aqui — uma requisição a mais para filtrar por uma coluna que já veio
   * seria trabalho de rede para nada.
   */
  positivos: Alerta[]
  mutiroes: Mutirao[]
  /** Soma dos pontos plotáveis — serve para decidir se vale desenhar o mapa. */
  total: number
}

const VAZIO: ContribuicoesGeo = {
  picosCriados: [], picosFotografados: [], alertas: [], positivos: [], mutiroes: [], total: 0,
}

interface LinhaPico {
  id: string; nome: string; praia: string | null
  municipio: string | null; uf: string | null
  regiao_surf_id: string | null; lat: number | null; lng: number | null
  orientacao_praia_deg: number | null; fundo: string | null
  descricao: string | null; criado_por: string | null
}

interface LinhaAlerta {
  id: string; titulo: string; categoria: string; status: string
  tipo_registro: string | null
  gravidade: string | null; municipio: string | null; uf: string | null
  lat: number | null; lng: number | null; criada_em: string | null
}

interface LinhaMutirao {
  id: string; titulo: string; tipo_acao: string | null; status: string
  municipio: string | null; uf: string | null; horario: string | null
  quando: string; lat: number | null; lng: number | null
  organizador: string | null; inscritos: number | null; vagas: number | null
}

const COM_COORD = 'lat=not.is.null&lng=not.is.null'
const TETO = 200

function paraPico(r: LinhaPico): Pico {
  return {
    id: r.id,
    nome: r.nome,
    praia: r.praia ?? r.nome,
    municipio: r.municipio ?? '',
    uf: r.uf ?? '',
    criadoPor: r.criado_por ?? undefined,
    regiaoSurfId: r.regiao_surf_id ?? '',
    lat: r.lat as number,
    lng: r.lng as number,
    // Sem `?? 180`: esse default era o bug. Ele passa no type-check (number
    // serve onde cabe number | null) e volta a afirmar que toda praia olha
    // para o sul. Nulo aqui é a resposta certa — "não sei".
    orientacaoPraiaDeg: r.orientacao_praia_deg,
    fundo: (r.fundo ?? 'areia') as Pico['fundo'],
    descricao: r.descricao ?? undefined,
  }
}

function paraAlerta(r: LinhaAlerta): Alerta {
  return {
    id: r.id,
    titulo: r.titulo,
    categoria: r.categoria as Alerta['categoria'],
    tipoRegistro: (r.tipo_registro ?? 'alerta') as Alerta['tipoRegistro'],
    status: r.status as Alerta['status'],
    gravidade: (r.gravidade ?? 'media') as Alerta['gravidade'],
    municipio: r.municipio ?? '',
    uf: r.uf ?? '',
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    criadaEm: r.criada_em ?? undefined,
  }
}

function paraMutirao(r: LinhaMutirao): Mutirao {
  return {
    id: r.id,
    titulo: r.titulo,
    tipoAcao: (r.tipo_acao ?? 'limpeza') as Mutirao['tipoAcao'],
    municipio: r.municipio ?? '',
    uf: r.uf ?? '',
    quando: r.quando,
    horario: r.horario ?? undefined,
    organizador: r.organizador ?? undefined,
    inscritos: r.inscritos ?? undefined,
    vagas: r.vagas ?? undefined,
    status: r.status as Mutirao['status'],
    lat: r.lat as number,
    lng: r.lng as number,
  }
}

const COLS_PICO = 'id,nome,praia,municipio,uf,regiao_surf_id,lat,lng,orientacao_praia_deg,fundo,descricao,criado_por'
const COLS_ALERTA = 'id,titulo,categoria,tipo_registro,status,gravidade,municipio,uf,lat,lng,criada_em'
const COLS_MUTIRAO = 'id,titulo,tipo_acao,status,municipio,uf,horario,quando,lat,lng,organizador,inscritos,vagas'

/**
 * Busca as quatro camadas de uma vez.
 *
 * Cada consulta cai sozinha (`catch` por camada): um alerta que não carrega
 * não pode apagar os picos do mapa. Foi exatamente esse acoplamento que
 * zerou os contadores do perfil por semanas — aqui já nasce separado.
 */
async function buscar(coluna: 'autor_id' | 'comunidade_id', valor: string): Promise<ContribuicoesGeo> {
  if (!temBackend()) return VAZIO
  const v = encodeURIComponent(valor)
  const de = `${coluna}=eq.${v}`

  // Picos não têm dono coletivo: comunidade não cadastra pico, pessoa cadastra.
  const consultaPicos = coluna === 'autor_id'
    ? rest<LinhaPico[]>(`picos_publicos?criado_por=eq.${v}&${COM_COORD}&select=${COLS_PICO}&limit=${TETO}`).catch(() => [])
    : Promise.resolve<LinhaPico[]>([])

  const [picosR, alertasR, mutiroesR, fotosR] = await Promise.all([
    consultaPicos,
    rest<LinhaAlerta[]>(
      `ameacas_publicas?${de}&${COM_COORD}&select=${COLS_ALERTA}&order=criada_em.desc&limit=${TETO}`,
    ).catch(() => []),
    rest<LinhaMutirao[]>(
      `mutiroes_publicos?${de}&${COM_COORD}&select=${COLS_MUTIRAO}&order=quando.desc&limit=${TETO}`,
    ).catch(() => []),
    rest<{ pico_id: string }[]>(
      `fotos_publicas?${de}&select=pico_id&limit=500`,
    ).catch(() => []),
  ])

  const picosCriados = picosR.map(paraPico)
  const jaTem = new Set(picosCriados.map((p) => p.id))

  // Os picos fotografados vêm por id; só depois viram pontos. Uma consulta
  // para todos, em vez de uma por pico.
  let picosFotografados: Pico[] = []
  const idsFoto = [...new Set(fotosR.map((f) => f.pico_id))].filter((id) => id && !jaTem.has(id))
  if (idsFoto.length) {
    const lista = idsFoto.slice(0, TETO).map((id) => `"${id}"`).join(',')
    const linhas = await rest<LinhaPico[]>(
      `picos_publicos?id=in.(${encodeURIComponent(lista)})&${COM_COORD}&select=${COLS_PICO}`,
    ).catch(() => [])
    picosFotografados = linhas.map(paraPico)
  }

  // As duas famílias chegam juntas e se separam aqui.
  const todos = alertasR.map(paraAlerta)
  const positivos = todos.filter((a) => a.tipoRegistro === 'positivo')
  const alertas = todos.filter((a) => a.tipoRegistro !== 'positivo')
  const mutiroes = mutiroesR.map(paraMutirao)

  return {
    picosCriados,
    picosFotografados,
    alertas,
    positivos,
    mutiroes,
    total: picosCriados.length + picosFotografados.length +
      alertas.length + positivos.length + mutiroes.length,
  }
}

/** O que uma pessoa mapeou, denunciou, convocou e fotografou. */
export function contribuicoesGeoUsuario(userId: string): Promise<ContribuicoesGeo> {
  return buscar('autor_id', userId)
}

/** O mesmo, assinado por uma comunidade. */
export function contribuicoesGeoComunidade(comunidadeId: string): Promise<ContribuicoesGeo> {
  return buscar('comunidade_id', comunidadeId)
}
