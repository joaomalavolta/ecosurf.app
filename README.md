# Ecosurf

Radar de surf colaborativo + cartografia socioambiental do litoral brasileiro.
A foto da comunidade lê o mar do dia; o mesmo gesto documenta o conflito costeiro.

> Scaffold inicial. Roda com dados-semente (Itanhaém / Litoral Sul de SP) e
> previsão real via Open-Meteo. Backend, auth e pipeline de mídia ainda não existem.

## Stack

- **React + Vite + TypeScript**
- **React Router** — rota por pico (`/pico/:id`), deep-link compartilhável
- **MapLibre GL** — mapa = território (tiles OpenFreeMap no dev; PMTiles auto-hospedado em produção)
- **Framer Motion** — animação que ensina (a passagem do tempo na timeline)
- **Open-Meteo Marine** — forecast nacional, grátis, sem chave

## Rodar

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # typecheck + build de produção
```

## Decisões de produto já tomadas

1. **Radar de surf é a espinha** (hábito diário), com a missão socioambiental
   embarcada. Navegação = *caminho C*: `Radar · Mapa · [📷 captura] · Ações · Perfil`,
   com a câmera no centro (a foto é o conteúdo mais nobre).
2. **Nasce nacional-pronto, lança comunidade-concentrada.** Forecast é nacional
   (Open-Meteo); comunidade/maré/território começam no Litoral Sul de SP.
   `regiao_surf` é entidade de 1ª classe.
3. **Pico é permanente; feed é do dia.** A 1ª foto "acende" o pico; o feed
   arquiva e vira histórico (base para padrão de surf e registro ambiental no tempo).
4. **"Ativo agora" decai** ao longo do dia (`lib/time.ts`) — honestidade de leitura.

## Arquitetura de dados (ver `src/types/domain.ts`)

```
RegiaoSurf (curada) ──< Pico (permanente, geometria) ──< FeedDia (efêmero) ──< Foto
                              │                                                   └─ procedência (anti-fake) + maré sobreposta
                              ├─ municipio/uf  → DERIVADOS via PostGIS + malha IBGE
                              └─ visibilidade  → publico | comunidade | abafado (soberania local)
Ameaca ──> precisao: exata | aproximada (protege denunciante)
```

A camada `src/services/` isola o acesso a dados: hoje lê do seed em memória,
amanhã troca por API (PostGIS) ou Supabase sem tocar na UI.

## A peça de assinatura

`src/components/TideScrubTimeline.tsx` — a foto ocupa o topo; a **curva de maré
do dia é a régua temporal**. Arrastar troca a foto; vento e virada de maré
aparecem sobre a curva. Cada foto mostra hora, autor, frescor, procedência e a
maré do instante.

## Pendências conscientes (não são esquecimento)

| Tema | Estado | Próximo passo |
|---|---|---|
| **Maré** | modelo senoidal mock | harmônicas da DHN por estação de referência |
| **Procedência da foto** | só selo na UI | geofence + EXIF + câmera in-app no upload |
| **Backend / auth** | inexistente | Postgres+PostGIS (ou Supabase p/ validar) + login por telefone |
| **Pipeline de mídia** | gradiente placeholder | resize client-side → WebP/AVIF → CDN + fila offline |
| **Offline-first** | manifest only | Service Worker (Workbox) + IndexedDB + Background Sync |
| **Localização de pico sensível** | flag `visibilidade` | fuzzing por célula H3 antes de expor no mapa |
| **Tiles do mapa** | OpenFreeMap (rede) | PMTiles (Planetiler → R2/Bunny), cache offline do litoral |

## Tensões éticas (decidir antes de escalar)

- Expor coordenada exata de pico mata pico secreto → **abafamento** + geometria fuzzy.
- Mapear conflito pode expor denunciante → **localização grosseira** e anonimato por padrão.
- Foto identifica pessoas (LGPD) → **borrar rosto** + consentimento no envio.
