# Arrastar e redimensionar eventos no calendário — design

**Data:** 2026-08-13
**Status:** aprovado para planejamento

## Objetivo

Mover e reagendar um evento arrastando na grade — no mês e, principalmente, na vista por horas —
com a mudança gravada na entidade dona e refletida em toda a aplicação, não só na grade onde o
arrasto aconteceu.

**Pré-requisito já satisfeito:** `@fullcalendar/interaction` e `@fullcalendar/timegrid` já estão
instalados e em uso no `GradeMes` (hoje só para `dateClick`; a vista `timeGridWeek`/
`timeGridTresDias` já existe). Não há dependência nova. `remarcarOcorrencia` já aceita `novaData`,
`novoHorarioInicio` e `novoHorarioFim` — o caminho de escrita mais complexo já existe.

---

## 1. A decisão que estrutura tudo: quem move o quê

`EventoCalendario` é um agregado de sete fontes (`features/calendario/eventos.ts`). Arrastar não é
uma operação só: cada `tipo` tem uma entidade dona e uma escrita diferente. E há tipos que **não
podem** ser arrastados — o que precisa ser decidido antes de ligar `editable`, não depois.

| `tipo` | Dona | Ao mover | Arrastável? |
| --- | --- | --- | --- |
| `aula`, `treino`, `trabalho` | `fluxograma_semanal` | `remarcarOcorrencia` (exceção na data de origem) | **sim** |
| `estudo` | `sessoes_estudo` | update de `data` + `hora_inicio` | **sim** |
| `evento` | `eventos_calendario` | update de data/hora | **sim** |
| `marco` | `marcos_projeto` | update de `data_prevista` | **sim** |
| `prova` | `avaliacoes` | update de `data` | **sim, com confirmação** |
| `conta` | `compromissos_recorrentes` | mudaria `dia_mes` de **todos** os meses | **não** |
| `sono` | `planejamento_sono` | mudaria o dia da semana inteiro, não aquela data | **não** |

As duas últimas linhas são a razão de a tabela existir. Um compromisso recorrente não tem
ocorrência editável: arrastar a conta de luz de setembro mudaria outubro, novembro e todos os
demais. Silenciosamente. O mesmo vale para sono, que é planejamento por dia da semana.

**Regra:** `EventoCalendario` ganha um campo derivado

```ts
/** Se a ocorrência pode ser movida arrastando, e por qual caminho. */
movimento?: 'ocorrencia' | 'entidade'
```

`'ocorrencia'` = grava exceção sem tocar a regra (fluxograma). `'entidade'` = grava na própria
linha (sessão, prova, marco, evento). Ausente = não arrastável, e a grade passa `editable: false`
naquele evento. Decidir isso no modelo, e não na view, impede que a `GradeMes` e uma futura vista
de dia divirjam.

`prova` é arrastável mas pede confirmação: mudar data de avaliação recalcula `proximaAvaliacao`, a
pressão de prazo e o risco. Não é operação para acontecer por esbarrão no touch.

`eventosRemarcadosNaOrigem` (o rastro que fica na data de origem quando uma ocorrência de
fluxograma foi remarcada, `estado: 'remarcado'`) nunca recebe `movimento` — o que se move é a
ocorrência no destino, não o rastro.

## 2. Onde o código mora (regra de dependência) — e a exceção que o código real já abriu

A regra pretendida era: `features/calendario` **não pode** importar `features/estudos`,
`features/treino` etc. — features só importam o kernel; o despacho por tipo ficaria em
`pages/calendario/`.

**O código atual já não segue essa regra.** `DialogCriarNoDia`
(`features/calendario/componentes/DialogCriarNoDia.tsx`) já faz esse switch por tipo — e mora
dentro de `features/calendario`, importando diretamente `useCriarAvaliacao`/`useCriarSessao` de
`@/features/estudos/hooks`, `useCriarMarco` de `@/features/projetos/hooks`,
`useCriarFluxogramaLivre` de `@/features/fluxograma/hooks` e `useCriarEventoLivre` de
`@/features/eventos/hooks`. É o precedente real de "view pede, page resolve" citado nas conversas
anteriores, só que a "page" nesse caso já é um componente de `features/calendario`.

**Decisão para este plano:** seguir o precedente real, não a regra pretendida. O despacho de
`onMoverEvento` entra num hook novo, `features/calendario/hooks/useMoverEvento.ts`, que importa as
mesmas quatro features que `DialogCriarNoDia` já importa. Não há regressão de acoplamento: o
acoplamento já existe hoje, só ainda não tem nome. Formalizar a regra "calendário não conhece
domínio" fica para uma limpeza futura que toque os dois pontos juntos — misturar essa limpeza
com a feature de arrastar dobraria o raio do diff sem necessidade.

Se o `switch` de `useMoverEvento` crescer a ponto de pesar, o próximo passo é o mesmo dos outros
domínios: um arquivo por tipo. Não antes disso.

## 3. Refletir em todos os lugares

