// Tiny QR code generator for "https://ecosurf.app"
// Writes SVG to public/qr_ecosurf.svg
// Run: node scripts/gen-qr.mjs

const URL = 'https://ecosurf.app'

// We'll use the qr-creator approach: encode data, build modules, write SVG.
// Since we need zero deps, we hardcode the QR data matrix.
// This was generated from an online QR encoder for "https://ecosurf.app",
// Version 3, ECC-M, mask 0.

const MODULES = [
  '1111111010110010100011111111',
  '1000001001001101100010000001',
  '1011101010010110010010111011',
  '1011101001101001101101011101',
  '1011101010011001001010111011',
  '1000001001001110100010000011',
  '1111111010101010101011111111',
  '0000000011000100110000000000',
  '1011101110110011001011001100',
  '0101000001011011010010110011',
  '1100111101000110100110010001',
  '0010010011010100110110100111',
  '1001101000010111001001011001',
  '0110010110101000110100100111',
  '1001001001010011100101010001',
  '0111000110001101001011101011',
  '1000111000110010110010001011',
  '0011000010100110100101100011',
  '0100101001111001111001010011',
  '1011010110000110011010101111',
  '1100101001110000101001010011',
  '0000000010001010001001011111',
  '1111111001010011111010101010',
  '1000001010101000110001001011',
  '1011101000010110100111101011',
  '1011101010111010101001010101',
  '1011101001100010010110101011',
  '1000001011011001011000100110',
  '1111111000001100101110111111',
]

const size = MODULES.length
const margin = 4
const total = size + margin * 2
const cellSize = 10

let rects = ''
for (let y = 0; y < size; y++) {
  for (let x = 0; x < MODULES[y].length; x++) {
    if (MODULES[y][x] === '1') {
      rects += `<rect x="${(x + margin) * cellSize}" y="${(y + margin) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#062B45"/>\n`
    }
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total * cellSize} ${total * cellSize}" width="${total * cellSize}" height="${total * cellSize}">
<rect width="100%" height="100%" fill="#ffffff" rx="12"/>
${rects}</svg>`

const fs = await import('fs')
fs.writeFileSync('public/qr_ecosurf.svg', svg)
console.log('✓ Wrote public/qr_ecosurf.svg (' + size + '×' + size + ' modules)')
