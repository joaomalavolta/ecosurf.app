import { describe, it, expect } from 'vitest'
import { linkFoto, deveAbrirVisor } from '../linkFoto'

/** Atalho: a query string que o link produziu, como o router a entregaria. */
const params = (url: string) => new URLSearchParams(url.slice(url.indexOf('?')))

describe('linkFoto', () => {
  it('sem pedido explícito, o link só aponta a foto', () => {
    expect(linkFoto('itanhaem', 'f1')).toBe('/pico/itanhaem?foto=f1')
  })

  it('com pedido explícito, marca a intenção de ver em tela cheia', () => {
    expect(linkFoto('itanhaem', 'f1', true)).toBe('/pico/itanhaem?foto=f1&ver=1')
  })
})

describe('deveAbrirVisor', () => {
  it('o padrão é NÃO abrir — link sem marca não sequestra a navegação', () => {
    expect(deveAbrirVisor(params(linkFoto('p', 'f')))).toBe(false)
  })

  it('abre quando o toque foi na foto', () => {
    expect(deveAbrirVisor(params(linkFoto('p', 'f', true)))).toBe(true)
  })

  it('link antigo ou colado, sem a marca, cai no caso seguro', () => {
    expect(deveAbrirVisor(new URLSearchParams('?foto=f1'))).toBe(false)
    expect(deveAbrirVisor(new URLSearchParams(''))).toBe(false)
    expect(deveAbrirVisor(new URLSearchParams('?foto=f1&ver=0'))).toBe(false)
    expect(deveAbrirVisor(new URLSearchParams('?foto=f1&ver=sim'))).toBe(false)
  })

  it('a foto continua identificada nos dois casos', () => {
    expect(params(linkFoto('p', 'f')).get('foto')).toBe('f')
    expect(params(linkFoto('p', 'f', true)).get('foto')).toBe('f')
  })
})
