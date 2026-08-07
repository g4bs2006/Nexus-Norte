### 10.43 Planejamento financeiro de longo prazo — a terceira camada do dinheiro (spec própria) — feature nova

Até aqui o Financeiro conhecia duas camadas de dinheiro: o **fato**
(`lancamentos`, o que já aconteceu) e o **teto** (`categorias.meta_mensal`,
aspiração de gasto do mês corrente). Falta a camada do meio — o
**compromisso previsto**: aquilo que ainda não aconteceu, mas que se sabe
que vai acontecer, com valor e data razoavelmente certos. Sem ela, nenhuma
pergunta sobre o futuro tem resposta: a receita de setembro não existe em
lugar nenhum do schema, então projetar setembro é impossível.

É essa lacuna que trava a pergunta que originou a feature — *"se eu comprar
R$ 300 em 3x, o quanto isso afeta minha vida financeira?"*. A resposta exige
saber quanto entra e quanto já está comprometido nos três meses seguintes, e
hoje o sistema só sabe olhar para trás.

**Schema novo:**

```sql
compromissos_recorrentes (
  id            uuid primary key,
  descricao     text not null,
  categoria_id  uuid not null references categorias,
  valor         numeric not null,
  dia_mes       int not null check (dia_mes between 1 and 31),
  data_inicio   date not null,
  data_fim      date null   -- null = sem previsão de término
)
```

A natureza (receita ou despesa) **não é repetida aqui** — vem herdada de
`categorias.natureza` (resolução 10.12). Um mesmo registro cobre "salário"
(categoria de receita) e "aluguel" (categoria de despesa), sem campo
redundante que possa divergir da categoria.

**Não materializa por mês.** Mesmo princípio da 10.5: o registro guarda o
padrão e a expansão acontece na leitura, para o intervalo pedido. A lógica é
a de `lib/recorrencia.ts`, trocando "dia da semana" por "dia do mês" — com
uma diferença que precisa ser tratada explicitamente: `dia_mes = 31` não
existe em fevereiro. Regra adotada: **quando o dia não existe no mês, a
ocorrência cai no último dia daquele mês**, nunca transborda para o mês
seguinte (transbordar mudaria o mês de competência do compromisso, que é
justamente o que a projeção está tentando medir).

**Corte passado/futuro — a regra que impede duplicidade.** É o ponto mais
delicado da feature, porque compromisso previsto e lançamento real descrevem
o mesmo dinheiro em momentos diferentes do tempo. A regra é temporal, não
por tabela:

- **Até hoje** (meses fechados e a parte já decorrida do mês corrente): a
  projeção lê `lancamentos`. O que aconteceu, aconteceu — não se estima o
  passado.
- **Depois de hoje**: a projeção lê `compromissos_recorrentes` +
  `compras_parceladas` (10.44) + média histórica das categorias variáveis.

Consequência prática: um compromisso recorrente **nunca vira lançamento
automaticamente**. Quando o salário cai, é você quem registra o lançamento —
e a partir daquele instante o mês corrente passa a contar o valor real, não
o previsto. Materializar automaticamente traria o problema clássico de
conciliação (o previsto era R$ 3.000, entrou R$ 2.870, e agora existem duas
linhas concorrentes descrevendo o mesmo evento).

**Motor de projeção** — `features/financeiro/projecao.ts`, funções puras no
mesmo espírito de `calculos.ts` (data sempre entra por parâmetro, nada de
rede nem de `new Date()` dentro):

```ts
export interface ProjecaoMensal {
  mes: string              // 'YYYY-MM'
  receitaPrevista: number
  comprometido: number     // fixos recorrentes + parcelas do mês
  variavelEstimado: number // média histórica das categorias variáveis
  saldoDoMes: number       // receita − (comprometido + variável)
  saldoAcumulado: number   // soma dos saldos até este mês
  fonte: 'real' | 'projetado'   // transparência sobre a origem do número
}

export function projetarFluxoCaixa(params: {
  hoje: string
  meses: number
  compromissos: CompromissoRecorrente[]
  parcelas: CompraParcelada[]
  lancamentosRealizados: Lancamento[]
  mediaVariavelPorCategoria: Record<string, number>
  receitaSobrescrita?: Record<string, number>  // 'YYYY-MM' → valor
  compraHipotetica?: CompraParcelada           // usado pelo simulador (10.44)
}): ProjecaoMensal[]
```

O campo `fonte` existe para que a UI **nunca apresente estimativa como
fato** — mês projetado precisa ser visualmente distinto de mês realizado
(tracejado no gráfico, texto de rodapé na tabela).

