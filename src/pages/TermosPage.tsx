import { useNavigate } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'

export function TermosPage() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 'var(--largura-app)', margin: '0 auto', background: 'var(--bg)', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header className="header" style={{ position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10, padding: 'calc(env(safe-area-inset-top,0px) + 16px) 16px 16px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid var(--line)' }}>
        <button className="btn icon outline" onClick={() => navigate(-1)} aria-label="Voltar">
          <IconArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 18, margin: 0 }}>Termos de Uso</h1>
      </header>

      <main style={{ padding: '24px 16px', flex: 1, overflowY: 'auto' }}>
        <div style={{ background: 'var(--card)', padding: 24, borderRadius: 20, border: '1px solid var(--line)' }}>
          <h2 style={{ fontSize: 20, marginBottom: 16, lineHeight: 1.3 }}>DECLARAÇÃO DE CONFORMIDADE, RESPONSABILIDADE E ACEITE DE USO DO ECOSURF.APP</h2>
          
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Ao criar uma conta, acessar, navegar, registrar informações, enviar fotos, publicar relatos, utilizar ferramentas ou interagir com qualquer funcionalidade do Ecosurf.app, declaro que li, compreendi e aceito integralmente as condições abaixo.
          </p>

          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--turq)' }}>1. Aceite das condições de uso</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginBottom: 8 }}>
              Declaro estar ciente de que o Ecosurf.app é uma plataforma digital voltada ao registro, organização, visualização e compartilhamento de informações relacionadas a praias, rios, clima, ondas, oceano, áreas costeiras, resíduos, ocorrências ambientais, ações de cidadania, mobilização comunitária, cultura oceânica e temas socioambientais correlatos.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
              Ao utilizar a plataforma, comprometo-me a agir com boa-fé, responsabilidade, respeito à legislação vigente, respeito às demais pessoas usuárias e compromisso com a proteção do Oceano, das praias, dos rios, da biodiversidade e dos territórios costeiros.
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--turq)' }}>2. Responsabilidade pelas informações inseridas</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginBottom: 8 }}>
              Declaro estar ciente de que todas as informações, fotos, vídeos, relatos, descrições, localizações, comentários, dados, denúncias, registros ou quaisquer outros conteúdos enviados por mim ao Ecosurf.app são de minha exclusiva responsabilidade.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
              Comprometo-me a inserir apenas informações verdadeiras, verificáveis, respeitosas e compatíveis com a finalidade da plataforma, evitando conteúdos falsos, enganosos, ofensivos, discriminatórios, ilegais, difamatórios, sensacionalistas, abusivos ou que possam causar danos a terceiros.
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--turq)' }}>3. Fotos, imagens e direitos de terceiros</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginBottom: 8 }}>
              Declaro que sou responsável por todas as fotos, imagens, vídeos e demais conteúdos visuais que eu inserir no Ecosurf.app.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
              Ao enviar qualquer imagem, declaro que:
              <br/>a) possuo autorização para utilizar e compartilhar a imagem;
              <br/>b) a imagem não viola direitos autorais, direitos de imagem, privacidade, honra, reputação ou qualquer outro direito de terceiros;
              <br/>c) quando houver pessoas identificáveis na imagem, obtive as autorizações necessárias para sua publicação;
              <br/>d) não utilizarei a plataforma para expor, constranger, acusar indevidamente, perseguir ou prejudicar pessoas, comunidades, organizações públicas, empresas ou instituições.
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--turq)' }}>4. Isenção de responsabilidade por conteúdo de terceiros</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginBottom: 8 }}>
              Declaro estar ciente de que o Ecosurf.app poderá receber conteúdos enviados por diferentes usuários, incluindo fotos, informações, relatos, descrições, localizações e comentários.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginBottom: 8 }}>
              O Instituto Ecosurf, seus administradores, representantes, parceiros, apoiadores e operadores da plataforma não se responsabilizam previamente pela veracidade, precisão, autoria, legalidade, atualidade, qualidade, integridade ou finalidade das fotos, informações e demais conteúdos inseridos por terceiros no sistema.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
              Cada usuário é integralmente responsável pelo conteúdo que publica, envia ou compartilha no Ecosurf.app, inclusive por eventuais consequências legais, administrativas, civis ou criminais decorrentes de suas publicações.
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--turq)' }}>5. Moderação, remoção e bloqueio de conteúdo</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginBottom: 8 }}>
              Declaro estar ciente de que o Ecosurf.app poderá, a qualquer momento e a seu critério, moderar, ocultar, editar, suspender, remover ou bloquear conteúdos que violem esta Declaração, os Termos de Uso, a legislação vigente, direitos de terceiros ou os princípios institucionais do Instituto Ecosurf.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
              Também estou ciente de que o Ecosurf.app poderá suspender ou excluir contas de usuários que utilizem a plataforma de forma abusiva, fraudulenta, ofensiva, ilegal, incompatível com sua finalidade socioambiental ou prejudicial à segurança e à credibilidade do sistema.
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--turq)' }}>6. Uso adequado da plataforma</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
              Comprometo-me a não utilizar o Ecosurf.app para:
              <br/>a) publicar informações falsas, manipuladas ou sem fundamento;
              <br/>b) divulgar conteúdo ofensivo, discriminatório, ameaçador, difamatório ou ilegal;
              <br/>c) violar direitos autorais, direitos de imagem, privacidade ou dados pessoais de terceiros;
              <br/>d) promover ataques pessoais, perseguições, assédio, exposição indevida ou constrangimento público;
              <br/>e) inserir arquivos maliciosos, vírus, códigos nocivos ou qualquer recurso que comprometa a segurança da plataforma;
              <br/>f) utilizar a plataforma para fins comerciais, políticos-partidários, religiosos, publicitários ou institucionais sem autorização prévia;
              <br/>g) praticar qualquer ato que comprometa a finalidade ambiental, educativa, cidadã e colaborativa do Ecosurf.app.
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--turq)' }}>7. Dados pessoais e privacidade</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginBottom: 8 }}>
              Declaro estar ciente de que o uso do Ecosurf.app poderá envolver o tratamento de dados pessoais, como nome, e-mail, telefone, localização, imagem, registros enviados, informações de cadastro e dados técnicos de navegação.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginBottom: 8 }}>
              O tratamento desses dados deverá observar a legislação aplicável, especialmente a Lei Geral de Proteção de Dados Pessoais — LGPD, bem como a Política de Privacidade do Ecosurf.app.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
              Ao utilizar a plataforma, declaro que fornecerei dados corretos e atualizados e que não inserirei dados pessoais de terceiros sem autorização ou base legal adequada.
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--turq)' }}>8. Localização e registros ambientais</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginBottom: 8 }}>
              Declaro estar ciente de que determinados registros realizados no Ecosurf.app poderão conter informações de localização geográfica, data, horário, imagens e descrições do local registrado.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
              Autorizo o uso dessas informações para fins de organização, visualização, análise, mapeamento, geração de indicadores, relatórios, comunicação institucional, educação ambiental, mobilização social, ciência cidadã e aprimoramento das ações do Instituto Ecosurf, observadas as regras de privacidade e proteção de dados aplicáveis.
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--turq)' }}>9. Finalidade informativa e cidadã</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginBottom: 8 }}>
              Declaro compreender que o Ecosurf.app é uma ferramenta de apoio à cidadania ambiental, educação, mobilização, registro de ocorrências e produção de dados socioambientais colaborativos.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginBottom: 8 }}>
              As informações disponíveis na plataforma não substituem laudos técnicos oficiais, pareceres jurídicos, perícias ambientais, fiscalizações de órgãos públicos, boletins oficiais ou procedimentos formais de denúncia junto às autoridades competentes.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
              Quando necessário, o usuário deverá acionar os órgãos públicos responsáveis, autoridades ambientais, defesa civil, fiscalização municipal, órgãos de saúde, segurança pública ou demais instituições competentes.
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--turq)' }}>10. Responsabilidade por danos</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
              Declaro estar ciente de que poderei ser responsabilizado por danos causados ao Ecosurf.app, ao Instituto Ecosurf, a outros usuários ou a terceiros em razão do uso indevido da plataforma, da publicação de informações falsas, da violação de direitos, da inserção de conteúdos ilegais ou da prática de atos incompatíveis com esta Declaração.
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--turq)' }}>11. Atualizações desta Declaração</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginBottom: 8 }}>
              Declaro estar ciente de que esta Declaração poderá ser atualizada periodicamente para refletir melhorias no Ecosurf.app, mudanças legais, ajustes operacionais, novas funcionalidades ou necessidades de governança da plataforma.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
              A continuidade do uso do Ecosurf.app após a publicação de nova versão representará ciência e aceite das condições atualizadas.
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--turq)' }}>12. Declaração final de aceite</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
              Ao marcar a opção "Li e aceito", declaro que:
              <br/>a) li e compreendi esta Declaração de Conformidade, Responsabilidade e Aceite de Uso;
              <br/>b) aceito utilizar o Ecosurf.app de forma ética, responsável e legal;
              <br/>c) reconheço que sou responsável pelas informações, fotos e conteúdos que eu inserir na plataforma;
              <br/>d) reconheço que o Instituto Ecosurf não se responsabiliza previamente por fotos, informações e conteúdos inseridos por terceiros no sistema;
              <br/>e) concordo com as regras de moderação, privacidade, proteção de dados e uso adequado da plataforma.
            </p>
          </section>
          
          <div style={{ padding: 16, background: 'rgba(34,227,199,.1)', border: '1px solid rgba(34,227,199,.2)', borderRadius: 12, marginTop: 32 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>Declaro, para todos os fins, que aceito integralmente as condições acima para utilizar o Ecosurf.app.</p>
          </div>
          
          <div style={{ marginTop: 24, fontSize: 12, color: 'var(--muted)' }}>
            Versão: 1.0<br/>
            Data da última atualização: 23 | 06 | 2026
          </div>
        </div>
      </main>
    </div>
  )
}
