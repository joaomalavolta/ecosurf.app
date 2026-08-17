/**
 * Os pinos do Ecosurf — a identidade visual do mapa, em um lugar só.
 *
 * Estava tudo dentro do MapView. Quando nasceu o mapa de contribuições (o do
 * perfil e o da comunidade), a escolha era copiar 60 linhas de SVG ou tirar
 * daqui. Copiar significaria dois mapas que começam iguais e vão divergindo a
 * cada ajuste de cor — o alerta de esgoto cinza numa tela e azul na outra.
 *
 * Então mora aqui: quem desenha pino no Ecosurf importa deste arquivo.
 */

/**
 * Pino estilo ZUrb — círculo colorido sólido + ponteira triangular.
 * Cada SVG tem filter ID ÚNICO (sufixo cor hex) para evitar conflito no MapLibre.
 */
const ZURB_PIN = (bg: string, paths: string, size = 48, contorno = '#fff', contornoW = 3) => {
  const uid = bg.replace('#', '') + contorno.replace('#', '')
  const r = size / 2
  const svgH = size + 12
  const cy = r
  const tipY = size + 2
  // Ícone Tabler = 24x24. scale(0.92) ocupa ~60% do círculo (como ZUrb)
  const s = 0.92
  const ix = r - 12 * s   // centralizar horizontalmente
  const iy = cy - 12 * s  // centralizar verticalmente
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${svgH}" viewBox="0 0 ${size} ${svgH}">` +
    `<defs><filter id="s${uid}" x="-30%" y="-20%" width="160%" height="160%">` +
    `<feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.55"/>` +
    `</filter></defs>` +
    `<polygon points="${r - 5},${size - 4} ${r},${tipY} ${r + 5},${size - 4}" fill="${bg}" stroke="${contorno}" stroke-width="2" stroke-linejoin="round"/>` +
    `<circle cx="${r}" cy="${cy}" r="${r - 3}" fill="${bg}" stroke="${contorno}" stroke-width="${contornoW}" filter="url(#s${uid})"/>` +
    `<g transform="translate(${ix}, ${iy}) scale(${s})" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">` +
    paths +
    `</g></svg>`
  )
}

