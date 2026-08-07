### 10.48 Calendário — de espelho a planejador (spec própria) — feature nova

O calendário entregue até aqui é um **espelho**: sete fontes agregadas sem
tabela nova, `estado` separando plano de fato, `cargaPorDia` medindo
ocupação. Ele responde bem "o que está marcado", e não responde nenhuma das
perguntas que motivam abrir um calendário antes de decidir algo — "quando eu
tenho tempo?", "isso cabe?", "onde encaixo?".

Esta resolução muda o papel dele em três degraus. O primeiro dá ao
calendário a noção de **folga**; o segundo transforma folga em
**recomendação**; o terceiro usa o acúmulo como **memória**. Os degraus são
sequenciais por dependência real: nada do degrau 2 existe sem
`minutosLivres`, que é o degrau 1.

---

#### 10.48.0 Trabalho como camada, não como pilar (pré-requisito)

Hoje o dia parece mais vazio do que é. A maior ocupação real do dia —
trabalho — não existe em lugar nenhum do sistema, então qualquer cálculo de
tempo livre nasceria errado por larga margem. Isso precisa ser resolvido
antes do degrau 1, e **não** justifica um pilar: trabalho aqui não tem
métrica, meta nem sub-página, só ocupa tempo.

**Decisão: trabalho é uma camada do calendário, alimentada pelo
`fluxograma_semanal` que já existe.** A tabela já sustentou dois donos
(`materia_id` na 3, `treino_id` na 5, com o check de exclusividade mútua) —
o terceiro caso é o de bloco sem entidade nenhuma por trás:

```sql
alter table public.fluxograma_semanal
  add column rotulo text;

-- Substitui `fluxograma_um_pilar`: agora "no máximo um dono; quando não há
-- dono, precisa de rótulo".
alter table public.fluxograma_semanal
  drop constraint fluxograma_um_pilar;

alter table public.fluxograma_semanal
  add constraint fluxograma_dono_ou_rotulo check (
    (materia_id is not null and treino_id is null and rotulo is null)
    or (materia_id is null and treino_id is not null and rotulo is null)
    or (materia_id is null and treino_id is null and rotulo is not null)
  );
```

Nenhuma tabela nova, nenhuma página nova, e o `DialogFluxograma` ganha um
terceiro modo ("Trabalho / outro"), onde se digita o rótulo em vez de
escolher matéria ou treino. `excecoes_fluxograma` passa a valer para
trabalho de graça — cancelar um dia de trabalho já funciona.

No modelo de eventos:

- `CamadaCalendario` ganha `'trabalho'`, seguindo o precedente de `'sono'`:
  é camada sem ser `PilarId`, portanto sem entrada na sidebar
- `TipoEvento` ganha `'trabalho'`, fora de `TIPOS_IMPORTANTES` (é rotina, não
  prazo — listá-lo junto das provas afogaria as provas, mesma razão já
  registrada para aula e treino)
- Cor própria na paleta, no mesmo padrão dessaturado dos demais
- `rota` ausente: não há para onde navegar, e o modelo já prevê isso

Como não há entidade, também não há check de conclusão: trabalho não entra
em `conclusoes_fluxograma`, e `cargaPorDia` deve ignorá-lo ao computar
`checkPendente` — cobrar "marquei que trabalhei?" seria ruído puro.

---

#### 10.48.1 Tempo livre — o pivô (degrau 1)

`DiaCarga` mede ocupação (`minutosRotina`) mas não mede folga, que é o dado
que quase tudo daqui para frente consome.

```ts
export interface DiaCarga {
  // … campos existentes
  /** Minutos do dia não ocupados por sono planejado nem por rotina. */
  minutosLivres: number
}
```

Cálculo: `1440 − sono planejado do dia da semana − minutosRotina`, com
trabalho agora incluído em `minutosRotina` por força da 10.48.0.

Três decisões que evitam número enganoso:

- **Sono planejado, não realizado.** A folga é uma pergunta sobre o futuro;
  usar o sono realizado tornaria o número de amanhã indefinido e o de ontem
  mutável. Sem planejamento de sono cadastrado para aquele dia da semana,
  usa-se uma constante única (`SONO_PADRAO_MINUTOS`, 8h), não zero — assumir
  24h disponíveis seria a pior estimativa possível.
- **Piso em zero.** Rotina que estoure o dia produz `minutosLivres = 0` e
  liga o sinal de sobrecarga da 10.48.7, nunca um negativo silencioso.
