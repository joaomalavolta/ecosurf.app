# PRD — Ecosurf App (para teste no TestSprite)

> **Formato:** Product Requirements Document normalizável pelo TestSprite
> **Produto:** Ecosurf App · **Versão:** v1.0 · **Atualização:** 25/06/2026
> **URL de produção:** https://www.ecosurf.app (apex redireciona 308 → www)
> **Tipo de app:** PWA (Progressive Web App), mobile-first

---

## 0. Contexto técnico (configuração do TestSprite)

Informações para o `bootstrap` e a configuração do ambiente de teste.

| Item | Valor |
| --- | --- |
| Frontend | React + Vite + TypeScript, Framer Motion, MapLibre GL |
| Porta local (dev) | `5173` (padrão Vite) |
| Backend | Supabase (PostgreSQL + PostGIS), segurança via RLS |
| Auth | Login por **e-mail + código numérico (OTP)** — *não há senha tradicional* |
| Tipo de teste sugerido | `frontend` (E2E na UI) + `backend` (API/RLS Supabase) |
| Escopo | `codebase` (projeto inteiro) na primeira rodada |

### Observações críticas de autenticação para o TestSprite
O fluxo de login **não usa usuário/senha**: o usuário informa um e-mail, recebe um **código numérico** e o digita para entrar. Isso afeta a automação:

- Forneça ao TestSprite uma **conta de teste pré-criada** e, se possível, um **código fixo de bypass** ou um e-mail de teste cujo OTP possa ser lido por API. Sem isso, os fluxos autenticados não serão testáveis de ponta a ponta.
- Marque o parâmetro `needLogin: true` ao gerar o plano de testes de frontend.
- Alternativa: testar separadamente o fluxo público (modo "Explorar primeiro") sem login, e os fluxos autenticados com uma sessão/seed já válida.

### O que é difícil/impossível de automatizar (avaliar manualmente)
- Selo de procedência **"no local"** (depende de geolocalização real próxima ao pico).
- Captura via **câmera nativa** do dispositivo.
- **Fila offline** (exige simular perda real de conectividade).
Esses pontos devem ser sinalizados como *limitações de teste automatizado* ou cobertos com mocks/permissões forçadas.

---

## 1. Product Overview (Visão geral)

O Ecosurf App é uma plataforma cívica e colaborativa que conecta a comunidade do surf à conservação costeira. Ele transforma a foto cotidiana do mar em informação útil para surfistas, comunidades caiçaras, educadores, pesquisadores, jornalistas e gestores públicos.

Duas frentes centrais:
1. **Radar comunitário de surf** — fotos reais dos picos, com previsão de ondas, maré e vento.
2. **Cartografia socioambiental** — registro de conflitos costeiros e impactos ambientais (lixo, esgoto, erosão, óleo, ocupação irregular, etc.).

A **foto é o elemento central**: pode carregar horário, autoria, localização, selo de procedência, contexto de maré e dados ambientais. O app é desenhado para uso em campo, com sinal instável, priorizando registro rápido, uso mobile, fila offline e validação de procedência.

---

## 2. Core Goals (Objetivos centrais)

1. Permitir o **registro fotográfico rápido** de condições do mar e de ocorrências ambientais, com o mínimo de fricção ("foto primeiro, classificação depois").
2. Oferecer um **Radar diário** que mostre quais picos têm registros recentes ("acender um pico").
3. Garantir **confiança e procedência** dos registros via validação de localização no servidor e selos de procedência.
4. Construir uma **cartografia socioambiental pública** com alertas e mutirões georreferenciados.
5. Respeitar **soberania local e privacidade** (níveis de visibilidade de pico, LGPD, proteção de terceiros).
6. Funcionar de forma **confiável offline** e como **PWA instalável**.

---

## 3. Key Features (Funcionalidades-chave)

### F1 — Cadastro e autenticação
- Tela de boas-vindas com duas opções: **"Criar conta e contribuir"** e **"Explorar primeiro"**.
- Fluxo OTP: E-mail → Código de acesso → Perfil → Permissões → Pronto.
- Campos obrigatórios: Nome, CPF (não exibido publicamente), Cidade. Opcionais: Pico principal, Foto de perfil.
- Permissões de câmera e localização.

### F2 — Navegação principal
Barra inferior com 5 áreas: **Radar**, **Mapa**, **Registrar** (botão central de câmera), **Ações**, **Perfil**.

### F3 — Radar (tela inicial)
- Mapa compacto com picos do dia, alertas ativos e mutirões.
- Fileira de **stories** (bolhas circulares) de picos com registro recente.
- **Feed** com filtros: *Favoritos*, *Melhores ondas*, *Todos*.
- Lista de **picos sem foto** no dia (oportunidades de contribuição).

