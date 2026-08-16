/**
 * Gera os glifos do mapa — `public/font/Noto Sans Bold/*.pbf`.
 *
 * Rode só quando a fonte ou as faixas mudarem; o resultado é versionado, então
 * o build normal não depende disto. Precisa das dependências abaixo, que NÃO
 * estão no package.json de propósito (só servem aqui):
 *
 *   npm i --no-save @fontsource/noto-sans fontnik wawoff2
 *   node scripts/gerar-glifos.cjs
 *
 * Existe para o app não depender do `demotiles.maplibre.org`, o servidor de
 * demonstração do projeto MapLibre — sem SLA e explicitamente não recomendado
 * para produção. Quando ele não respondia, o mapa inteiro ficava em branco:
 * sem fonte, o MapLibre não desenha nem os pinos.
 *
 * Caminho: woff2 (o que o @fontsource entrega) → TTF (o que o fontnik aceita)
 * → .pbf por faixa de 256 caracteres (o que o MapLibre busca).
 *
 * Só as faixas que o Ecosurf usa: nomes de pico em português e números. Isso é
 * 0–255 (latim básico + acentuados: á, ã, ç, é, í, ó, ú) e 256–511 (latim
 * estendido, para nomes com caracteres menos comuns). O resto do Unicode
 * seriam megabytes para nada.
 */
const fs = require('node:fs')
const path = require('node:path')
const { decompress } = require('wawoff2')
const fontnik = require('fontnik')

const FAIXAS = [[0, 255], [256, 511]]
const SAIDA = path.join(__dirname, '..', 'public', 'font', 'Noto Sans Bold')

// `latin` cobre o português; `latin-ext` traz o que sobra do latim estendido.
const PARTES = ['latin', 'latin-ext'].map((p) =>
  path.join(__dirname, 'node_modules/@fontsource/noto-sans/files', `noto-sans-${p}-700-normal.woff2`))

async function main() {
  fs.mkdirSync(SAIDA, { recursive: true })

  // Uma fatia do @fontsource é um subconjunto da fonte; juntar os TTFs não é
  // trivial, então gera-se por parte e o `composite` do fontnik costura as
  // faixas resultantes — que é como o MapLibre espera receber.
  const ttfs = []
  for (const woff2 of PARTES) {
    const buf = await decompress(fs.readFileSync(woff2))
    ttfs.push(Buffer.from(buf))
    console.log(`  ${path.basename(woff2)} → TTF ${Buffer.from(buf).length} bytes`)
  }

  for (const [ini, fim] of FAIXAS) {
    const pedacos = []
    for (const ttf of ttfs) {
      const pbf = await new Promise((ok, erro) =>
        fontnik.range({ font: ttf, start: ini, end: fim }, (e, r) => (e ? erro(e) : ok(r))))
      pedacos.push(pbf)
    }
    const juntos = await new Promise((ok, erro) =>
      fontnik.composite(pedacos, (e, r) => (e ? erro(e) : ok(r))))
    const arquivo = path.join(SAIDA, `${ini}-${fim}.pbf`)
    fs.writeFileSync(arquivo, juntos)
    console.log(`  ${ini}-${fim}.pbf → ${juntos.length} bytes`)
  }
  console.log('\npronto em', SAIDA)
}

main().catch((e) => { console.error('FALHOU:', e.message); process.exit(1) })