- **Eventos datados não descontam.** Prova, conta e marco são prazos, não
  blocos de tempo; só rotina com horário ocupa. Um dia com três contas
  vencendo continua livre.

Na UI, `FaixaCarga` passa a comunicar folga além de ocupação, e a `GradeMes`
mostra os minutos livres do dia — "quinta tem 3h20" é a resposta que se
procura ao olhar a semana.

#### 10.48.2 Criar a partir do calendário (degrau 1)

Hoje o fluxo é de mão única: tudo nasce no pilar e aparece no calendário.
Clicar num vazio de quinta não faz nada, o que obriga a sair da tela onde a
decisão está sendo tomada.

Clique num dia (ou num vazio da agenda) abre um seletor curto — sessão de
estudo, treino, bloco de trabalho, marco de projeto, avaliação — e daí o
dialog do pilar correspondente, com a data pré-preenchida. Nenhuma escrita
nova: cada opção roteia para o `useMutation` que já existe.

Precondição: a data escolhida entra pré-preenchida e **editável**. Dialog
que grava em data implícita é a origem clássica do lançamento no dia errado.

#### 10.48.3 Ritual de domingo unificado (degrau 1)

O planejamento semanal existe hoje só no Financeiro
(`GradePlanejamentoSemanal`), enquanto a ideia original do sistema era um
ritual único de domingo. O calendário é o lugar natural para reuni-lo,
porque é a única tela que já enxerga todos os pilares.

Uma rota `/calendario/semana` (ou um `Sheet` em tela cheia no mobile) com a
semana seguinte em quatro passos:

1. **Sono** — metas por dia da semana (`planejamento_sono`)
2. **Rotina** — confirma o fluxograma da semana e registra exceções já
   conhecidas (`excecoes_fluxograma`)
3. **Estudo e treino** — encaixa blocos nos slots livres, com a alocação
   sugerida da 10.48.5 quando ela existir
4. **Financeiro** — a `GradePlanejamentoSemanal` atual, reaproveitada como
   está

O check semanal "Planejei a semana?" (2.4) passa a ser marcado pela
conclusão desse fluxo, em vez de ser um booleano solto — o hábito passa a
ter uma tela, não só uma caixinha.

---

#### 10.48.4 Pressão até o prazo (degrau 2)

O cruzamento que nenhum app genérico faz, porque exige conhecer prazo,
rotina e sono ao mesmo tempo — os três já estão no sistema, e nunca se
falaram:

> "Prova de Cálculo em 5 dias. Você tem 6h20 livres até lá. Sua meta de
> estudo para ela era 10h."

```ts
export interface PressaoPrazo {
  evento: EventoCalendario
  diasRestantes: number
  minutosLivresAte: number   // soma de minutosLivres até a véspera
  minutosMetaRestante: number
  status: Status             // 'ok' | 'atencao' | 'risco'
}
```

`minutosLivresAte` soma até a **véspera**, não até o dia: contar as horas
livres do próprio dia da prova para estudar para ela é otimismo sem base.

A meta vem da meta semanal de estudo da matéria, descontado o que já foi
registrado em `sessoes_estudo` no período. Sem meta cadastrada, o cartão
mostra só a folga disponível e não inventa um alvo.

`risco` quando a folga é menor que a meta restante — e o valor está em isso
aparecer com dias de antecedência, na Home e no topo do calendário, e não na
véspera.

#### 10.48.5 Alocação sugerida (degrau 2)

A partir de um prazo, propor **onde** encaixar as horas. Percorre os dias
até a véspera, ordena por folga, distribui a meta em blocos, e devolve uma
lista de sugestões.

Regras que impedem uma sugestão inútil:

- bloco mínimo (`BLOCO_MINIMO_MINUTOS`, 30) — quinze minutos picados entre
  compromissos não é sessão de estudo
- teto diário (`ESTUDO_MAXIMO_DIA_MINUTOS`, 4h) — concentrar dez horas na
  véspera é aritmeticamente válido e humanamente falso
- respeita a folga já comprometida por outras sugestões aceitas, para duas
  provas próximas não disputarem o mesmo slot
- nunca invade sono planejado, mesmo que sobrasse tempo ali

**Propõe, não agenda.** Mesmo princípio da sugestão de investimento (10.45):
a sugestão vive em memória até você aceitar; aceitar cria a sessão de
estudo de verdade. Sem tabela de sugestões — o custo de recalcular é baixo e
guardá-las criaria estado obsoleto assim que a rotina mudasse.

#### 10.48.6 Realocação do que falhou (degrau 2)