### F4 — Página do pico
- Cabeçalho: nome, praia/município/estado, condição resumida, maré/vento/previsão.
- Card **"Condição agora"**: altura da onda, período, vento (terral/maral/lateral/calmo), fonte (ex.: Open-Meteo Marine).
- **Timeline do dia** (assinatura do app): curva de maré como eixo, fotos posicionadas pelo horário; slider para comparar momentos.
- Por foto: horário, autor, selo de frescor ("agora"/"recente"/"mais cedo"), selo de procedência ("no local"/"galeria"/"não verificado"), maré e vento, curtidas, compartilhar, denúncia.
- Contexto ambiental e **níveis de visibilidade** (Público / Comunidade / Abafado).

### F5 — Registrar fotos e alertas
- Fluxo: Fotografar → Vincular ao pico → Classificar → Enviar.
- Vinculação automática ao pico mais próximo; seleção manual; criação de novo pico.
- Tipos: *Report do mar*, *Alerta ambiental*, *Lixo na praia/rio*.
- Selos de procedência (no local / galeria / não verificado).

### F6 — Mapa territorial
- Camadas: picos, alertas ambientais, mutirões.
- Filtros (tudo / picos / alertas / mutirões), clusters de marcadores, painel inferior com ações.

### F7 — Ações, alertas e mutirões
- Botões: *Foto rápida*, *Nova ação*.
- Formulário de alerta em etapas (categoria → evidências → localização → gravidade → descrição → publicar).
- Criação de mutirão (tipo, título/descrição, local, data/horário, organização, voluntariado, capa).
- **Rascunhos**.

### F8 — Perfil
- Modo visitante (não logado) vs. usuário logado.
- Estatísticas (Picos, Fotos, Precisão), histórico, preferências, privacidade/LGPD, papéis (visitante/usuário/moderador/admin).

### F9 — Avançadas
- Uso offline (fila de envio), deep links/compartilhamento, curtidas, moderação comunitária, maré harmônica, instalação como PWA.

---

## 4. User Flows (Fluxos de usuário)

Cada fluxo está numerado para mapeamento direto a casos de teste.

### UF1 — Explorar sem conta (público)
1. Abrir o app.
2. Tocar em **"Explorar primeiro"**.
3. Verificar acesso ao Radar, Mapa e conteúdos públicos.
4. Verificar que ações de publicação (Registrar/Nova ação) exigem login ou ficam bloqueadas.

### UF2 — Criar conta (OTP)
1. Tocar em **"Criar conta e contribuir"**.
2. Informar e-mail e solicitar código.
3. Inserir o código numérico recebido.
4. Preencher Nome, CPF, Cidade (obrigatórios); Pico principal e foto (opcionais).
5. Autorizar câmera e localização.
6. Concluir e cair logado no Radar.

### UF3 — Registrar foto do mar
1. Tocar no botão central **Registrar**.
2. Capturar/selecionar imagem.
3. Confirmar ou escolher o pico (ou criar novo).
4. Classificar como *Report do mar* e adicionar observações.
5. Publicar.
6. Verificar que o pico "acende" no Radar e a foto aparece na timeline com horário/selos.

### UF4 — Registrar alerta ambiental
1. Ir em **Ações** → **Nova ação** → Alerta ambiental.
2. Selecionar categoria (ex.: Esgoto aparente).
3. Adicionar evidências, confirmar localização/cidade/estado.
4. Indicar gravidade, descrever, revisar e publicar.
5. Verificar que o alerta aparece no Mapa e na página do pico.

### UF5 — Criar mutirão
1. **Ações** → **Nova ação** → Mutirão.
2. Preencher tipo, título/descrição, local, data/horário, organização, voluntariado e capa.
3. Publicar.
4. Verificar aparição no Mapa, na lista de Ações e na página própria do evento.

### UF6 — Explorar Radar e Página do pico
1. No Radar, tocar em um story/marcador.
2. Abrir a página do pico.
3. Ler "Condição agora" e a Timeline; arrastar o slider e comparar momentos da maré.
4. Curtir e compartilhar uma foto.

### UF7 — Mapa territorial
1. Abrir **Mapa**.
2. Alternar filtros (picos/alertas/mutirões).
3. Aproximar o zoom em um cluster até ver marcadores individuais.
4. Tocar em marcador → painel inferior → abrir página correspondente.

### UF8 — Visibilidade de pico / soberania local
1. Acessar pico com visibilidade **Comunidade** ou **Abafado** sem autorização.
2. Verificar que dados sensíveis/atividade em tempo real não são expostos.

### UF9 — Rascunho e retomada
1. Iniciar um alerta/mutirão e salvar como **rascunho**.
2. Sair e voltar em **Ações**.
3. Retomar o rascunho e publicar.

