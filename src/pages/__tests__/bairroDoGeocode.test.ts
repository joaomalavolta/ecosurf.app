import { describe, it, expect } from 'vitest'
import { bairroDoGeocode } from '../CapturePage'

describe('bairroDoGeocode', () => {
  it('prefere o bairro (suburb), que é o mais específico', () => {
    expect(bairroDoGeocode({ suburb: 'Morro do Paranambuco', neighbourhood: 'Centro' }))
      .toBe('Morro do Paranambuco')
  })

  it('cai para neighbourhood e depois village', () => {
    expect(bairroDoGeocode({ neighbourhood: 'Cibratel' })).toBe('Cibratel')
    expect(bairroDoGeocode({ village: 'Peruíbe' })).toBe('Peruíbe')
  })

  it('NÃO cai para a cidade — ela já tem campo próprio', () => {
    // A cadeia original terminava em `|| address.city`, então o nome da
    // cidade podia acabar escrito no campo "Nome do local", repetindo no
    // título o que o campo de município já dizia.
    expect(bairroDoGeocode({ city: 'Itanhaém' })).toBe('')
    expect(bairroDoGeocode({ city: 'Santos', town: 'Santos' })).toBe('')
  })

  it('sem endereço, sem sugestão — e o chip não aparece', () => {
    expect(bairroDoGeocode(undefined)).toBe('')
    expect(bairroDoGeocode({})).toBe('')
  })
})
