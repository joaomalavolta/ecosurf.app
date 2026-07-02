#!/usr/bin/env python3
"""
Ingestão de Tábuas de Maré da CHM/Marinha (PDF oficial → TypeScript).

Uso:
  python3 scripts/ingerir_tabua_chm.py <pdf> <id-estacao> <ano>
  # ex.: python3 scripts/ingerir_tabua_chm.py "45 - PORTO DE SÃO SEBASTIÃO.pdf" sao-sebastiao 2026

Gera src/services/tide/tabuas/<id>-<ano>.ts no formato do app. Estratégia:
fatia cada página em 8 colunas verticais pelas posições x dos cabeçalhos
'HORA' (4 meses × 2 colunas de dias) e lê cada coluna limpa — robusto contra
o entrelaçamento do texto. Validado contra o Porto de Santos 2026 (365 dias).

Requer: pip install pdfplumber
"""
import pdfplumber, re, sys, datetime

MESES = {'Janeiro':1,'Fevereiro':2,'Março':3,'Abril':4,'Maio':5,'Junho':6,
         'Julho':7,'Agosto':8,'Setembro':9,'Outubro':10,'Novembro':11,'Dezembro':12}
PAR = re.compile(r'(\d{4})\s+(-?\d+\.\d{2})')
DIA = re.compile(r'^(\d{2})\b')
NIVEL = re.compile(r'Nível Médio\s+([\d.]+)\s*m')

def parse_chm(pdf_path):
    dados, nivel_medio = {}, None
    with pdfplumber.open(pdf_path) as pdf:
        for p in pdf.pages:
            texto = p.extract_text() or ''
            if nivel_medio is None:
                m = NIVEL.search(texto)
                if m: nivel_medio = float(m.group(1))
            palavras = p.extract_words()
            horas = sorted(w['x0'] for w in palavras if w['text'] == 'HORA')
            if len(horas) != 8: continue
            meses_pg = sorted((w['x0'], MESES[w['text']]) for w in palavras if w['text'] in MESES)
            meses_ordem = [m for _, m in meses_pg]
            lim = horas + [p.width]
            for i in range(8):
                mes = meses_ordem[i // 2]
                col = p.crop((lim[i]-24, 100, lim[i+1]-24 if i < 7 else p.width-8, p.height-30))
                dia_atual = None
                for ln in (col.extract_text() or '').split('\n'):
                    m = DIA.match(ln.strip())
                    if m and 1 <= int(m.group(1)) <= 31:
                        dia_atual = int(m.group(1))
                        dados.setdefault(f"{mes:02d}-{dia_atual:02d}", [])
                    if dia_atual is None: continue
                    for hhmm, alt in PAR.findall(ln):
                        h, mi = int(hhmm[:2]), int(hhmm[2:])
                        if h < 24 and mi < 60:
                            dados[f"{mes:02d}-{dia_atual:02d}"].append([h*60+mi, float(alt)])
    return dados, nivel_medio

def validar(dados, ano):
    erros = []
    d = datetime.date(ano, 1, 1)
    while d.year == ano:
        k = d.strftime("%m-%d")
        pts = dados.get(k)
        if not pts: erros.append(f"{k}: sem dados")
        else:
            horas = [p[0] for p in pts]
            if horas != sorted(horas): erros.append(f"{k}: horas fora de ordem")
            for m, a in pts:
                if not (0 <= m < 1440): erros.append(f"{k}: minuto {m}")
                if not (-1.0 <= a <= 9.0): erros.append(f"{k}: altura {a}")
        d += datetime.timedelta(days=1)
    return erros

def main():
    if len(sys.argv) != 4:
        print(__doc__); sys.exit(1)
    pdf_path, est_id, ano = sys.argv[1], sys.argv[2], int(sys.argv[3])
    dados, nivel = parse_chm(pdf_path)
    erros = validar(dados, ano)
    print(f"dias: {len(dados)} | nível médio: {nivel} m | erros: {len(erros)}")
    for e in erros[:10]: print(" ", e)
    if erros: sys.exit(2)
    const = est_id.upper().replace('-', '_')
    linhas = [f"  '{k}':[{','.join(f'[{m},{a}]' for m,a in dados[k])}]," for k in sorted(dados)]
    corpo = '\n'.join(linhas)
    out = f"""// Tábua de Marés {ano} — gerada por scripts/ingerir_tabua_chm.py a partir do
// PDF oficial da CHM/Marinha do Brasil. Nível médio {nivel} m.
// {len(dados)} dias validados (cobertura, ordem cronológica, faixa física).

export type ExtremoMare = [minutos: number, alturaM: number]

export const NIVEL_MEDIO_{const} = {nivel}

export const TABUA_{const}_{ano}: Record<string, ExtremoMare[]> = {{
{corpo}
}}
"""
    dest = f"src/services/tide/tabuas/{est_id}-{ano}.ts"
    open(dest, 'w').write(out)
    print(f"gerado: {dest}")

if __name__ == '__main__':
    main()
