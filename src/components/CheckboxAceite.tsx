export function CheckboxAceite({
  aceito,
  onChange,
}: {
  aceito: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Aviso institucional */}
      <div style={{
        padding: '12px 14px',
        borderRadius: 12,
        background: 'var(--cinza)',
        fontSize: 12.5,
        color: 'var(--text)',
        lineHeight: 1.5,
      }}>
        Este registro ambiental tem finalidade informativa, colaborativa e de interesse público.
        Ele ajuda a dar visibilidade a problemas ambientais observados por cidadãos em praias, rios,
        áreas costeiras, ecossistemas de surf e outros maretórios e territórios.
        <br /><br />
        Caso a situação represente crime ambiental, risco à saúde pública, vazamento ativo, animal em sofrimento
        ou emergência, procure diretamente os órgãos públicos competentes, como prefeitura, secretaria municipal
        de meio ambiente, órgão estadual ambiental, Ibama, ICMBio, Defesa Civil, Ministério Público ou canais
        oficiais de ouvidoria.
      </div>

      {/* Checkbox obrigatório */}
      <label
        style={{
          display: 'flex',
          gap: 10,
          cursor: 'pointer',
          padding: '10px 14px',
          borderRadius: 12,
          border: aceito ? '2px solid var(--turq)' : '2px solid var(--line)',
          background: aceito ? 'rgba(31,227,200,0.06)' : 'var(--card)',
          transition: 'all .15s',
        }}
      >
        <input
          type="checkbox"
          checked={aceito}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 20, height: 20, marginTop: 2, accentColor: 'var(--turq)', flex: '0 0 auto' }}
        />
        <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
          Confirmo que as informações enviadas correspondem à minha observação e entendo que este é um
          registro público colaborativo, não uma denúncia oficial. O Ecosurf.app não se responsabiliza
          pela veracidade, apuração, encaminhamento ou solução das informações inseridas por terceiros.
        </span>
      </label>

      {/* Segurança */}
      <div style={{
        padding: '10px 12px',
        borderRadius: 10,
        background: '#F59E0B15',
        border: '1px solid #F59E0B40',
        fontSize: 11.5,
        color: 'var(--text)',
        lineHeight: 1.4,
      }}>
        🦺 Registre apenas se for seguro. Não entre em áreas de risco, não toque em resíduos perigosos,
        não se aproxime de animais silvestres e não entre em propriedades privadas.
      </div>
    </div>
  )
}
