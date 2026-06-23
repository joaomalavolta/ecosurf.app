/**
 * Modelo de domínio do Ecosurf.
 *
 * Princípio central definido com o time:
 *  - `Pico` é PERMANENTE (nome, história, geometria, forecast sempre disponível).
 *  - `FeedDia` é EFÊMERO (o "acender" do pico naquele dia, via fotos da comunidade).
 *  - `Foto` é o conteúdo mais nobre — carrega procedência (anti-fake) e maré sobreposta.
 *
 * Hierarquia geográfica:
 *  - País → UF → Município são DERIVADOS da geometria (PostGIS + malha do IBGE).
 *  - Praia, Pico e Região de surf são CURADOS pela comunidade.
 */

export type UF = string; // sigla IBGE: 'SP', 'RJ', 'SC'...

export interface RegiaoSurf {
  id: string;
  nome: string; // "Litoral Sul de SP" — agrupamento curado, cruza municípios
  uf: UF;
}

/** Controle de soberania da comunidade sobre o pico (abafamento). */
export type VisibilidadePico =
  | 'publico'     // aparece no radar/mapa nacional
  | 'comunidade'  // só para o círculo de confiança do pico
  | 'abafado';    // existe, mas não broadcasta atividade (pico sensível/secreto)

export interface Pico {
  id: string;        // slug estável: "praia-do-sonho"
  nome: string;      // nome local do pico
  praia: string;     // praia à qual pertence (uma praia agrega vários picos)
  municipio: string; // DERIVADO via PostGIS — aqui no seed é manual
  uf: UF;            // DERIVADO
  regiaoSurfId: string;
  lat: number;
  lng: number;
  /** Direção (graus) para onde a praia "olha" (em direção ao mar aberto). Base p/ terral×maral. */
  orientacaoPraiaDeg: number;
  fundo: 'areia' | 'pedra' | 'misto';
  visibilidade: VisibilidadePico;
  descricao?: string;
}

export type TipoVento = 'terral' | 'maral' | 'lateral' | 'calmo';

export interface Vento {
  velocidadeKmh: number;
  direcaoDeg: number; // de ONDE o vento vem
  tipo: TipoVento;
}

export type FaseMare = 'enchente' | 'vazante' | 'cheia' | 'seca';

export interface Mare {
  alturaM: number;
  fase: FaseMare;
}

export interface Forecast {
  picoId: string;
  emitidoEm: string; // ISO
  ondaM: number;
  periodoS: number;
  direcaoOndaDeg: number;
  vento: Vento;
  mare: Mare;
  fonte: 'open-meteo' | 'mock';
}

/** Selo de procedência da foto — núcleo do anti-fake/anti-foto-antiga. */
export type Procedencia =
  | 'no-local'        // câmera in-app, dentro do geofence, timestamp coerente
  | 'galeria'         // veio da galeria — sem garantia de quando/onde
  | 'nao-verificado';

export interface Foto {
  id: string;
  picoId: string;
  autorId: string;
  autorNome: string;
  capturadaEm: string; // ISO — hora real da captura
  url?: string;        // ausente no scaffold → render como gradiente determinístico
  alturaMareM?: number; // maré no instante da foto (sobreposição na timeline)
  ventoTipo?: TipoVento;
  observacao?: string;
  procedencia: Procedencia;
  rostosBorrados: boolean;
}

export interface FeedDia {
  picoId: string;
  data: string; // YYYY-MM-DD
  fotos: Foto[];
}

/** Amostra da curva de maré do dia (eixo da timeline-com-maré). */
export interface PontoMare {
  hora: number;   // 0..24
  alturaM: number;
}

/** Evento marcado sobre a curva (entrada de vento, virada). */
export interface EventoVento {
  hora: number; // 0..24
  rotulo: string;
}

/** Registro ambiental colaborativo. */
export type CategoriaAlerta =
  | 'lixo-praia'
  | 'lixo-rio'
  | 'esgoto'
  | 'erosao'
  | 'oleo'
  | 'animal'
  | 'entulho'
  | 'microplasticos'
  | 'espuma'
  | 'queimada'
  | 'ocupacao'
  | 'outro';

export type GravidadeAlerta = 'baixa' | 'media' | 'alta' | 'emergencial';

export type StatusAlerta =
  | 'publicado'       // "Publicado pela comunidade"
  | 'em-revisao'      // "Em revisão pela moderação"
  | 'validado'        // "Validado visualmente"
  | 'sinalizado'      // "Sinalizado pela comunidade"
  | 'ocultado'        // "Ocultado por inconsistência"
  | 'removido';       // "Removido por violar regras"

export interface Alerta {
  id: string;
  titulo: string;
  categoria: CategoriaAlerta;
  status: StatusAlerta;
  gravidade: GravidadeAlerta;
  picoId?: string;
  municipio: string;
  uf: UF;
  localNome?: string;
  /** Para proteger o autor: localização grosseira por padrão. */
  precisao: 'exata' | 'aproximada';
  lat?: number;
  lng?: number;
  descricao?: string;
  images?: string[];
  recorrente?: boolean;
  checkboxAceite?: boolean;
}

/** @deprecated Use Alerta */
export type Ameaca = Alerta;
/** @deprecated Use CategoriaAlerta */
export type CategoriaAmeaca = CategoriaAlerta;
/** @deprecated Use StatusAlerta */
export type StatusAmeaca = StatusAlerta;

/** Mobilização da comunidade (limpeza, restinga, mutirão de praia). */
export type TipoAcaoMutirao = 'limpeza' | 'educativa' | 'restauracao' | 'monitoramento' | 'outro';
export type StatusMutirao = 'rascunho' | 'agendado' | 'realizado' | 'cancelado';

export interface Mutirao {
  id: string;
  titulo: string;
  tipoAcao?: TipoAcaoMutirao;
  picoId?: string;
  municipio: string;
  uf: UF;
  quando: string;
  horario?: string;
  organizador?: string;
  instituicao?: string;
  contato?: string;
  pontoEncontro?: string;
  imagemUrl?: string;
  inscritos?: number;
  vagas?: number;
  infoVoluntarios?: string;
  status: StatusMutirao;
  lat: number;
  lng: number;
  descricao?: string;
  rascunho?: boolean;
}

/** Rascunho salvo pelo usuário (armazenado no Supabase). */
export interface Rascunho {
  id: string;
  tipo: 'alerta' | 'mutirao';
  dados: Record<string, unknown>;
  criadoEm: string;
  atualizadoEm: string;
}

