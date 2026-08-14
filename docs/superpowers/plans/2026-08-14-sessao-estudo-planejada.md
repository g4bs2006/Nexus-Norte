# Sessão de estudo: planejado × executado — design

**Data:** 2026-08-14
**Status:** proposto, aguardando aprovação para implementar
**Contexto:** mesma tarde do chat que deu data própria ao treino
(`2026-08-14-treino-data-agendada` não existe como doc, mas a migration é
`app/supabase/migrations/20260814000003_treino_data_agendada.sql`). Pedido:
"gostaria que sessão de estudo também tivesse estado planejado e estado
executado, assim conseguiríamos metrificar melhor".

## O que existe hoje (levantado no código, não é opinião)

`sessoes_estudo` (`20260804000003_fase2_estudos.sql:93-106`, + `hora_inicio`
em `20260813000002_sessao_estudo_horario.sql`) representa **só fato
consumado**: `materia_id`, `data`, `duracao_minutos`, `hora_inicio` opcional,
`meta_diaria_minutos` (snapshot da meta do dia, pra não reescrever o
julgamento de sessões passadas quando a meta muda). Sem coluna de status —
toda sessão é "aconteceu".

Isso aparece em três lugares:

1. **`AbaSessoes.tsx`** — um formulário só, sempre "Registrar/Salvar". Não
   existe campo nem estado que diga "isto é intenção futura".
2. **`calculos.ts` → `frequenciaEstudoSemana`** — soma `duracao_minutos` das
   sessões da semana contra `meta_diaria_minutos × dias`. Compara minutos
   estudados com uma **meta autodeclarada**, não com sessões previstas.
3. **`eventos.ts` → `eventosSessoesEstudo`** — todo evento nasce com
   `estado: 'feito' as const`, hardcoded. Não há irmã `eventosSessaoPlanejada`
   (Treino tem as duas: `eventosTreinoAgendado` + `eventosExecucoesTreino`).

