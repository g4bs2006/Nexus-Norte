### 10.47 Simulador financeiro — correções e ampliação (revisa 10.44) — feature nova

O simulador entregue em 10.44 responde à pergunta que o originou, mas a
revisão do código em uso expôs duas imprecisões e três perguntas que ele
ainda não sabe responder. Esta resolução trata as duas coisas, em ordem de
prioridade: primeiro o que hoje devolve número errado, depois o que amplia o
alcance.

---

#### 10.47.1 Horizonte adaptativo (corrige `HORIZONTE_SIMULACAO`)

`SheetSimulador` fixa `HORIZONTE_SIMULACAO = 6` e passa esse valor a
`projetarFluxoCaixa`. Uma compra em 12x tem, portanto, metade das parcelas
fora da janela: a diferença entre base e cenário é calculada só sobre 6
meses, subestimando o impacto, e um saldo acumulado que só ficaria negativo
no mês 9 **nunca é sinalizado** — justamente o output mais valioso da
feature.

O horizonte passa a ser derivado, não constante:

```ts
const horizonte = Math.max(HORIZONTE_MINIMO, numeroParcelas + 1)
// HORIZONTE_MINIMO = 6
```

O `+ 1` é intencional: mostrar ao menos um mês **depois** da última parcela
deixa visível o alívio no fluxo quando ela sai — informação que muda a
leitura de "isso me aperta" para "isso me aperta até março".

A linha de base precisa ser recalculada com o mesmo horizonte do cenário —
comparar 6 meses de base com 13 de cenário produziria uma diferença sem
sentido. Ambas as chamadas de `projetarFluxoCaixa` usam `horizonte`.

#### 10.47.2 Frase-resumo com o impacto mensal real (corrige 10.44)

A frase atual divide a diferença total por `HORIZONTE_SIMULACAO`. Para R$
300 em 3x isso produz *"reduz ~R$ 50/mês"*, quando o efeito real é R$ 100
por três meses e R$ 0 depois — o número apresentado não descreve nenhum mês
que vai de fato existir.

O valor mensal deve vir de `calcularParcelas(compraHipotetica)`, não de uma
média: as parcelas podem divergir entre si pelo centavo absorvido na última
(10.44), então a frase usa a parcela típica e nomeia a duração:

> "R$ 100,00/mês pelos próximos 3 meses (última parcela em out/2026)."

Quando o cenário leva o acumulado a negativo, a segunda oração continua
apontando o mês, como já faz hoje.

---

#### 10.47.3 Comparação de cenários lado a lado

É a decisão real diante de uma compra: à vista, 3x sem juros ou 6x com
juros. O motor já aceita `compraHipotetica`, então comparar é rodar
`projetarFluxoCaixa` uma vez por cenário — nenhuma mudança em
`projecao.ts` além do horizonte:

```ts
export interface Cenario {
  rotulo: string          // 'À vista' | '3x sem juros' | '6x a 2,5% a.m.'
  compra: ParceladaDetalhada | null   // null = linha de base
}

export interface ResumoCenario {
  rotulo: string
  totalPago: number       // valor_total, ou soma das parcelas quando há juros
  piorSaldoAcumulado: number
  mesDoPiorSaldo: string
  ficaNegativo: boolean
}
```

À vista entra como uma "compra" de `numero_parcelas = 1` — não precisa de
caminho especial no código.

A tabela comparativa mostra, por cenário: total pago, pior saldo acumulado e
em que mês ele ocorre. É o que torna a troca visível — à vista drena um mês
só e custa menos; parcelado alivia o mês da compra e custa mais quando há
juros. Hoje o simulador força ver um cenário de cada vez, o que esconde
exatamente essa comparação.

#### 10.47.4 Compromisso hipotético (assinatura e renda extra)

Duas perguntas frequentes ficam fora hoje porque só compra parcelada é
simulável:

- *"E se eu assinar algo de R$ 120/mês?"* — despesa recorrente sem fim
  definido
- *"E se eu pegar um freela de R$ 800/mês por 4 meses?"* — receita
  recorrente com `data_fim`

`projetarFluxoCaixa` já expande compromissos; falta só aceitar um
hipotético, simétrico ao que já existe para compras:

```ts
compromissoHipotetico?: CompromissoDetalhado
```

Ele entra na expansão junto com os reais, sem mutar o array recebido — mesma
garantia que o teste de `compraHipotetica` já cobre. A natureza
(receita/despesa) vem da categoria escolhida, como em 10.43, então uma
"simulação de renda extra" não precisa de campo novo nenhum.

