# Como preencher as constantes de maré (FEMAR/DHN)

A arquitetura das estações está pronta. Falta só **plugar os números oficiais**
— que precisam vir da fonte, não de estimativa.

## Por que não já vieram preenchidos

As constantes harmônicas (amplitude e fase de cada componente da maré) são
específicas de cada estação e só têm valor se forem **exatas**. Um número
aproximado gera uma curva com aparência de precisa e conteúdo errado — o pior
tipo de erro para quem confia no app para entrar no mar. Por isso as fichas
estão vazias e o app usa, por enquanto, constantes genéricas do litoral SE/S
(aproximação assumida como tal).

## Onde pegar os dados oficiais

Catálogo de Estações Maregráficas Brasileiras — FEMAR (a mesma base da DHN):
- Portal da Marinha/CHM: procure por "Catálogo de Estações Maregráficas"
- Cada estação tem uma **ficha** com uma tabela: `Componente | H | G`
  - **H** = amplitude, em **centímetros**
  - **G** = fase (situação), em **graus**

Estações já mapeadas em `stations.ts` (litoral de SP):
- **Santos** → cobre a Baixada Santista e o litoral central (Itanhaém,
  Mongaguá, Praia Grande, Guarujá…)
- **Cananéia** → litoral sul (Cananéia, Ilha Comprida, Iguape)
- **Ubatuba** → litoral norte (Ubatuba, Caraguá, São Sebastião)

## Como preencher (passo a passo)

1. Abra `src/services/tide/stations.ts`.
2. Na estação desejada, preencha `femarId` com o número da ficha (rastreabilidade).
3. Preencha `constituintes` usando o atalho `daFicha(nome, H_em_cm, G_em_graus)`.
   O período de cada componente já é resolvido automaticamente.

Exemplo (valores ilustrativos — substituir pelos da ficha real):

```ts
constituintes: [
  daFicha('M2', 42, 95),   // H=42 cm, G=95°  na ficha FEMAR
  daFicha('S2', 24, 110),
  daFicha('N2',  9,  80),
  daFicha('O1', 11, 240),
  daFicha('K1',  6, 120),
  // adicione quantas a ficha trouxer — quanto mais, mais fiel a curva
],
```

4. Rode `npm test`. O teste de sanidade confere período, amplitude física e
   faixa de fase. Rode `npm run build` e siga o fluxo normal de push.

Assim que uma estação recebe a ficha, todos os picos ligados a ela passam
a usar a maré real — sem tocar em mais nenhuma linha de código.