O sistema já sabe que um treino ficou `cancelado` ou que um check do
fluxograma não saiu (`checkPendente`). Falta o passo seguinte: oferecer
*"você perdeu o treino de terça — quinta tem 3h livres, quer remarcar?"*.

Usa a mesma busca de slot da 10.48.5, com janela curta (padrão: até o fim da
semana corrente). Vale só para rotina recorrente — prazo perdido não se
remarca, se renegocia fora do app. Sempre com opção explícita de descartar,
para o pendente não ficar cobrando indefinidamente.

#### 10.48.7 Conflito e sobrecarga (degrau 2)

Duas verificações, ambas sobre dado que já existe:

- **Conflito**: dois eventos com horário sobreposto no mesmo dia. Detecção
  trivial, ordenando por início e comparando com o fim anterior.
- **Sobrecarga**: `minutosLivres = 0` (ou abaixo de um piso mínimo) em
  algum dia da semana planejada.

O valor está no **momento**: ambos precisam aparecer no ritual de domingo
(10.48.3), quando ainda é planejamento. Descobrir na quarta que a semana não
cabia não é informação, é constatação.

---

#### 10.48.8 Heatmap anual de consistência (degrau 3)

Grade de um ano, um quadrado por dia, intensidade pela aderência —
filtrável por camada. `checkPendente` e `sonoAbaixo` já produzem o dado; o
que falta é a janela longa, hoje limitada ao intervalo visível.

Sem Recharts: é CSS grid com 365 divs. Padrões sazonais (o mês de provas em
que o treino sumiu, a virada de semestre) só aparecem nessa escala.

#### 10.48.9 Sono sobreposto à aderência (degrau 3)

O sono já está no calendário e a falha de check também. Colorir os dias por
horas dormidas e sobrepor a aderência testa — ou desmente — a hipótese
"quando durmo mal, o dia desanda".

Cuidado explícito: apresentar como **observação**, nunca como causa. Uma
correlação sobre alguns meses de dado de uma pessoa não sustenta afirmação
causal, e o texto da UI precisa refletir isso ("nesses dias, X% dos checks
ficaram pendentes"), sem prescrever nada.

#### 10.48.10 Timeline retrospectiva (degrau 3)

Percorrer o passado lendo o que aconteceu, em ordem cronológica, a partir
dos eventos que já existem: *"dia 3 — bateu recorde no supino, gastou R$ 40
acima do planejado, log de progresso no projeto X"*. Custo quase zero, já
que a agregação está pronta; o que muda é a leitura — não é agenda, é
memória.

---

#### Ordem de execução

1. **10.48.0** — trabalho no fluxograma. Bloqueia o resto: sem ele,
   `minutosLivres` nasce inflado e todas as recomendações do degrau 2 saem
   erradas.
2. **10.48.1** — tempo livre. Pivô do plano inteiro.
3. **10.48.2** — criar a partir do calendário. Independente do resto, ganho
   imediato de uso.
4. **10.48.4** — pressão até o prazo. Primeiro output que justifica o degrau
   1.
5. **10.48.7** — conflito e sobrecarga. Barato, e é pré-requisito de
   qualidade do ritual.
6. **10.48.3** — ritual de domingo. Depois de 4 e 7, para já nascer com os
   alertas dentro.
7. **10.48.5** e **10.48.6** — alocação e realocação, nessa ordem (a segunda
   reusa a busca de slot da primeira).
8. **10.48.8**, **10.48.9**, **10.48.10** — degrau 3, sem dependência entre
   si.

#### Testes a acrescentar

Em `carga.test.ts`:

- `minutosLivres` desconta sono planejado, rotina e trabalho
- dia sem planejamento de sono usa `SONO_PADRAO_MINUTOS`, não zero
- rotina que estoura o dia produz `0`, nunca negativo
- prazo (prova, conta, marco) não reduz `minutosLivres`
- trabalho não liga `checkPendente`

Em `eventos.test.ts`:

- fluxograma com `rotulo` gera evento de camada `'trabalho'`, sem `rota`
- exceção cancelando um bloco de trabalho remove a ocorrência daquele dia

Em um novo `planejador.test.ts`:

- `minutosLivresAte` soma até a véspera, excluindo o dia do prazo
- alocação respeita bloco mínimo, teto diário e sono planejado
- duas sugestões aceitas não disputam o mesmo slot
- prazo sem meta cadastrada não gera sugestão nem status de risco
- detecção de conflito acusa sobreposição parcial e ignora eventos adjacentes
  (fim de um igual ao início do outro)
