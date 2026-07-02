// Registro nacional das estações da publicação Tábuas das Marés 2026
// (CHM/Marinha do Brasil) — 56 pontos oficiais no total (Santos vive em
// stations.ts com configuração própria). Gerado do índice sistematizado.
// Cada estação ganha tábua oficial quando seu PDF é ingerido por
// scripts/ingerir_tabua_chm.py; até lá, picos próximos caem no modelo genérico.

export interface EstacaoCHM {
  id: string
  nome: string
  uf: string
  /** Nº da estação na publicação CHM 2026 (auditoria/rastreabilidade). */
  chmNum: number
  lat: number
  lng: number
}

export const ESTACOES_CHM_2026: EstacaoCHM[] = [
  { id: 'barra-norte-arco-lamoso', nome: 'Barra Norte - Arco Lamoso', uf: 'Pará', chmNum: 1, lat: -1.49, lng: -49.22 },
  { id: 'igarape-grande-do-curua', nome: 'Igarapé Grande Do Curuá', uf: 'Amapá', chmNum: 2, lat: -0.76, lng: -50.12 },
  { id: 'porto-de-santana', nome: 'Porto De Santana', uf: 'Amapá', chmNum: 3, lat: -0.06, lng: -51.17 },
  { id: 'ilha-dos-guaras', nome: 'Ilha Dos Guarás', uf: 'Pará', chmNum: 4, lat: -0.6, lng: -47.92 },
  { id: 'fundeadouro-de-salinopolis', nome: 'Fundeadouro De Salinópolis', uf: 'Pará', chmNum: 5, lat: -0.62, lng: -47.35 },
  { id: 'ilha-do-mosqueiro', nome: 'Ilha Do Mosqueiro', uf: 'Pará', chmNum: 6, lat: -1.17, lng: -48.47 },
  { id: 'porto-de-belem', nome: 'Porto De Belém', uf: 'Pará', chmNum: 7, lat: -1.4, lng: -48.49 },
  { id: 'porto-de-vila-do-conde', nome: 'Porto De Vila Do Conde', uf: 'Pará', chmNum: 8, lat: -1.54, lng: -48.75 },
  { id: 'atracadouro-de-breves', nome: 'Atracadouro De Breves', uf: 'Pará', chmNum: 9, lat: -1.69, lng: -50.48 },
  { id: 'sao-luis', nome: 'São Luís', uf: 'Maranhão', chmNum: 10, lat: -2.53, lng: -44.31 },
  { id: 'terminal-da-ponta-da-madeira', nome: 'Terminal Da Ponta Da Madeira', uf: 'Maranhão', chmNum: 11, lat: -2.57, lng: -44.38 },
  { id: 'porto-de-itaqui', nome: 'Porto De Itaqui', uf: 'Maranhão', chmNum: 12, lat: -2.58, lng: -44.37 },
  { id: 'terminal-da-alumar', nome: 'Terminal Da Alumar', uf: 'Maranhão', chmNum: 13, lat: -2.68, lng: -44.36 },
  { id: 'porto-de-tutoia', nome: 'Porto De Tutóia', uf: 'Maranhão', chmNum: 14, lat: -2.77, lng: -42.28 },
  { id: 'porto-de-luis-correia', nome: 'Porto De Luís Correia', uf: 'Piauí', chmNum: 15, lat: -2.85, lng: -41.65 },
  { id: 'terminal-portuario-do-pecem', nome: 'Terminal Portuário Do Pecém', uf: 'Ceará', chmNum: 16, lat: -3.54, lng: -38.8 },
  { id: 'porto-de-mucuripe-fortaleza', nome: 'Porto De Mucuripe - Fortaleza', uf: 'Ceará', chmNum: 17, lat: -3.72, lng: -38.48 },
  { id: 'arquipelago-de-fernando-de-noronha', nome: 'Arquipélago De Fernando De Noronha', uf: 'Pernambuco', chmNum: 18, lat: -3.83, lng: -32.4 },
  { id: 'porto-de-areia-branca-termisa', nome: 'Porto De Areia Branca - Termisa', uf: 'Rio Grande do Norte', chmNum: 19, lat: -4.83, lng: -37.04 },
  { id: 'porto-de-macau', nome: 'Porto De Macau', uf: 'Rio Grande do Norte', chmNum: 20, lat: -5.1, lng: -36.67 },
  { id: 'porto-de-guamare', nome: 'Porto De Guamaré', uf: 'Rio Grande do Norte', chmNum: 21, lat: -5.11, lng: -36.32 },
  { id: 'porto-de-natal-com3dn', nome: 'Porto De Natal - Com3Dn', uf: 'Rio Grande do Norte', chmNum: 22, lat: -5.77, lng: -35.2 },
  { id: 'porto-de-cabedelo', nome: 'Porto De Cabedelo', uf: 'Paraíba', chmNum: 23, lat: -6.97, lng: -34.84 },
  { id: 'porto-do-recife', nome: 'Porto Do Recife', uf: 'Pernambuco', chmNum: 24, lat: -8.06, lng: -34.87 },
  { id: 'porto-de-suape', nome: 'Porto De Suape', uf: 'Pernambuco', chmNum: 25, lat: -8.39, lng: -34.96 },
  { id: 'porto-de-maceio', nome: 'Porto De Maceió', uf: 'Alagoas', chmNum: 26, lat: -9.68, lng: -35.73 },
  { id: 'terminal-maritimo-inacio-barbosa', nome: 'Terminal Marítimo Inácio Barbosa', uf: 'Sergipe', chmNum: 27, lat: -10.84, lng: -36.92 },
  { id: 'capitania-dos-portos-de-sergipe', nome: 'Capitania Dos Portos De Sergipe', uf: 'Sergipe', chmNum: 28, lat: -10.92, lng: -37.05 },
  { id: 'porto-de-madre-de-deus', nome: 'Porto De Madre De Deus', uf: 'Bahia', chmNum: 29, lat: -12.75, lng: -38.62 },
  { id: 'porto-de-aratu-base-naval', nome: 'Porto De Aratu - Base Naval', uf: 'Bahia', chmNum: 30, lat: -12.8, lng: -38.5 },
  { id: 'porto-de-salvador', nome: 'Porto De Salvador', uf: 'Bahia', chmNum: 31, lat: -12.97, lng: -38.52 },
  { id: 'porto-de-ilheus-malhado', nome: 'Porto De Ilhéus - Malhado', uf: 'Bahia', chmNum: 32, lat: -14.78, lng: -39.03 },
  { id: 'terminal-de-barra-do-riacho', nome: 'Terminal De Barra Do Riacho', uf: 'Espírito Santo', chmNum: 33, lat: -19.84, lng: -40.06 },
  { id: 'porto-de-tubarao', nome: 'Porto De Tubarão', uf: 'Espírito Santo', chmNum: 34, lat: -20.29, lng: -40.24 },
  { id: 'porto-de-vitoria', nome: 'Porto De Vitória', uf: 'Espírito Santo', chmNum: 35, lat: -20.32, lng: -40.34 },
  { id: 'ilha-da-trindade', nome: 'Ilha Da Trindade', uf: 'Espírito Santo', chmNum: 36, lat: -20.51, lng: -29.31 },
  { id: 'terminal-da-ponta-do-ubu', nome: 'Terminal Da Ponta Do Ubu', uf: 'Espírito Santo', chmNum: 37, lat: -20.79, lng: -40.57 },
  { id: 'porto-do-acu', nome: 'Porto Do Açu', uf: 'Rio de Janeiro', chmNum: 38, lat: -21.81, lng: -40.1 },
  { id: 'terminal-maritimo-de-imbetiba', nome: 'Terminal Marítimo De Imbetiba', uf: 'Rio de Janeiro', chmNum: 39, lat: -22.39, lng: -41.77 },
  { id: 'porto-do-rio-de-janeiro-ilha-fiscal', nome: 'Porto Do Rio De Janeiro - Ilha Fiscal', uf: 'Rio de Janeiro', chmNum: 40, lat: -22.9, lng: -43.17 },
  { id: 'porto-de-itaguai', nome: 'Porto De Itaguaí', uf: 'Rio de Janeiro', chmNum: 41, lat: -22.93, lng: -43.84 },
  { id: 'porto-do-forno', nome: 'Porto Do Forno', uf: 'Rio de Janeiro', chmNum: 42, lat: -22.97, lng: -42.01 },
  { id: 'terminal-da-ilha-guaiba', nome: 'Terminal Da Ilha Guaíba', uf: 'Rio de Janeiro', chmNum: 43, lat: -22.1, lng: -44.03 },
  { id: 'porto-de-angra-dos-reis', nome: 'Porto De Angra Dos Reis', uf: 'Rio de Janeiro', chmNum: 44, lat: -23.01, lng: -44.32 },
  { id: 'porto-de-sao-sebastiao', nome: 'Porto De São Sebastião', uf: 'São Paulo', chmNum: 45, lat: -23.81, lng: -45.4 },
  { id: 'terminal-portuario-da-ponta-do-felix', nome: 'Terminal Portuário Da Ponta Do Félix', uf: 'Paraná', chmNum: 47, lat: -25.46, lng: -48.68 },
  { id: 'porto-de-paranagua-cais-oeste', nome: 'Porto De Paranaguá - Cais Oeste', uf: 'Paraná', chmNum: 48, lat: -25.5, lng: -48.53 },
  { id: 'barra-de-paranagua-canal-sueste', nome: 'Barra De Paranaguá - Canal Sueste', uf: 'Paraná', chmNum: 49, lat: -25.54, lng: -48.3 },
  { id: 'barra-de-paranagua-canal-da-galheta', nome: 'Barra De Paranaguá - Canal Da Galheta', uf: 'Paraná', chmNum: 50, lat: -25.57, lng: -48.32 },
  { id: 'porto-de-sao-francisco-do-sul', nome: 'Porto De São Francisco Do Sul', uf: 'Santa Catarina', chmNum: 51, lat: -26.25, lng: -48.64 },
  { id: 'porto-de-itajai', nome: 'Porto De Itajaí', uf: 'Santa Catarina', chmNum: 52, lat: -26.91, lng: -48.65 },
  { id: 'porto-de-florianopolis', nome: 'Porto De Florianópolis', uf: 'Santa Catarina', chmNum: 53, lat: -27.59, lng: -48.56 },
  { id: 'porto-de-imbituba', nome: 'Porto De Imbituba', uf: 'Santa Catarina', chmNum: 54, lat: -26.91, lng: -48.65 },
  { id: 'porto-do-rio-grande', nome: 'Porto Do Rio Grande', uf: 'Rio Grande do Sul', chmNum: 55, lat: -32.14, lng: -52.1 },
  { id: 'fundeadouro-da-estacao-antartica-comandante-ferraz', nome: 'Fundeadouro Da Estação Antártica Comandante Ferraz', uf: 'Antártica', chmNum: 56, lat: -62.09, lng: 58.4 },
]