A única coisa "prevista" em Estudos hoje é a **aula recorrente** semanal
(`fluxograma_semanal.materia_id`, expandida por `expandirRecorrencia`) — que
é rotina de todo dia da semana, não uma sessão de estudo avulsa com data
própria. É exatamente a lacuna que existia em Treino antes de hoje cedo:
só rotina semanal ou só fato, nada no meio ("vou estudar Cálculo terça que
vem, das 19h às 21h", sem repetir toda terça).

## O que este spec propõe

Aplicar a MESMA separação que `treinos_agendados` / `execucoes_treino` já
prova funcionar, mas com uma diferença deliberada de forma:

- **Treino** guarda intervalo (`horario_inicio` + `horario_fim` obrigatórios)
  porque a UI de treino sempre trabalhou com hora de início e fim.
- **Estudo** guarda **duração**, não intervalo — é a convenção que
  `sessoes_estudo` já usa (`duracao_minutos` + `hora_inicio` opcional, "sem
  hora vira dia inteiro"). A tabela planejada replica essa convenção, não a
  do treino. `horario_fim` sai daqui: seria a primeira vez que Estudos usa
  intervalo, e o resto do pilar (execução, gráfico, cálculo de frequência)
  nunca precisou disso.

### 1. Migration — `sessoes_estudo_planejadas`

```sql
create table public.sessoes_estudo_planejadas (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references public.materias (id) on delete cascade,
  data date not null,
  -- Mesma regra de sessoes_estudo.hora_inicio: nulo = sem hora, dia inteiro.
  hora_inicio time,
  duracao_minutos int not null check (duracao_minutos > 0),
  created_at timestamptz not null default now()
);

create index sessoes_estudo_planejadas_materia_idx
  on public.sessoes_estudo_planejadas (materia_id, data desc);
create index sessoes_estudo_planejadas_data_idx
  on public.sessoes_estudo_planejadas (data desc);
```

Sem FK entre as duas tabelas. Reconciliação por **matéria + data**, igual ao
treino (`chaveTreinoData`) — não por id: um planejado que virou executado não
precisa apontar pra linha específica, só precisa "sumir" quando alguma
execução daquela matéria naquele dia existir. Mesma limitação que o treino já
aceita: duas sessões planejadas da mesma matéria no mesmo dia colidem na
reconciliação (raro, e o treino já vive com isso).

`sessoes_estudo` **não muda em nada** — ela já era só o "executado" (como
`execucoes_treino`), então esta migration é puramente aditiva, sem tocar em
dado existente. Sem migração de dados: diferente do treino, não havia nada
em `fluxograma_semanal` que represente "sessão avulsa planejada" pra
converter — a aula recorrente continua sendo outra coisa e não muda.

### 2. Camada de leitura/escrita (mesma forma do treino)

- `estudos/types.ts`: `SessaoEstudoPlanejada = Tables<'sessoes_estudo_planejadas'>`
- `estudos/api.ts`: `listarSessoesPlanejadas(de, ate)`, `criarSessaoPlanejada`,
  `atualizarSessaoPlanejada`, `excluirSessaoPlanejada` — mesmo shape do CRUD
  de `treinos_agendados`.
- `estudos/hooks.ts`: `useSessoesPlanejadas(de, ate)`,
  `useCriarSessaoPlanejada`, `useAtualizarSessaoPlanejada`,
  `useExcluirSessaoPlanejada`, invalidando `['estudos']` + `['calendario']`
  (mesmo padrão de `useMutationEstudos`).

### 3. Métricas — duas, não uma

`frequenciaEstudoSemana` (minutos × meta) **continua existindo, sem
alteração** — é uma pergunta diferente ("estudei o suficiente?") da que este
spec resolve ("o que eu planejei eu de fato fiz?"). Ambas fazem sentido ao
mesmo tempo, exatamente como Treino tem `frequenciaSemana` (previsto ×
realizado) e separadamente mostra volume/PRs.

Nova função em `calculos.ts`, espelhando `frequenciaSemana` do treino:

```ts
export interface AderenciaSessoes {
  realizadas: number
  planejadas: number
  percentual: number | null
}

export function aderenciaSessoesSemana(
  realizadas: number,
  planejadas: number,
): AderenciaSessoes {
  return {
    realizadas,
    planejadas,
    percentual: planejadas > 0 ? (realizadas / planejadas) * 100 : null,
  }
}
```

`realizadas` = contagem de `sessoes_estudo` da semana (todas contam — sessão
de estudo não tem "abandonada no meio" como treino). `planejadas` = contagem
de `sessoes_estudo_planejadas` da semana.

### 4. Calendário — mesma forma de `eventosTreinoAgendado`

- Nova interface `FonteSessaoPlanejada` (`id, materia_id, data, hora_inicio,
  duracao_minutos`) em `eventos.ts`.
- Nova função `eventosSessaoPlanejada(planejadas, intervalo, nomePorMateria,
  corPorMateria, sessoesFeitas)` — evento com `movimento: 'entidade'`,
  `rotina: true`, cede lugar quando existe `sessoes_estudo` da mesma
  matéria+data no set `sessoesFeitas` (chave `chaveSessaoData`, irmã de
  `chaveTreinoData`).
- `FontesCalendario.sessoesEstudoPlanejadas: readonly FonteSessaoPlanejada[]`
- `calendario/api.ts`: `sessoesEstudoPlanejadasNoIntervalo(de, ate)`.
- `calendario/hooks.ts`: mais uma query em `useFontesCalendario`, mesmo
  molde de `treinosAgendados`.
- `construirEventos`: mais uma linha na lista agregada, com o mesmo cálculo
  de "feitas" que já existe pra treino (`treinosFeitos` vira também
  `sessoesFeitas`, calculado uma vez a partir de `eventosSessoesEstudo`).

### 5. UI

- **`DialogAgendarSessao`** (novo componente, mesmo padrão de
  `DialogAgendarTreino`): matéria + data + hora opcional + duração planejada.
  Suporta `agendado?` pra editar/excluir (mesmo `DialogConfirmarExclusao` no
  rodapé), e `open`/`onOpenChange`/`trigger` controláveis pro clique direto
  no calendário.
- **`AbaSessoes.tsx`** ganha uma seção "Sessões planejadas" (lista da
  semana, com editar/excluir), no mesmo lugar onde `TreinoPage` tem "Treino
  de hoje" + "Agenda da semana". O formulário de registrar (fato) continua
  exatamente como está — é o "Registrar sessão" do treino, mutatis mutandis.
- **`DialogCriarNoDia.tsx`**: a opção "Sessão de estudo" passa a criar uma
  linha em `sessoes_estudo_planejadas`, não mais em `sessoes_estudo`. É a
  mesma virada que "Treino" já fez neste chat — no calendário, marcar uma
  matéria numa data futura é intenção ("vou estudar"), não fato. Registrar
  o que de fato aconteceu continua exclusivo de `AbaSessoes`, igual ao
  registro de treino (`DialogExecucao`) que nunca teve atalho pelo
  calendário.
- **Agenda/CalendarioPage**: clicar numa sessão planejada (não executada) no
  calendário abre editar/excluir direto — mesmo tratamento que treino
  agendado ganhou logo depois de existir (`Agenda.tsx`, `CalendarioPage.tsx`,
  `useMoverEvento.ts`).

### 6. Checkbox de "feita" na sessão planejada

Pedido à parte no mesmo chat: "sessão de estudos também poderia aparecer
como um checkbox, como as aulas e treino". Aula usa `conclusoes_fluxograma`
— uma tabela de presença com FK travada em `fluxograma_semanal(id)`. Treino
tinha o mesmo mecanismo antes de ganhar `treinos_agendados`/`execucoes_treino`
e foi retirado do checklist da Home nesta mesma tarde: um booleano solto ao
lado de uma execução rica (séries, cargas) seria um segundo sinal,
desconectado do dado de verdade.

Sessão de estudo está no meio do caminho, e isso é a diferença que importa:
o "executado" dela (`sessoes_estudo`) não tem série nem carga — é só
matéria + data + duração + hora opcional, exatamente o que a planejada já
tem. Então o checkbox **não vira uma flag nova**: ele cria/apaga a sessão
executada de verdade, usando os dados da planejada como valor inicial.

- **Marcar**: cria uma linha em `sessoes_estudo` com `materia_id`, `data`,
  `duracao_minutos` e `hora_inicio` copiados da planejada. Se a duração real
  foi outra, edita depois em `AbaSessoes` — mesmo fluxo que já existe pra
  qualquer sessão.
- **Desmarcar**: apaga a(s) sessão(ões) executada(s) daquela matéria+data —
  a mesma chave de reconciliação do resto do spec, sem precisar de FK entre
  as tabelas.
- Reaproveita 100% o resto do plano: a reconciliação do calendário
  (`eventosSessaoPlanejada` cede lugar quando existe execução) já cobre a
  troca de contorno pra preenchido — o checkbox só é mais uma porta de
  entrada pro mesmo dado.
- Trade-off aceito, espelhando o do treino: se já existisse uma sessão real
  registrada naquele dia+matéria por outro caminho, desmarcar apagaria ela.
  Raro, e o treino já convive com essa mesma limitação.

Vive em `AbaSessoes.tsx`, numa seção nova "Sessões planejadas da semana",
reaproveitando o componente `CheckDia` (o mesmo usado no checklist de aula
da Home) — não entra no `ChecksFluxograma` da Home neste spec: aquele
componente e o hook que ele injeta (`onAlternar`) são desenhados em torno de
`fluxograma_id`, e replicar a mistura de duas fontes ali é trabalho
separado, não decidido ainda.

### O que NÃO muda

- `sessoes_estudo` (schema, api, hooks, `frequenciaEstudoSemana`, o gráfico
  de 14 dias, a lista de "últimas sessões") — tudo isso é sobre o fato
  consumado e continua exatamente como está.
- A aula recorrente (`fluxograma_semanal`) — continua sendo outra coisa
  (rotina semanal, sem data própria), sem relação com este spec.
- `schemaSessao` (zod, hoje morto/não usado) — fora de escopo; se for
  reaproveitado, é spec separado.

## Ordem de implementação sugerida

1. Migration (`sessoes_estudo_planejadas`) + regenerar `database.ts`.
2. `estudos/types.ts` + `api.ts` + `hooks.ts` (CRUD).
3. `calculos.ts` (`aderenciaSessoesSemana`) + teste.
4. `calendario/eventos.ts` + `calendario/api.ts` + `calendario/hooks.ts`
   (fonte nova, função nova, agregação).
5. `DialogAgendarSessao.tsx`.
6. `AbaSessoes.tsx` (seção de planejadas, com `CheckDia` pra marcar feita).
7. `DialogCriarNoDia.tsx` (trocar o que a opção "Sessão de estudo" grava).
8. `Agenda.tsx` + `CalendarioPage.tsx` + `useMoverEvento.ts` (editar/excluir
   e arrastar direto no calendário, mesmo padrão do treino).

Cada passo é testável e revertível isoladamente — mesma ordem que o treino
seguiu neste chat, e pelo mesmo motivo: dá pra parar depois do passo 4 com
o calendário já mostrando "planejado × feito" mesmo sem UI de agendar ainda
(a criação ficaria só via SQL/temporária até o passo 5).
