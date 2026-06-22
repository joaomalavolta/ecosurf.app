import type { Pico, RegiaoSurf, Ameaca } from '../types/domain'

/**
 * Seed do litoral de largada: Itanhaém / Litoral Sul de SP.
 *
 * ⚠️ Coordenadas e orientações são APROXIMADAS, só para o scaffold rodar.
 * Antes de publicar, confirmar com a comunidade local (nome do pico, fundo,
 * orientação real, e principalmente a visibilidade — pico sensível NÃO entra
 * como 'publico' sem aval de quem é dali).
 */

export const regioesSeed: RegiaoSurf[] = [
  { id: 'litoral-sul-sp', nome: 'Litoral Sul de SP', uf: 'SP' },
  { id: 'baixada-santista', nome: 'Baixada Santista', uf: 'SP' },
]

export const picosSeed: Pico[] = [
  {
    id: 'praia-do-sonho',
    nome: 'Praia do Sonho',
    praia: 'Praia do Sonho',
    municipio: 'Itanhaém',
    uf: 'SP',
    regiaoSurfId: 'litoral-sul-sp',
    lat: -24.1735,
    lng: -46.7625,
    orientacaoPraiaDeg: 140, // olha para SE
    fundo: 'areia',
    visibilidade: 'publico',
    descricao: 'Beach break de areia, pega bem com swell de S/SE e terral de manhã.',
  },
  {
    id: 'praia-dos-pescadores',
    nome: 'Praia dos Pescadores',
    praia: 'Praia dos Pescadores',
    municipio: 'Itanhaém',
    uf: 'SP',
    regiaoSurfId: 'litoral-sul-sp',
    lat: -24.1882,
    lng: -46.7889,
    orientacaoPraiaDeg: 150,
    fundo: 'misto',
    visibilidade: 'publico',
    descricao: 'Perto do morro e da foz; fundo misto, sensível ao vento lateral.',
  },
  {
    id: 'cibratel-ii',
    nome: 'Cibratel II',
    praia: 'Praia de Cibratel',
    municipio: 'Itanhaém',
    uf: 'SP',
    regiaoSurfId: 'litoral-sul-sp',
    lat: -24.2103,
    lng: -46.7906,
    orientacaoPraiaDeg: 135,
    fundo: 'areia',
    visibilidade: 'publico',
    descricao: 'Extensão longa de areia, várias bancadas conforme o banco do dia.',
  },
  {
    id: 'praia-de-peruibe',
    nome: 'Centro de Peruíbe',
    praia: 'Praia do Centro',
    municipio: 'Peruíbe',
    uf: 'SP',
    regiaoSurfId: 'litoral-sul-sp',
    lat: -24.3201,
    lng: -46.9988,
    orientacaoPraiaDeg: 145,
    fundo: 'areia',
    visibilidade: 'publico',
    descricao: 'Beach break exposto; restinga e APP no entorno.',
  },
]

export const ameacasSeed: Ameaca[] = [
  {
    id: 'residuos-canto-sul',
    titulo: 'Resíduos acumulados no canto sul',
    categoria: 'poluicao',
    status: 'identificado',
    picoId: 'praia-do-sonho',
    municipio: 'Itanhaém',
    uf: 'SP',
    precisao: 'aproximada',
    lat: -24.174,
    lng: -46.762,
    descricao: 'Acúmulo recorrente após ressaca e maré de sizígia.',
  },
  {
    id: 'agua-alterada-pescadores',
    titulo: 'Água com alteração visual',
    categoria: 'agua',
    status: 'em-observacao',
    picoId: 'praia-dos-pescadores',
    municipio: 'Itanhaém',
    uf: 'SP',
    precisao: 'aproximada',
    lat: -24.188,
    lng: -46.789,
    descricao: 'Coloração e espuma próximas à foz; investigar lançamento.',
  },
  {
    id: 'erosao-duna-peruibe',
    titulo: 'Erosão na duna frontal',
    categoria: 'erosao',
    status: 'recorrente',
    municipio: 'Peruíbe',
    uf: 'SP',
    precisao: 'aproximada',
    lat: -24.32,
    lng: -46.999,
    descricao: 'Recuo da linha de vegetação de restinga (APP).',
  },
]

export const PERFIL_DEMO = {
  nome: 'João Malavolta',
  nivel: 'Sentinela do litoral',
  validadoPorTelefone: true,
  picos: 18,
  mutiroes: 29,
  precisao: 91,
}
