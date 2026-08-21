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

export interface Pico {
  id: string;        // slug estável: "praia-do-sonho"
  criadoPor?: string; // autor do cadastro (0034) — habilita "excluir meu pico"
  nome: string;      // nome local do pico
  praia: string;     // praia à qual pertence (uma praia agrega vários picos)
  municipio: string; // DERIVADO via PostGIS — aqui no seed é manual
  uf: UF;            // DERIVADO
  regiaoSurfId: string;
  lat: number;
  lng: number;
  /**
   * Direção (graus) para onde a praia "olha" (em direção ao mar aberto).
   * Base p/ terral×maral.
   *
   * Ausente = ninguém sabe ainda, e nesse caso o app NÃO diz terral nem maral.
   * Até a 0071 esta coluna era NOT NULL com default, o que fazia "não medido"
   * e "medido, dá sul" serem indistinguíveis — ver a migration.
   */
  orientacaoPraiaDeg?: number | null;
  /** De onde veio a orientação: da linha de costa do OSM, ou da mão de alguém. */
  orientacaoFonte?: 'osm' | 'manual' | null;
  fundo: 'areia' | 'pedra' | 'misto';
  descricao?: string;
}

export type TipoVento = 'terral' | 'maral' | 'lateral' | 'calmo';

export interface Vento {
  velocidadeKmh: number;
  direcaoDeg: number; // de ONDE o vento vem
  /**
   * Ausente quando a orientação da praia é desconhecida: terral e maral são
   * relativos ao lado do mar, e sem ele a classificação seria um chute. A
   * velocidade e a direção continuam valendo — essas são medidas.
   */
  tipo?: TipoVento;
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
  autorAvatar?: string; // URL do avatar do autor (crédito visível no feed)
  /** Comunidade que assina a foto (se houver, o feed credita o grupo). */
  comunidadeId?: string;
  comunidadeNome?: string;
  comunidadeAvatar?: string;
  capturadaEm: string; // ISO — hora real da captura
  url?: string;        // foto cheia (página do pico); ausente → gradiente determinístico
  thumbUrl?: string;   // miniatura leve para o feed/listas
  alturaMareM?: number; // maré no instante da foto (sobreposição na timeline)
  ventoTipo?: TipoVento;
  observacao?: string;
  procedencia: Procedencia;
  rostosBorrados: boolean;
  /** Registro em vídeo (≤5s): url/thumbUrl continuam sendo o poster (frame). */
  ehVideo?: boolean;
  videoUrl?: string;
  duracaoS?: number;
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

/** Categorias de ALERTA — o que está errado no litoral. */
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

/**
 * Categorias de REGISTRO POSITIVO — o que está indo bem e merece ser visto.
 *
 * Duas delas (`area-desova` e `filhotes`) têm a localização protegida: o ponto
 * exato fica guardado e o mapa público mostra um aproximado. Quem decide isso
 * é o banco, no gatilho da migration 0063 — não a interface. Aqui a marcação
 * (`sensivel` em SeletorCategoria) serve só para AVISAR a pessoa antes de ela
 * publicar, nunca como a barreira.
 */
export type CategoriaPositivo =
  | 'fauna-avistada'
  | 'area-desova'
  | 'filhotes'
  | 'vegetacao-recuperacao'
  | 'coleta-seletiva';

/** Qualquer categoria, das duas famílias. É o que a coluna `categoria` aceita. */
export type CategoriaRegistro = CategoriaAlerta | CategoriaPositivo;

/**
 * As duas metades do mapa.
 *
 * Alerta e registro positivo dividem tabela, view, RLS e tela porque têm
 * exatamente os mesmos campos — o que muda é o sentido. Este discriminador é
 * a coluna `ameacas.tipo_registro` (migration 0063).
 */
export type TipoRegistro = 'alerta' | 'positivo';

export type GravidadeAlerta = 'baixa' | 'media' | 'alta' | 'emergencial';

/**
 * Ciclo de vida da ocorrência — os quatro valores que o CHECK do banco aceita.
 *
 * Este tipo listava outra coisa: 'publicado' | 'em-revisao' | 'validado' |
 * 'sinalizado' | 'ocultado' | 'removido'. Nenhum deles passa no
 * `ameacas_status_check`, e nenhum dos quatro reais estava aqui — ou seja, o
 * tipo descrevia um vocabulário que o banco nunca aceitou. Passava batido
 * porque toda leitura converte com `as`.
 *
 * Visibilidade é outro eixo, em `ModeracaoRegistro` — ver migration 0069.
 */
export type StatusAlerta =
  | 'identificado'    // registrado, ainda sem acompanhamento
  | 'em-observacao'   // alguém está acompanhando
  | 'recorrente'      // volta a acontecer no mesmo lugar
  | 'resolvido';      // fim de ciclo

/**
 * O que a moderação decidiu sobre a visibilidade pública do registro.
 *
 * Perpendicular ao `status`: uma ocorrência pode ser `recorrente` E estar
 * `oculto`. Quem filtra é a RLS (migration 0069), não a interface.
 */
export type ModeracaoRegistro = 'visivel' | 'oculto' | 'removido';

/**
 * Um ponto no mapa colaborativo — alerta ambiental OU registro positivo.
 *
 * O nome ficou de quando só havia uma família. Quem lê o `tipoRegistro` sabe
 * de qual metade a linha veio; quem não lê recebe 'alerta', que é o default
 * da coluna e o que todas as ocorrências anteriores à 0063 são.
 */
export interface Alerta {
  id: string;
  titulo: string;
  categoria: CategoriaRegistro;
  /** 'alerta' (problema) ou 'positivo' (biodiversidade/conservação). */
  tipoRegistro?: TipoRegistro;
  status: StatusAlerta;
  /** Só faz sentido em alerta: um registro positivo não tem o que escalonar. */
  gravidade: GravidadeAlerta;
  picoId?: string;
  municipio: string;
  uf: UF;
  localNome?: string;
  /** Quando foi publicado (ISO) — é o que faz o novo subir no feed. */
  criadaEm?: string;
  lat?: number;
  lng?: number;
  descricao?: string;
  images?: string[];
  recorrente?: boolean;
  /**
   * Área em metros quadrados. Hoje só a vegetação pergunta, mas o campo é
   * genérico. Ausente = não informado, que é diferente de zero.
   */
  areaM2?: number;
  checkboxAceite?: boolean;
  /** Autor (perfil público) */
  autorId?: string;
  autorNome?: string;
  autorFoto?: string;
  /** Comunidade que assina a publicação (opcional). */
  comunidadeId?: string;
  comunidadeNome?: string;
  comunidadeAvatar?: string;
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
  /** Comunidade que assina a publicação (opcional). */
  comunidadeId?: string;
  comunidadeNome?: string;
  comunidadeAvatar?: string;
  /** Ocorrência que originou a ação (rastreabilidade problema→ação). */
  alertaId?: string | null;
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
  /** Autor (perfil público) */
  autorId?: string;
  autorNome?: string;
  autorFoto?: string;
}

/** Rascunho salvo pelo usuário (armazenado no Supabase). */
export interface Rascunho {
  id: string;
  tipo: 'alerta' | 'mutirao';
  dados: Record<string, unknown>;
  criadoEm: string;
  atualizadoEm: string;
}

/** Perfil público visível por outros usuários. */
export interface PerfilPublico {
  id: string;
  nome: string | null;
  fotoUrl: string | null;
  nivel: string | null;
  cidade: string | null;
  criadoEm: string;
  /**
   * O que a pessoa deixou visível no próprio perfil público. É escolha dela,
   * não do app — e vale para quem VISITA, por isso vem da view e não das
   * preferências locais (ver migration 0061). Padrão: tudo à mostra.
   */
  mostrarFotos: boolean;
  mostrarMapa: boolean;
  mostrarAcoes: boolean;
}