/* Paths SVG (Tabler icons) */
const WAVE = '<path d="M3 9c3 -2 6 -2 9 0s6 2 9 0"/><path d="M3 15c3 -2 6 -2 9 0s6 2 9 0"/>'
const PEOPLE = '<path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/>'
const DROP = '<path d="M12 3c-3.2 4.5-6 7.5-6 10.5a6 6 0 0 0 12 0c0-3-2.8-6-6-10.5z"/>'
const TRASH = '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>'
const BOTTLE = '<path d="M10 5h4"/><path d="M10 5v-1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1"/><rect x="8" y="5" width="8" height="14" rx="1.5"/><path d="M11 8v6"/><path d="M13 8v6"/>'
const MOUNTAIN = '<path d="M3 20h18"/><path d="M12 4l-8 16h16z"/>'
const FLAME = '<path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5-1.786 3-2.791 3-4 2z"/>'
const FISH = '<path d="M16.69 7.44a6.973 6.973 0 0 0-1.69 4.56c0 1.747 .642 3.346 1.7 4.57"/><path d="M2 9.504c7.4 8.83 14.6 7.83 19-1.504-4.4-9.33-11.6-10.33-19-1.504z"/><circle cx="14.5" cy="11.5" r=".5" fill="#fff"/>'
const DOT = '<circle cx="12" cy="12" r="4"/><path d="M12 3v2"/><path d="M12 19v2"/><path d="M3 12h2"/><path d="M19 12h2"/>'
const WAVESINE = '<path d="M21 12h-2c-.894 0-1.662-.857-1.761-2c-.296-3.45-.749-6-2.749-6s-2.5 3.582-2.5 8s-.5 8-2.5 8s-2.452-2.547-2.749-6c-.1-1.147-.867-2-1.763-2h-1.928"/>'
const HOME = '<path d="M5 12l-2 0l9-9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"/>'
const QUESTION = '<path d="M8 8a3.5 3 0 0 1 3.5-3h1a3.5 3 0 0 1 3.5 3a3 3 0 0 1-2 3c-1.113.667-2 1.667-2 3"/><path d="M12 19v.01"/>'
/* Registros positivos */
const PAW = '<path d="M12 13c-1.9 0-3 1.5-3.8 2.9c-.7 1.2-1.7 1.7-1.7 2.9c0 1 .8 1.7 1.8 1.7c1.1 0 2.3-.8 3.7-.8s2.6 .8 3.7 .8c1 0 1.8-.7 1.8-1.7c0-1.2-1-1.7-1.7-2.9c-.8-1.4-1.9-2.9-3.8-2.9z"/><ellipse cx="6.4" cy="10.4" rx="1.7" ry="2.1"/><ellipse cx="10.2" cy="6.9" rx="1.7" ry="2.2"/><ellipse cx="14.6" cy="6.9" rx="1.7" ry="2.2"/><ellipse cx="18" cy="10.4" rx="1.7" ry="2.1"/>'
// Ovo + linha de areia. A primeira versão era um path afunilado no topo, o
// que a 44 px vira uma GOTA — a mesma silhueta do pino de esgoto, só que
// dourada. Elipse não afunila, e a linha embaixo é o que diz "área", não só
// "ovo". Conferido em render, lado a lado com o de esgoto.
const EGG = '<ellipse cx="12" cy="10.8" rx="4.6" ry="5.8"/><path d="M4.5 19.5h15"/>'
// Ninhada: dois ovos inclinados, um maior e um menor. Fica perto do de desova
// de propósito — são a mesma história em dois momentos — e a inclinação é o
// que impede os dois de lerem como "dois círculos".
const EGGS = '<ellipse cx="9.2" cy="9.8" rx="3.9" ry="5" transform="rotate(-14 9.2 9.8)"/><ellipse cx="16.2" cy="15.4" rx="3.1" ry="4" transform="rotate(16 16.2 15.4)"/>'
const TREE = '<path d="M12 13l-2-2"/><path d="M12 12l2-2"/><path d="M12 21v-13"/><path d="M9.824 15.995a3 3 0 0 1-2.743-3.69a2.998 2.998 0 0 1 .304-4.833a3 3 0 0 1 4.615-3.472a3 3 0 0 1 4.614 3.472a2.998 2.998 0 0 1 .305 4.833a3 3 0 0 1-2.919 3.69h-4.176z"/>'
const RECYCLE = '<path d="M12 17l-2 2l2 2"/><path d="M10 19h9a2 2 0 0 0 1.75-2.75l-.55-1"/><path d="M8.536 11l-.732-2.732l-2.732 .732"/><path d="M7.804 8.268l-4.5 7.794a2 2 0 0 0 1.506 2.89l1.141 .024"/><path d="M15.464 11l2.732 .732l.732-2.732"/><path d="M18.196 11.732l-4.5-7.794a2 2 0 0 0-3.256-.14l-.591 .976"/>'

/** Pino "aceso" — contorno verde vibrante no lugar do antigo badge de check
 *  (o badge era desenhado fora do viewBox e aparecia com o círculo cortado). */
const ZURB_PIN_ATIVO = (bg: string, paths: string, size = 48) =>
  ZURB_PIN(bg, paths, size, '#22c55e', 3.5)

