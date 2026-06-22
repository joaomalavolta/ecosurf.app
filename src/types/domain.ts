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

/** Pressão socioambiental sobre a costa. */
export type CategoriaAmeaca = 'poluicao' | 'agua' | 'erosao' | 'privatizacao' | 'obra' | 'outro';
export type StatusAmeaca = 'identificado' | 'em-observacao' | 'recorrente' | 'resolvido';

export interface Ameaca {
  id: string;
  titulo: string;
  categoria: CategoriaAmeaca;
  status: StatusAmeaca;
  picoId?: string;
  municipio: string;
  uf: UF;
  /** Para proteger denunciante: localização grosseira por padrão. */
  precisao: 'exata' | 'aproximada';
  /** Coordenada GROSSEIRA (geom_aprox) — nunca a exata. */
  lat?: number;
  lng?: number;
  descricao?: string;
}