### UF10 — Instalação PWA
1. Acionar "Adicionar à tela inicial" (Android/Chrome ou iOS/Safari).
2. Verificar abertura standalone.

---

## 5. Validation Criteria (Critérios de validação/aceitação)

IDs prontos para virar casos de teste. ✓ = deve ser verdadeiro.

**Autenticação e cadastro**
- VC01 — "Explorar primeiro" dá acesso a conteúdo público sem login.
- VC02 — Publicar (foto/alerta/mutirão) sem login é bloqueado ou redireciona ao login.
- VC03 — Código OTP inválido/expirado exibe erro claro e não autentica.
- VC04 — Campos obrigatórios (Nome, CPF, Cidade) bloqueiam avanço se vazios.
- VC05 — CPF **nunca** é exibido publicamente em nenhuma tela de perfil/registro.

**Registro e procedência**
- VC06 — Foto via câmera do app, próxima ao pico → selo **"no local"**.
- VC07 — Foto de galeria → selo **"galeria"**.
- VC08 — Sem permissão/geo confiável → selo **"não verificado"**.
- VC09 — Vinculação automática sugere o pico mais próximo; se distante, abre seleção manual.
- VC10 — Registro iniciado pela página de um pico já nasce vinculado a ele.
- VC11 — É possível criar um novo pico quando inexistente.

**Radar e timeline**
- VC12 — Primeira foto do dia "acende" o pico (passa a indicar atividade recente).
- VC13 — Filtros do feed (Favoritos/Melhores ondas/Todos) alteram corretamente o que é exibido.
- VC14 — Picos sem foto do dia aparecem na lista de oportunidades.
- VC15 — Timeline posiciona fotos pelo horário sobre a curva de maré; slider muda o momento exibido.
- VC16 — Selos de frescor ("agora"/"recente"/"mais cedo") refletem a idade do registro.

**Mapa e ações**
- VC17 — Filtros do mapa isolam picos/alertas/mutirões corretamente.
- VC18 — Clusters se desfazem em marcadores ao aproximar o zoom.
- VC19 — Tocar em marcador abre painel inferior com ações válidas.
- VC20 — Alerta publicado aparece no Mapa e na página do pico.
- VC21 — Mutirão publicado aparece no Mapa, na lista de Ações e em página própria.
- VC22 — Rascunho persiste após sair/voltar e pode ser retomado e publicado.

**Visibilidade, privacidade e segurança**
- VC23 — Pico "Comunidade"/"Abafado" não expõe atividade em tempo real a não autorizados.
- VC24 — Denúncia de conteúdo está disponível e registra a ocorrência.
- VC25 — Papéis (visitante/usuário/moderador/admin) habilitam apenas as ações permitidas.
- VC26 — **RLS do Supabase** impede que um usuário leia/edite dados que não lhe pertencem (testar via API).
- VC27 — A chave anônima do Supabase exposta no frontend não permite acesso a dados protegidos por RLS.

**Resiliência e PWA**
- VC28 — Sem conexão, registros entram em fila e são enviados ao reconectar.
- VC29 — App é instalável como PWA e abre em modo standalone.
- VC30 — Deep links de pico/alerta/mutirão abrem a página correta.

---

## 6. Casos de borda e cenários de erro (sugestões para o TestSprite)

- E-mail malformado no cadastro.
- Reenvio de código múltiplas vezes (rate limit).
- Upload de foto muito grande / formato não suportado.
- Geolocalização negada no meio do registro.
- Criação de pico duplicado (mesmo nome/coordenada).
- Mutirão com data no passado.
- Sessão expirada durante publicação.
- Navegação direta a URL de pico restrito sem permissão.

---

## 7. Fora de escopo (não testar como falha)

- Veracidade dos dados ambientais externos (DHN, PNBOIA, Open-Meteo Marine, MapBiomas, INPE, ICMBio).
- Precisão absoluta da previsão de ondas/maré.
- O app **não** é canal oficial de emergência/fiscalização — fluxos de "denúncia formal a órgãos públicos" não fazem parte do sistema.
- Suporte a vídeo curto e arquivo histórico além do dia (ainda em definição de produto).

---

## 8. Como usar este PRD no TestSprite

1. Suba este arquivo `.md` como PRD no portal/MCP do TestSprite (aceita Markdown, PDF ou texto).
2. Aponte o TestSprite para a aplicação rodando (`localhost:5173` em dev, ou a URL de produção `https://www.ecosurf.app`).
3. Forneça as **credenciais de teste** e a estratégia de OTP (seção 0).
4. Gere os planos de teste **frontend** (UI/E2E) e **backend** (API/RLS Supabase).
5. Priorize na primeira rodada: UF2 (cadastro), UF3 (registro de foto), UF4 (alerta), VC26/VC27 (RLS) — pontos mais sensíveis do produto.
