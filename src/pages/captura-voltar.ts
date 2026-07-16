/**
 * Máquina de "voltar" da captura, isolada para ser testável.
 *
 * O bug que isto blinda: no fluxo do vídeo da galeria, voltar de
 * 'selecionar-pico' mandava para 'confirmar-pico' — que só renderiza se houver
 * um registro em confirmação. Como não havia, a tela sumia sem botão publicar.
 * A regra correta: quando não há mais nada a "desfazer" numa etapa, o voltar
 * retorna à CÂMERA, nunca a uma etapa que depende de estado inexistente.
 */

export type EtapaCaptura =
  | 'tipo'
  | 'localizacao'
  | 'onde-quando'
  | 'camera'
  | 'confirmar-pico'
  | 'selecionar-pico'
  | 'classificar-alerta'
  | 'concluido'

export type AcaoVoltar =
  | { tipo: 'fechar-recorte' }
  | { tipo: 'abrir-camera' }
  | { tipo: 'ir-etapa'; etapa: EtapaCaptura }
  | { tipo: 'nada' }

/**
 * Decide o que o "voltar" (botão físico do Android / popstate) deve fazer,
 * dado o estado atual do overlay de captura.
 */
export function acaoDoVoltar(estado: {
  recortando: boolean
  etapa: EtapaCaptura
}): AcaoVoltar {
  // O recorte de vídeo é o overlay mais ao topo: fecha primeiro.
  if (estado.recortando) return { tipo: 'fechar-recorte' }

  switch (estado.etapa) {
    // Telas de registro em andamento: voltar retorna à câmera (nada foi
    // enviado ainda; o gesto é seguro e não pode cair em etapa fantasma).
    case 'classificar-alerta':
    case 'confirmar-pico':
    case 'selecionar-pico':
      return { tipo: 'abrir-camera' }
    case 'camera':
      return { tipo: 'ir-etapa', etapa: 'localizacao' }
    case 'onde-quando':
      return { tipo: 'ir-etapa', etapa: 'localizacao' }
    case 'localizacao':
      return { tipo: 'ir-etapa', etapa: 'tipo' }
    default:
      return { tipo: 'nada' }
  }
}