/** Ícones — modelo ZUrb: círculos sólidos com ponteira + sombra forte */
export const ICONES: Record<string, string> = {
  // 🏄 Pico de surf — azul oceano
  'ic-pico':           ZURB_PIN('#0D6EA8', WAVE, 44),
  'ic-pico-ativo':     ZURB_PIN_ATIVO('#0D6EA8', WAVE, 44),
  // 🧹 Mutirão — laranja
  'ic-mutirao':        ZURB_PIN('#FF8C42', PEOPLE, 44),
  // 🔴 Alertas ambientais — tamanho padrão 44px
  'ic-lixo-praia':     ZURB_PIN('#E84855', TRASH, 44),
  'ic-lixo-rio':       ZURB_PIN('#D64045', BOTTLE, 44),
  'ic-esgoto':         ZURB_PIN('#7B8794', DROP, 44),
  'ic-erosao':         ZURB_PIN('#C17817', MOUNTAIN, 44),
  'ic-oleo':           ZURB_PIN('#3D3D3D', DOT, 44),
  'ic-animal':         ZURB_PIN('#5B8C5A', FISH, 44),
  'ic-entulho':        ZURB_PIN('#9B6B4D', TRASH, 44),
  'ic-microplasticos': ZURB_PIN('#B266B2', DOT, 44),
  'ic-espuma':         ZURB_PIN('#5E8C61', WAVESINE, 44),
  'ic-queimada':       ZURB_PIN('#FF6B35', FLAME, 44),
  'ic-ocupacao':       ZURB_PIN('#8B6914', HOME, 44),
  'ic-outro':          ZURB_PIN('#6B7280', QUESTION, 44),
  // 🐢 Registros positivos — faixa verde/petróleo/dourado, longe dos alertas.
  //    As cores são as mesmas de CATEGORIAS_POSITIVAS em SeletorCategoria.tsx:
  //    um pino e o seu chip de categoria não podem discordar de cor.
  'ic-fauna-avistada':        ZURB_PIN('#2E9B6B', PAW, 44),
  'ic-area-desova':           ZURB_PIN('#E0A82E', EGG, 44),
  'ic-filhotes':              ZURB_PIN('#7AA93C', EGGS, 44),
  'ic-vegetacao-recuperacao': ZURB_PIN('#15803D', TREE, 44),
  'ic-coleta-seletiva':       ZURB_PIN('#0E9AA7', RECYCLE, 44),
}

/**
 * Ícone de mapa (Tabler) para o botão de alternar base — cor escura para
 * contrastar com o fundo branco padrão dos controles do MapLibre.
 */
export const ICONE_MAPA_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l6 -3l6 3l6 -3v13l-6 3l-6 -3l-6 3v-13"/><path d="M9 4v13"/><path d="M15 7v13"/></svg>'

/**
 * `icon-image` do MapLibre: traduz a propriedade `tipo` da feature no nome do
 * ícone. As categorias antigas (lixo, poluicao, privatizacao, obra) continuam
 * mapeadas — há alertas gravados com elas.
 */
export const EXPRESSAO_ICONE = [
  'match',
  ['get', 'tipo'],
  'lixo-praia', 'ic-lixo-praia',
  'lixo-rio', 'ic-lixo-rio',
  'esgoto', 'ic-esgoto',
  'erosao', 'ic-erosao',
  'oleo', 'ic-oleo',
  'animal', 'ic-animal',
  'entulho', 'ic-entulho',
  'microplasticos', 'ic-microplasticos',
  'espuma', 'ic-espuma',
  'queimada', 'ic-queimada',
  'ocupacao', 'ic-ocupacao',
  'outro', 'ic-outro',
  'fauna-avistada', 'ic-fauna-avistada',
  'area-desova', 'ic-area-desova',
  'filhotes', 'ic-filhotes',
  'vegetacao-recuperacao', 'ic-vegetacao-recuperacao',
  'coleta-seletiva', 'ic-coleta-seletiva',
  'mutirao', 'ic-mutirao',
  'lixo', 'ic-lixo-praia',
  'poluicao', 'ic-oleo',
  'privatizacao', 'ic-ocupacao',
  'obra', 'ic-entulho',
  'pico-ativo', 'ic-pico-ativo',
  'ic-pico',
] as const