Para compromisso hipotético **sem** `data_fim`, o horizonte volta a ser
`HORIZONTE_MINIMO` — não existe "última parcela" para ancorar a janela.

#### 10.47.5 Sliders de corte por categoria variável

Parte prevista em 10.44 e não implementada. Aplica um percentual de redução
sobre `mediaVariavelPorCategoria` **antes** de projetar — ou seja, é
transformação de entrada, não mudança no motor:

```ts
function aplicarCortes(
  media: Record<string, number>,
  cortes: Record<string, number>,  // categoria_id → % de redução
): Record<string, number>
```

Vale porque muda a resposta de binária para acionável: em vez de "não cabe",
o simulador passa a poder dizer *"cabe se você reduzir 20% em delivery"*.
Debounce de ~150 ms no slider, como já previsto — recalcular a cada pixel
arrastado não muda o que se lê na tela.

Só categorias devolvidas por `categoriasElegiveisParaMediaVariavel` aparecem
como slider: as que já têm compromisso recorrente vinculado não entram na
média (10.44, correção da dupla contagem), então um corte ali não teria
efeito e confundiria.

#### 10.47.6 Banda de incerteza no variável

O variável estimado é uma média histórica apresentada como linha sólida, o
que dá à projeção uma precisão que ela não tem. A pergunta que importa não é
"cabe na média?", é "cabe se o mês for ruim?".

`mediaVariavelPorCategoria` ganha uma contraparte que devolve também o pior
mês observado na janela, e a projeção passa a poder rodar em dois modos —
`'media'` e `'pessimista'`. O gráfico mostra a faixa entre as duas linhas
(`Area` do Recharts, sobre o `grafico.tsx` existente), e o alerta de saldo
negativo distingue os casos:

- negativo já na média → alerta vermelho, como hoje
- negativo só no pessimista → alerta amarelo, texto de "depende do mês"

Com menos meses de histórico do que a janela, a banda é mais larga por
construção — o que é honesto, e dispensa texto extra explicando a
imprecisão.

#### 10.47.7 Veredicto em vez de número solto

Uma regra de comprometimento converte a saída numérica em semáforo, no mesmo
padrão `Status` (`ok` | `atencao` | `risco`) que os outros pilares já usam:

```
comprometimento = (parcelas do mês + compromissos de despesa do mês)
                  ÷ receita prevista do mês
```

Limite configurável, declarado como **constante única** (mesmo tratamento de
`NOTA_MINIMA_APROVACAO` na 10.3), com padrão de 30%. O veredicto combina
comprometimento e saldo:

- 🟢 **cabe** — comprometimento sob o limite e acumulado nunca negativo
- 🟡 **aperta** — passa do limite, mas o acumulado se mantém positivo
- 🔴 **não cabe** — o acumulado fica negativo em algum mês do horizonte

O veredicto vai no topo do resultado; a tabela e o gráfico continuam abaixo,
para quem quiser abrir o detalhe. Número exige interpretação, o veredicto
entrega a conclusão.

#### 10.47.8 Gancho com a reserva de emergência (dependência futura)

Quando a reserva existir (`investimentos.finalidade = 'reserva'` e o tipo
`'resgate'` ainda a adicionar no CHECK de 10.4), o simulador ganha a leitura
mais forte que pode ter: *"essa compra derruba sua reserva de 3,2 para 2,8
meses"*. Fica registrado aqui como ponto de integração, sem bloquear nada
desta resolução.

---

#### Ordem de execução

1. **10.47.1 e 10.47.2** — corrigem número errado, mudança pequena e contida
   em `SheetSimulador`. Não dependem de nada.
2. **10.47.3** — maior ganho de utilidade por esforço; só orquestra chamadas
   que já existem.
3. **10.47.4** — exige tocar `ParametrosProjecao`, mas a expansão de
   compromisso já está pronta.
4. **10.47.5** e **10.47.7** — independentes entre si, ambos sobre o que
   10.47.3 já tiver montado.
5. **10.47.6** — último; é o único que muda a forma do dado devolvido pelo
   motor.

#### Testes a acrescentar em `projecao.test.ts`

- horizonte adaptativo cobre a última parcela de uma compra em 12x (e um mês
  além dela)
- linha de base e cenário são projetados com o mesmo número de meses
- `compromissoHipotetico` de receita aumenta `receitaPrevista` dos meses no
  intervalo, e não afeta os meses fora dele
- `compromissoHipotetico` não muta o array `compromissos` recebido
- `aplicarCortes` reduz só as categorias informadas e nunca produz valor
  negativo
- veredicto devolve `risco` quando qualquer mês fecha com acumulado negativo,
  mesmo com comprometimento abaixo do limite