**`receitaSobrescrita` resolve a renda variável.** Média automática não dá
conta de 13º, férias, bônus ou de um mês em que o trabalho renda diferente —
o campo permite fixar manualmente a receita de meses específicos sem
inventar um compromisso recorrente falso.

**Estimativa do variável.** Média dos últimos 3 meses por categoria (janela
declarada como constante única, mesmo tratamento dado a
`NOTA_MINIMA_APROVACAO` na 10.3). Com menos de 3 meses de histórico, usa o
que houver e a UI sinaliza baixa confiança — projetar com 2 semanas de dado
e apresentar com a mesma firmeza de 6 meses seria desonesto com quem lê.

**UI — aba "Planejamento" dentro do Financeiro** (ao lado de Categorias e
Lançamentos, sem rota de pilar nova):

- Formulário de compromisso recorrente: descrição, categoria, valor, dia do
  mês, início e fim opcional. Reaproveita `CampoDecimal` (10.26 — a vírgula
  do teclado brasileiro) e o padrão de exclusão com confirmação da 10.28.
- Tabela dos próximos N meses (padrão 6): receita prevista, comprometido,
  variável estimado, saldo do mês, saldo acumulado. Meses projetados em tom
  mais claro que o mês real corrente.
- Gráfico de linha do saldo acumulado (Recharts, componente `grafico.tsx` já
  existente), com o trecho futuro tracejado.
- **Alerta de saldo negativo**: se algum mês projetado fecha com saldo
  acumulado abaixo de zero, destaque em vermelho apontando o mês — é o
  output mais valioso da feature inteira e não pode ficar escondido dentro
  de uma coluna de tabela.

**Efeitos colaterais positivos, já previstos:**

- O card "Receita vs. Despesa" (2.3) ganha camada de **previsto vs.
  realizado** no mês corrente; divergência grande entre os dois é sinal de
  entrada ou saída surpresa.
- A sugestão de valor inicial no planejamento semanal (2.3) deixa de ser
  "meta mensal ÷ 7" e passa a considerar o dia em que cada compromisso
  vence.
- A regra de investimento (10.45) passa a poder olhar a sobra **projetada**,
  não só a do mês corrente.

---

### 10.44 Compras parceladas e o simulador "e se" (depende de 10.43) — feature nova

Parcelamento é o caso que o schema atual descreve mal: uma compra em 3x não
é um gasto de R$ 300 hoje, são três compromissos de R$ 100 em três meses de
competência diferentes — dois dos quais ainda não existem em lugar nenhum.

**Schema novo:**

```sql
compras_parceladas (
  id                    uuid primary key,
  descricao             text not null,
  categoria_id          uuid not null references categorias,
  valor_total           numeric not null,
  numero_parcelas       int not null check (numero_parcelas >= 1),
  data_primeira_parcela date not null,
  juros_mensal          numeric not null default 0
)
```

Como na 10.43, **não materializa parcela por parcela** — 36x viraria 36
linhas para gerenciar. A expansão é na leitura.

**Cálculo da parcela** (`expandirParcelas`, função pura):

- `juros_mensal = 0` (padrão brasileiro, cartão sem juros): divisão simples,
  com o **resto de centavo absorvido integralmente na última parcela**. R$
  100,00 em 3x é 33,33 + 33,33 + 33,34 — nunca três parcelas de 33,33 que
  somam R$ 99,99, nem arredondamento silencioso distribuído.
- `juros_mensal > 0` (financiamento de loja): fórmula PMT padrão,
  `PMT = PV × i / (1 − (1+i)^-n)`. O campo existe para não obrigar uma
  refatoração quando aparecer o primeiro parcelamento com juros de verdade.

Cada ocorrência de parcela entra na projeção da 10.43 no mês em que cai,
somando ao `comprometido` daquele mês.

**O simulador — três execuções, não uma.** Responder "o quanto isso me
afeta" exige isolar o efeito da compra do ruído do resto do orçamento. Por
isso o simulador roda `projetarFluxoCaixa` **duas vezes** e compara:

1. **Linha base**: projeção sem a compra hipotética.
2. **Cenário**: mesma projeção com `compraHipotetica` preenchida.
3. **Diferença**: subtração mês a mês entre as duas, que é o que a UI
   apresenta em primeiro plano.

**Nada é gravado.** O simulador vive inteiramente em estado local
(`useState`), sem `useMutation`, sem tocar no Supabase. É o que garante que
uma simulação nunca vaze para o dado real por engano — risco principal desse
tipo de feature. Só existe uma escrita possível a partir dele: um botão
explícito "registrar essa compra de verdade", que aí sim insere em
`compras_parceladas`.

**UI** — `Sheet` aberto por um botão "Simular" na page Financeiro (folha
ancorada embaixo no mobile, conforme 10.29):

