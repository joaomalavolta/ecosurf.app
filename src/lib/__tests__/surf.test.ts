import { describe, it, expect } from 'vitest'
import { anguloEntre, classificarVento, pontoCardeal, rotularCondicao, nota, rotuloVento } from '../surf'

describe('anguloEntre', () => {
  it('calcula o menor ângulo entre direções', () => {
    expect(anguloEntre(0, 0)).toBe(0)
    expect(anguloEntre(0, 180)).toBe(180)
    expect(anguloEntre(90, 270)).toBe(180)
  })

  it('atravessa o norte corretamente (350° e 10° distam 20°, não 340°)', () => {
    expect(anguloEntre(350, 10)).toBe(20)
    expect(anguloEntre(10, 350)).toBe(20)
  })

  it('normaliza ângulos fora de 0–360', () => {
    expect(anguloEntre(-10, 10)).toBe(20)
    expect(anguloEntre(370, 10)).toBe(0)
  })
})

describe('classificarVento', () => {
  // Praia olhando para o leste (90°): offshore vem do oeste (270°).
  const PRAIA_LESTE = 90

  it('vento fraco é calmaria, independente da direção', () => {
    expect(classificarVento(90, PRAIA_LESTE, 4.9)).toBe('calmo')
    expect(classificarVento(270, PRAIA_LESTE, 0)).toBe('calmo')
  })

  it('vento vindo de terra é terral (offshore)', () => {
    expect(classificarVento(270, PRAIA_LESTE, 15)).toBe('terral')
    expect(classificarVento(240, PRAIA_LESTE, 15)).toBe('terral') // 30° do offshore
  })

  it('vento vindo do mar é maral (onshore)', () => {
    expect(classificarVento(90, PRAIA_LESTE, 15)).toBe('maral')  // 180° do offshore
    expect(classificarVento(120, PRAIA_LESTE, 15)).toBe('maral') // 150° do offshore
  })

  it('vento cruzado é lateral, com fronteiras em 60° e 120°', () => {
    expect(classificarVento(0, PRAIA_LESTE, 15)).toBe('lateral')    // 90° do offshore
    expect(classificarVento(330, PRAIA_LESTE, 15)).toBe('terral')   // exatamente 60°
    expect(classificarVento(30, PRAIA_LESTE, 15)).toBe('maral')     // exatamente 120°
  })
})

describe('pontoCardeal', () => {
  it('mapeia os 8 pontos da rosa', () => {
    const casos: Array<[number, string]> = [
      [0, 'N'], [45, 'NE'], [90, 'L'], [135, 'SE'],
      [180, 'S'], [225, 'SO'], [270, 'O'], [315, 'NO'],
    ]
    for (const [deg, esperado] of casos) expect(pontoCardeal(deg)).toBe(esperado)
  })

  it('arredonda para o ponto mais próximo e fecha o círculo', () => {
    expect(pontoCardeal(360)).toBe('N')
    expect(pontoCardeal(359)).toBe('N')
    expect(pontoCardeal(22)).toBe('N')   // 22/45 = 0.49 → N
    expect(pontoCardeal(23)).toBe('NE')  // 23/45 = 0.51 → NE
    expect(pontoCardeal(-45)).toBe('NO')
  })
})

describe('rotularCondicao', () => {
  it('onda abaixo de 0.4 m é Flat, mesmo com terral', () => {
    expect(rotularCondicao(0.3, 'terral')).toBe('Flat')
  })

  it('maral estraga qualquer tamanho: Mexido', () => {
    expect(rotularCondicao(1.5, 'maral')).toBe('Mexido')
  })

  it('terral + onda de verdade = Clássico', () => {
    expect(rotularCondicao(0.8, 'terral')).toBe('Clássico')
    expect(rotularCondicao(0.7, 'terral')).toBe('Surfável') // terral mas pequena
  })

  it('onda boa sem terral é Boa; pequena e limpa é Surfável', () => {
    expect(rotularCondicao(1.0, 'lateral')).toBe('Boa')
    expect(rotularCondicao(0.5, 'calmo')).toBe('Surfável')
  })
})

describe('nota', () => {
  it('fica sempre entre 0 e 5', () => {
    expect(nota(0, 0, 'maral')).toBe(0)      // 0 - 1 → piso 0
    expect(nota(10, 15, 'terral')).toBe(5)   // 3 + 1 + 1 → teto 5
  })

  it('período longo e terral somam bônus; maral desconta', () => {
    const base = nota(1, 8, 'lateral')       // min(3, 2) = 2
    expect(base).toBe(2)
    expect(nota(1, 9, 'lateral')).toBe(3)    // +1 período
    expect(nota(1, 9, 'terral')).toBe(4)     // +1 terral
    expect(nota(1, 9, 'maral')).toBe(2)      // +1 período, -1 maral
  })
})

describe('rotuloVento', () => {
  it('traduz cada tipo para o rótulo do app', () => {
    expect(rotuloVento('terral')).toBe('terral')
    expect(rotuloVento('maral')).toBe('maral')
    expect(rotuloVento('lateral')).toBe('vento lateral')
    expect(rotuloVento('calmo')).toBe('calmaria')
  })
})