/**
 * Categorias da família POSITIVA, do ponto de vista do mapa.
 *
 * Mora aqui, junto de `EXPRESSAO_ICONE`, porque este arquivo já é a autoridade
 * dos ids no lado do mapa — e porque `MapView` importa `pins.ts` mas não pode
 * importar `SeletorCategoria.tsx`, que carregaria dezesseis ícones React e um
 * componente para dentro do chunk do mapa só para ler cinco strings.
 *
 * `src/components/__tests__/categorias.test.ts` compara esta lista com o
 * catálogo de `SeletorCategoria` e falha se as duas divergirem — que é o
 * jeito de esta duplicação não virar uma categoria invisível no filtro.
 */
export const TIPOS_POSITIVO = [
  'fauna-avistada', 'area-desova', 'filhotes', 'vegetacao-recuperacao', 'coleta-seletiva',
] as const

/** Registra um ícone no mapa. Erro de carga não derruba o resto. */
export function carregarIcone(
  map: { hasImage: (n: string) => boolean; addImage: (n: string, i: HTMLImageElement, o?: { pixelRatio: number }) => void },
  nome: string,
  svg: string,
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      if (!map.hasImage(nome)) map.addImage(nome, img, { pixelRatio: 1 })
      resolve()
    }
    img.onerror = () => resolve()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  })
}

/** Carrega o conjunto inteiro de ícones. */
export function carregarIcones(map: Parameters<typeof carregarIcone>[0]): Promise<void[]> {
  return Promise.all(Object.entries(ICONES).map(([nome, svg]) => carregarIcone(map, nome, svg)))
}

/**
 * Fonte dos rótulos do mapa — servida por nós, em `public/font/`.
 *
 * Vinha do `demotiles.maplibre.org`, o servidor de demonstração do projeto
 * MapLibre: mantido por boa vontade, sem SLA e explicitamente não recomendado
 * para produção. Quando ele não respondia, o MapLibre não desenhava NADA — nem
 * os pinos, que são imagens e não dependem de fonte. O mapa ficava um retângulo
 * vazio, e a leitura de quem olha é "não há nada mapeado aqui".
 *
 * Os .pbf foram gerados a partir do Noto Sans Bold (SIL Open Font License) e
 * versionados no repositório. Só as faixas que o app usa: 0–255 cobre o
 * português inteiro (á, ã, ç, é, í, ó, ú vivem no latim-1) e 256–511 pega o
 * latim estendido. O resto do Unicode seriam megabytes para nada.
 */
export const GLYPHS = '/font/{fontstack}/{range}.pbf'

/** A única fonte que os mapas usam, e o único intervalo que importa. */
const GLYPH_TESTE = GLYPHS
  .replace('{fontstack}', encodeURIComponent('Noto Sans Bold'))
  .replace('{range}', '0-255')

let promessaGlyphs: Promise<boolean> | null = null

/**
 * As fontes responderam?
 *
 * Continua valendo mesmo agora que os .pbf são nossos. O motivo é o que a
 * investigação mostrou no navegador: quando a fonte não vem, o MapLibre não
 * desenha NADA — nem os pinos, que são imagens e não dependem de fonte. O mapa
 * fica um retângulo vazio, e quem olha lê "não há nada mapeado aqui", não "a
 * rede falhou".
 *
 * Servir por conta própria tira o terceiro do caminho, mas não torna a
 * requisição infalível: um deploy que esqueça a pasta `public/font`, um cache
 * do service worker meio gravado, a rede caindo entre o HTML e o .pbf. Nesses
 * casos o mapa entra sem as camadas de texto — perde os nomes dos picos e o
 * número dentro das bolhas, e mantém os pinos, que são o conteúdo.
 *
 * Uma consulta por sessão, compartilhada entre os dois mapas.
 */
export function temGlyphs(): Promise<boolean> {
  promessaGlyphs ??= fetch(GLYPH_TESTE, { method: 'GET' })
    .then((r) => r.ok)
    .catch(() => false)
  return promessaGlyphs
}