- Campos da compra hipotética: valor total, número de parcelas, categoria,
  mês da primeira parcela.
- Sliders opcionais de corte por categoria variável ("e se eu reduzir
  delivery em 30%?"), com debounce de ~150 ms — recalcular a cada pixel
  arrastado desperdiça trabalho sem mudar o que se lê na tela.
- Saída em três números, antes → depois: saldo projetado ao fim do
  horizonte, disponível por dia no mês corrente, e sobra estimada para
  investimento (gancho direto com a 10.45).
- Gráfico com as duas linhas sobrepostas (base sólida, cenário tracejado).
- Frase-resumo em linguagem direta, do tipo *"reduz seu saldo em ~R$ 100/mês
  até novembro; em outubro o saldo acumulado ficaria negativo"* — o número
  isolado exige interpretação, a frase entrega a conclusão.

**Regra de honestidade:** se a projeção depende de histórico curto demais ou
de receita não informada para os meses do horizonte, o simulador diz isso em
vez de exibir um número com falsa precisão.

---

### 10.45 Regra de investimento — sugestão, nunca execução (depende de 10.43) — feature nova

O aporte hoje é 100% manual (10.4: uma linha por evento, `tipo = 'aporte'`).
A feature adiciona uma regra que **sugere** quanto aportar, mantendo a
decisão e o registro nas mãos do usuário — o sistema não tem, nem deve ter,
integração bancária.

**Schema novo:**

```sql
regra_investimento (
  id                   uuid primary key,
  ativa                boolean not null default true,
  gatilho_tipo         text not null check (gatilho_tipo in ('sobra_meta','percentual_receita')),
  percentual           numeric not null,   -- % da sobra, ou % da receita
  dia_sugestao         int not null check (dia_sugestao between 1 and 31)
)

sugestoes_investimento (
  id               uuid primary key,
  mes_referencia   date not null,
  valor_sugerido   numeric not null,
  status           text not null check (status in ('pendente','aceita','recusada')),
  investimento_id  uuid null references investimentos,
  unique (mes_referencia)
)
```

O `unique (mes_referencia)` é o mesmo raciocínio de dedup da 10.42
(`notificacoes_enviadas`): sem ele, cada carregamento da página geraria uma
sugestão nova para o mesmo mês.

**Gatilhos:**

- `sobra_meta` — no `dia_sugestao`, calcula
  `sobra = meta_mensal_total − gasto_realizado_mes` e sugere
  `sobra × percentual / 100`. Sugere apenas se `sobra > 0`.
- `percentual_receita` — sugere `receita_do_mes × percentual / 100`,
  independente de ter sobrado; é a disciplina de "investir antes de gastar".

Com a 10.43 disponível, ambos podem olhar a **sobra projetada** dos meses
seguintes antes de sugerir — evita sugerir um aporte gordo em um mês que já
tem três parcelas e o IPVA caindo no mês seguinte.

**Fluxo de aceite:** o card mostra a sugestão com dois botões. **Aceitar**
abre o formulário de aporte já pré-preenchido (o usuário confirma ou ajusta
o valor); ao salvar, grava o `investimentos.id` de volta em
`sugestoes_investimento.investimento_id` e marca `aceita`. **Recusar** marca
`recusada` e o mês não volta a ser sugerido. Sugestões recusadas ficam só
como registro histórico, fora da UI principal.

**Notificação:** quarto gatilho da Edge Function `notificar` (10.42), no
mesmo cron de 5 em 5 minutos e na mesma janela das 8h usada por
conta/prova/meta. Dedup pela chave já existente
(`tipo` + `origem_id` + `data_referencia`).

---

### 10.46 Projeção de carga no Treino (contraparte do simulador financeiro) — feature nova

O mesmo raciocínio de projeção aplicado ao Treino, respondendo *"nesse
ritmo, quando eu chego em X kg?"*.

Entra no histórico de progressão do exercício, ao lado do que
`progressaoCarga` já mostra. Ajusta uma reta de mínimos quadrados sobre os
últimos N valores de `umRmEstimado` (poucos pontos, não precisa de
biblioteca) e extrapola até a carga alvo informada.

**Regra de honestidade, herdada da 10.44:** quando a inclinação da reta é
zero ou negativa — situação que `sinalEstagnacao` já detecta —, o simulador
**não** exibe uma data. Exibe "sem progressão suficiente para projetar;
considere ajustar o treino", reaproveitando o sinal existente em vez de
produzir um número inventado. Mesmo com inclinação positiva, o resultado é
apresentado como faixa aproximada ("~8 a 10 semanas"), nunca como data
exata.