Este é o requisito central e o ponto onde a implementação erra com mais facilidade: a grade mostra
o novo horário, e a agenda, a barra de carga e a Home continuam no antigo até um refresh.

Boa notícia: **os hooks de mutation das entidades donas já invalidam nos dois lugares.**
`useRemarcarOcorrencia`, `useAtualizarSessao`, `useAtualizarEventoLivre`, `useAtualizarMarco` e
`useAtualizarAvaliacao` já invalidam a raiz da própria feature **e** `['calendario']` (prefixo).
Não é preciso inventar invalidação nova — só reaproveitar esses hooks no despacho.

`useFontesCalendario` (o único hook de leitura combinada, `features/calendario/hooks.ts`) expõe
tudo sob a raiz `['calendario', ...]`, então invalidar por prefixo alcança todos os consumidores
que leem por ele:

- `GradeMes` (mês e horas) — origem do arrasto
- `Agenda` e `FaixaCarga` — recebem dados prontos por prop da página, não fazem query própria
- `CardPressaoPrazos` — **único consumidor da lista que faz sua própria chamada** a
  `useFontesCalendario` internamente; se a prova mudou de data, `minutosLivresAte` recalcula sozinho
- `HistoricoPage` e `RitualSemanalPage` (duas chamadas, dois intervalos) — leem o mesmo intervalo
- `HomePage` — checks do dia e avisos

Nada a fazer de novo nesta seção: verificar que a invalidação por prefixo já cobre essas seis
telas, sem precisar listar chave a chave.

## 4. Comportamento na vista por horas

`timeGridPlugin` e `interactionPlugin` já estão importados e montados em `GradeMes`. O que falta
ligar:

- `editable` **por evento** (não global) — vem do campo `movimento` da seção 1: presente = `true`,
  ausente = `false`. `eventDurationEditable` idem, mas só para tipos com hora (não `prova`/`marco`,
  que são datas)
- `snapDuration: '00:15:00'` — imã de 15 min. Sem isso o arrasto grava `14:03:27` e a agenda fica
  ilegível
- `eventDrop` → move (mesma duração, novo início)
- `eventResize` → só duração muda; a data não
- `eventOverlap` livre: dois blocos no mesmo horário é conflito real, e a detecção de conflito é
  quem deve avisar — a grade não deve **impedir** o registro de uma sobreposição que existe de fato

Evento de dia inteiro arrastado para dentro da grade de horas ganha horário; o inverso o torna dia
inteiro. Só permitir quando a entidade dona comporta hora (`prova` e `marco` são datas, não
horários — manter dia inteiro, sem `eventDurationEditable`).

## 5. Falha e reversão

`eventDrop` e `eventResize` recebem `info.revert()`. Ele **precisa** ser chamado no `catch` da
mutation, senão o bloco fica visualmente no lugar novo com o banco no lugar antigo — o pior estado
possível, porque some no próximo refresh sem explicação.

Padrão: chamar a mutation (`mutateAsync`) dentro do handler de `eventDrop`/`eventResize`, `catch`
chama `info.revert()` e mostra toast de erro. As mutations existentes já mostram toast de sucesso
via `useMutation*` — não é preciso otimistic update no React Query para isso funcionar, porque o
próprio FullCalendar já move o bloco visualmente antes do `await` resolver; `revert()` desfaz esse
movimento visual se a escrita falhar. Otimistic update no cache do React Query é melhoria futura,
não requisito deste plano.

## 6. Ordem de execução

1. Campo `movimento` no modelo + a tabela da seção 1 refletida em `eventos.ts`, com teste
2. `onMoverEvento` como prop do `GradeMes`, com `editable`/`eventDurationEditable` por evento
3. `useMoverEvento` em `features/calendario/hooks/`, começando **só** por fluxograma
   (`remarcarOcorrencia` já existe — é o caminho mais curto para ver funcionando ponta a ponta)
4. Verificação manual nas seis telas da seção 3 (a invalidação já existe, só falta confirmar)
5. Demais tipos: sessão, evento avulso, marco
6. `prova` por último, junto com o diálogo de confirmação
7. Redimensionar (`eventResize`), depois que mover estiver estável

## 7. Testes

Em `eventos.test.ts`:

- `conta` e `sono` nunca recebem `movimento`
- evento de fluxograma recebe `movimento: 'ocorrencia'`; sessão, evento avulso, marco e prova,
  `'entidade'`
- evento com `estado: 'remarcado'` (o rastro na origem) não é arrastável — o que se move é a
  ocorrência no destino

Em `carga.test.ts`:

- mover um bloco de terça para quinta transfere `minutosRotina` entre os dois dias e recalcula
  `minutosLivres` de ambos
- redimensionar altera `minutosRotina` só do dia do bloco

Manual, uma vez: arrastar na vista de horas e conferir agenda, faixa de carga e Home **sem
recarregar a página**. É o requisito que motivou o plano e o que nenhum teste unitário cobre.
