import { describe, it, expect } from 'vitest'
import { acaoDoVoltar } from '../captura-voltar'

describe('voltar da captura', () => {
  it('recorte de vídeo aberto: voltar fecha o recorte primeiro', () => {
    expect(acaoDoVoltar({ recortando: true, etapa: 'camera' }))
      .toEqual({ tipo: 'fechar-recorte' })
    // Mesmo em etapas mais adiante, o recorte no topo vence.
    expect(acaoDoVoltar({ recortando: true, etapa: 'selecionar-pico' }))
      .toEqual({ tipo: 'fechar-recorte' })
  })

  it('REGRESSÃO: selecionar-pico NÃO cai em confirmar-pico (tela some sem botão)', () => {
    // O bug do vídeo da galeria: voltar mandava para confirmar-pico, que
    // exige um registro em confirmação. Sem ele, a tela desaparecia.
    const acao = acaoDoVoltar({ recortando: false, etapa: 'selecionar-pico' })
    expect(acao).toEqual({ tipo: 'abrir-camera' })
    expect(acao).not.toMatchObject({ etapa: 'confirmar-pico' })
  })

  it('confirmar-pico e classificar-alerta voltam para a câmera', () => {
    expect(acaoDoVoltar({ recortando: false, etapa: 'confirmar-pico' }))
      .toEqual({ tipo: 'abrir-camera' })
    expect(acaoDoVoltar({ recortando: false, etapa: 'classificar-alerta' }))
      .toEqual({ tipo: 'abrir-camera' })
  })

  it('etapas lineares recuam uma a uma', () => {
    expect(acaoDoVoltar({ recortando: false, etapa: 'camera' }))
      .toEqual({ tipo: 'ir-etapa', etapa: 'localizacao' })
    expect(acaoDoVoltar({ recortando: false, etapa: 'localizacao' }))
      .toEqual({ tipo: 'ir-etapa', etapa: 'tipo' })
  })

  it('tipo e concluido não têm voltar interno', () => {
    expect(acaoDoVoltar({ recortando: false, etapa: 'tipo' })).toEqual({ tipo: 'nada' })
    expect(acaoDoVoltar({ recortando: false, etapa: 'concluido' })).toEqual({ tipo: 'nada' })
  })
})
