# Arrastar e redimensionar eventos no calendário — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIO: use `superpowers:subagent-driven-development`
> (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa a tarefa.
> Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Spec:** `docs/superpowers/specs/2026-08-13-arrastar-eventos-design.md`

**Objetivo:** mover e reagendar um evento arrastando na grade — no mês e, principalmente, na
vista por horas — com a mudança gravada na entidade dona e refletida em toda a aplicação, não só
na grade onde o arrasto aconteceu.

**Arquitetura:** `EventoCalendario` ganha um campo derivado `movimento?: 'ocorrencia' | 'entidade'`
que diz se e como o evento pode ser arrastado (spec, seção 1). Um hook novo,
`useMoverEvento` em `features/calendario/hooks/`, despacha por `tipo` para a mutation da feature
dona que já existe — nenhuma mutation nova é escrita, todas já invalidam `['calendario']` (spec,
seção 3). `GradeMes` ganha `editable` por evento e os handlers `eventDrop`/`eventResize`, chamando
`onMoverEvento` e revertendo com `info.revert()` em caso de erro.

**Decisão que se desvia da leitura inicial do design doc:** o despacho por tipo mora em
`features/calendario/hooks/useMoverEvento.ts`, não em `pages/calendario/`. É o mesmo lugar onde
`DialogCriarNoDia.tsx` (já em `features/calendario/componentes/`) importa `useCriarSessao`,
`useCriarMarco`, `useCriarFluxogramaLivre` e `useCriarEventoLivre` — o acoplamento
"calendário conhece as quatro features doadoras de evento" já existe no código, só não tinha nome.
Ver spec, seção 2.

**Stack:** React 19 + TypeScript + Vite, FullCalendar 6 (`@fullcalendar/interaction` e
`@fullcalendar/timegrid` já instalados), TanStack Query 5, Supabase (Postgres), Vitest.

## Restrições globais

- **Idioma:** identificadores, comentários e mensagens de commit em **português**. Comentários
  explicam o *porquê*, nunca o *quê*.
- **Diretório de trabalho:** todos os comandos `npm` rodam em `app/`.
- **Mobile é restrição de desenho.** Nenhuma tarefa deste plano adiciona alvo de toque novo — o
  arrasto em si não é acessível por toque de forma equivalente ao mouse; isso é limitação conhecida
  do FullCalendar e fica registrada, não resolvida, na tarefa 7.
- **Nunca ajustar um teste para ele passar** sem entender por que quebrou.
- **Comandos de verificação** (sempre em `app/`): `npm test`, `npm run typecheck`, `npm run lint`.
- Não existe testing-library nem jsdom no projeto — só lógica pura tem teste automatizado.

---

## Estrutura de arquivos

**Modificados:**
- `app/src/features/calendario/eventos.ts` — campo `movimento`, helper `idRealEntidade`, helper
  `precisaConfirmarMovimento`
- `app/src/features/calendario/eventos.test.ts`
- `app/src/features/calendario/componentes/GradeMes.tsx` — `editable`, `eventDrop`, `eventResize`,
  `snapDuration`
- `app/src/pages/calendario/CalendarioPage.tsx` — passa `onMoverEvento` para `GradeMes`

**Criados:**
- `app/src/features/calendario/hooks/useMoverEvento.ts`
- `app/src/features/calendario/componentes/DialogConfirmarMoverProva.tsx`

---

## Ordem das tarefas e por quê

1. Campo `movimento` no modelo — isolado, só lógica pura, testável sem UI
2. `useMoverEvento` — despacho por tipo, reaproveitando mutations que já existem
3. Ligar o arrasto em `GradeMes` (mês e horas) para os tipos sem confirmação
4. Prova: diálogo de confirmação antes de mover
5. Redimensionar (`eventResize`)
6. Verificação de ponta a ponta nas seis telas que consomem `['calendario']`

A 1 vem antes de tudo porque nada do resto compila sem o campo existir. A 3 cobre quatro dos cinco
tipos arrastáveis de uma vez — fluxograma, estudo, evento avulso e marco compartilham o mesmo
`eventDrop`, só o despacho interno muda. Prova fica separada porque é o único tipo com UI própria
(o diálogo).

---

### Tarefa 1: Campo `movimento` e helpers em `eventos.ts`

**Arquivos:**
- Modificar: `app/src/features/calendario/eventos.ts:59-137` (interface), `:313-339`
  (`eventosAvaliacoes`), `:355-441` (`eventosFluxograma`), `:502-534`
  (`eventosExecucoesTreino` — **não** ganha `movimento`, ver Passo 3), `:551-592`
  (`eventosSessoesEstudo`), `:802-827` (`eventosMarcos`), `:834-860` (`eventosLivres`)
- Teste: `app/src/features/calendario/eventos.test.ts`

**Interfaces:**
- Produz: `EventoCalendario.movimento?: 'ocorrencia' | 'entidade'`; `idRealEntidade(evento)`;
  `precisaConfirmarMovimento(evento)`. As tarefas 2, 3 e 4 dependem dos três.

- [ ] **Passo 1: Escrever os testes que falham**

Em `app/src/features/calendario/eventos.test.ts`, adicione (ajuste o import do topo para incluir
`idRealEntidade` e `precisaConfirmarMovimento`):

```ts
describe('movimento', () => {
  it('conta e sono nunca recebem movimento', () => {
    const [conta] = eventosContas(
      [
        {
          id: 'c1',
          descricao: 'Luz',
          valor: 100,
          data: '2026-08-05',
          data_vencimento: null,
          categoria_id: 'cat-1',
          categoria_tipo: 'fixo',
          categoria_natureza: 'despesa',
        },
      ],
      SEMANA,
    )
    expect(conta?.movimento).toBeUndefined()

    const [sono] = eventosSono(
      [
        {
          id: 's1',
          dia_semana: 3,
          hora_dormir_alvo: '23:00:00',
          hora_acordar_alvo: '07:00:00',
        },
      ],
      SEMANA,
    )
    expect(sono?.movimento).toBeUndefined()
  })

  it('ocorrência de fluxograma recebe movimento "ocorrencia"', () => {
    const [aula] = eventosFluxograma(
      [
        {
          id: 'f1',
          dia_semana: 3,
          horario_inicio: '08:00:00',
          horario_fim: '09:00:00',
          materia_id: 'materia-1',
          treino_id: null,
          rotulo: null,
        },
      ],
      [],
      SEMANA,
      new Map([['materia-1', 'Cálculo']]),
      new Map(),
    )
    expect(aula?.movimento).toBe('ocorrencia')
  })

  it('sessão, evento avulso, marco e prova recebem movimento "entidade"', () => {
    const [sessao] = eventosSessoesEstudo(
      [
        {
          id: 'sessao-1',
          materia_id: 'materia-1',
          data: '2026-08-05',
          hora_inicio: null,
          duracao_minutos: 30,
        },
      ],
      SEMANA,
      new Map([['materia-1', 'Cálculo']]),
    )
    expect(sessao?.movimento).toBe('entidade')

    const [evento] = eventosLivres(
      [
        {
          id: 'evento-1',
          titulo: 'Dentista',
          descricao: null,
          data: '2026-08-05',
          hora_inicio: null,
          hora_fim: null,
        },
      ],
      SEMANA,
    )
    expect(evento?.movimento).toBe('entidade')

    const [marco] = eventosMarcos(
      [
        {
          id: 'marco-1',
          nome: 'Entrega',
          data_prevista: '2026-08-05',
          projeto_id: 'projeto-1',
          projeto_nome: 'TCC',
        },
      ],
      SEMANA,
    )
    expect(marco?.movimento).toBe('entidade')

    const [prova] = eventosAvaliacoes(
      [
        {
          id: 'prova-1',
          nome: 'P1',
          data: '2026-08-05',
          nota: null,
          materia_id: 'materia-1',
        },
      ],
      SEMANA,
      new Map([['materia-1', 'Cálculo']]),
    )
    expect(prova?.movimento).toBe('entidade')
  })

  it('rastro de remarcação na origem não é arrastável', () => {
    const [origem] = eventosRemarcadosNaOrigem(
      [
        {
          id: 'f1',
          dia_semana: 3,
          horario_inicio: '08:00:00',
          horario_fim: '09:00:00',
          materia_id: 'materia-1',
          treino_id: null,
          rotulo: null,
        },
      ],
      [
        {
          fluxograma_id: 'f1',
          data: '2026-08-05',
          status: 'remarcado',
          nova_data: '2026-08-07',
        },
      ],
      SEMANA,
      new Map([['materia-1', 'Cálculo']]),
      new Map(),
    )
    expect(origem?.movimento).toBeUndefined()
  })
})

describe('idRealEntidade', () => {
  it('extrai o uuid depois do primeiro dois-pontos', () => {
    expect(idRealEntidade({ id: 'marco:abc-123' } as EventoCalendario)).toBe(
      'abc-123',
    )
    expect(
      idRealEntidade({ id: 'sessao-estudo:sessao-9' } as EventoCalendario),
    ).toBe('sessao-9')
  })
})

describe('precisaConfirmarMovimento', () => {
  it('só prova pede confirmação', () => {
    expect(
      precisaConfirmarMovimento({ tipo: 'prova' } as EventoCalendario),
    ).toBe(true)
    expect(
      precisaConfirmarMovimento({ tipo: 'estudo' } as EventoCalendario),
    ).toBe(false)
  })
})
```

- [ ] **Passo 2: Rodar e ver falhar**

```bash
cd app && npm test -- src/features/calendario/eventos.test.ts
```

Esperado: FALHA — `movimento` não existe, `idRealEntidade` e `precisaConfirmarMovimento` não são
exportados.

- [ ] **Passo 3: Adicionar o campo à interface**

Em `app/src/features/calendario/eventos.ts`, depois do campo `rotina?: boolean` (linha 136),
adicione:

```ts
  /**
   * Se a ocorrência pode ser movida arrastando na grade, e por qual caminho
   * (spec 2026-08-13, seção 1).
   *
   * `'ocorrencia'` — grava uma exceção sem tocar a regra recorrente
   * (fluxograma: aula, treino previsto, trabalho). `'entidade'` — grava
   * direto na linha dona (sessão, evento avulso, marco, prova).
   *
   * Ausente = não arrastável: conta (mudaria todos os meses), sono (mudaria
   * o dia da semana inteiro), o rastro de remarcação na origem (o que se
   * move é a ocorrência no destino, não a marca de que saiu de algum lugar) e
   * treino já realizado (fato registrado, sem tela de edição de data — mover
   * na grade reescreveria histórico sem passar por nenhum formulário).
   */
  movimento?: 'ocorrencia' | 'entidade'
```

- [ ] **Passo 4: Marcar cada construtor**

Em `eventosAvaliacoes` (linha 313), dentro do objeto retornado (depois de `rota:`), adicione
`movimento: 'entidade' as const,`.

Em `eventosFluxograma` (linha 355), dentro do objeto retornado (depois de `rotina: true,`),
adicione `movimento: 'ocorrencia' as const,`.

Em `eventosSessoesEstudo` (linha 551), depois de `rota:`, adicione
`movimento: 'entidade' as const,`.

Em `eventosMarcos` (linha 802), depois de `rota:`, adicione `movimento: 'entidade' as const,`.

Em `eventosLivres` (linha 834), depois de `tipo: 'evento' as const,`, adicione
`movimento: 'entidade' as const,`.

`eventosExecucoesTreino`, `eventosContas`, `eventosSono`, `eventosCancelados` e
`eventosRemarcadosNaOrigem` **não** mudam — ausência de `movimento` já é o padrão.

- [ ] **Passo 5: Escrever os dois helpers**

Depois de `ehBlocoCheio` (linha 171), adicione:

```ts
/**
 * Extrai o id real da entidade dona a partir do id composto do evento
 * (`prefixo:uuid`), para as mutations de mover — spec, seção 1.
 *
 * Só serve para `movimento === 'entidade'`: fluxograma usa `origemId` (o id
 * da regra) direto, porque o id composto ali tem um segmento extra (a data
 * da ocorrência) que este corte ingênuo não deveria remover.
 */
export function idRealEntidade(evento: Pick<EventoCalendario, 'id'>): string {
  return evento.id.slice(evento.id.indexOf(':') + 1)
}

/**
 * Se mover este evento precisa de confirmação antes de gravar.
 *
 * Só prova: mudar a data de uma avaliação recalcula pressão de prazo e risco
 * em outras telas — não é operação para acontecer por esbarrão no touch
 * (spec, seção 1).
 */
export function precisaConfirmarMovimento(
  evento: Pick<EventoCalendario, 'tipo'>,
): boolean {
  return evento.tipo === 'prova'
}
```

- [ ] **Passo 6: Rodar e ver passar**

```bash
cd app && npm test -- src/features/calendario/eventos.test.ts
```

- [ ] **Passo 7: Verificar e commitar**

```bash
cd app && npm run typecheck && npm run lint && npm test
git add app/src/features/calendario/eventos.ts app/src/features/calendario/eventos.test.ts
git commit -m "feat(calendario): campo movimento marca o que pode ser arrastado na grade"
```

---

### Tarefa 2: `useMoverEvento` — despacho por tipo

**Arquivos:**
- Criar: `app/src/features/calendario/hooks/useMoverEvento.ts`

**Interfaces:**
- Consome: `movimento`, `idRealEntidade` da tarefa 1; `useRemarcarOcorrencia`
  (`@/features/fluxograma/hooks`), `useAtualizarSessao`/`useAtualizarAvaliacao`
  (`@/features/estudos/hooks`), `useAtualizarEventoLivre` (`@/features/eventos/hooks`),
  `useAtualizarMarco` (`@/features/projetos/hooks`) — todas já existem e já invalidam
  `['calendario']`.
- Produz: `useMoverEvento()` devolvendo `{ mover, pendente }`, onde `mover` tem assinatura
  `(evento: EventoCalendario, novaData: string, novoInicio: string | null, novoFim: string | null) => Promise<void>`.
  A tarefa 3 consome isso direto em `GradeMes`; a tarefa 4 o chama depois de confirmar.

Este hook é o que fica em `features/calendario/`, e não em `pages/`, pelo motivo explicado na
seção "Arquitetura" no topo deste plano.

- [ ] **Passo 1: Criar o hook**

Crie `app/src/features/calendario/hooks/useMoverEvento.ts`:

```ts
import { useRemarcarOcorrencia } from '@/features/fluxograma/hooks'
import { useAtualizarAvaliacao, useAtualizarSessao } from '@/features/estudos/hooks'
import { useAtualizarEventoLivre } from '@/features/eventos/hooks'
import { useAtualizarMarco } from '@/features/projetos/hooks'
import { idRealEntidade, type EventoCalendario } from '../eventos'

/**
 * Despacho de "mover evento arrastado" por tipo (spec 2026-08-13, seção 2).
 *
 * Cada tipo tem entidade dona e mutation própria — todas já existem e já
 * invalidam `['calendario']`, então este hook não grava nada, só decide qual
 * mutation chamar. Mesmo padrão de `DialogCriarNoDia.tsx`, que já importa
 * estas quatro features de dentro de `features/calendario`.
 *
 * Eventos sem `movimento` (conta, sono, o rastro de remarcação, treino
 * realizado) nunca chegam aqui: `GradeMes` os marca `editable: false` antes
 * do FullCalendar emitir `eventDrop`.
 */
export function useMoverEvento() {
  const remarcarOcorrencia = useRemarcarOcorrencia()
  const atualizarSessao = useAtualizarSessao()
  const atualizarAvaliacao = useAtualizarAvaliacao()
  const atualizarEventoLivre = useAtualizarEventoLivre()
  const atualizarMarco = useAtualizarMarco()

  const pendente =
    remarcarOcorrencia.isPending ||
    atualizarSessao.isPending ||
    atualizarAvaliacao.isPending ||
    atualizarEventoLivre.isPending ||
    atualizarMarco.isPending

  async function mover(
    evento: EventoCalendario,
    novaData: string,
    novoInicio: string | null,
    novoFim: string | null,
  ): Promise<void> {
    switch (evento.tipo) {
      case 'aula':
      case 'treino':
      case 'trabalho':
        // `origemId` é o id da regra do fluxograma; a data de origem é a do
        // próprio evento antes do arrasto, não `novaData`.
        await remarcarOcorrencia.mutateAsync({
          fluxogramaId: evento.origemId as string,
          data: evento.inicio.slice(0, 10),
          novaData,
          novoHorarioInicio: novoInicio,
          novoHorarioFim: novoFim,
        })
        return
      case 'estudo':
        await atualizarSessao.mutateAsync({
          id: idRealEntidade(evento),
          dados: { data: novaData, hora_inicio: novoInicio },
        })
        return
      case 'evento':
        await atualizarEventoLivre.mutateAsync({
          id: idRealEntidade(evento),
          dados: {
            data: novaData,
            hora_inicio: novoInicio,
            hora_fim: novoFim,
          },
        })
        return
      case 'marco':
        await atualizarMarco.mutateAsync({
          id: idRealEntidade(evento),
          dados: { data_prevista: novaData },
        })
        return
      case 'prova':
        await atualizarAvaliacao.mutateAsync({
          id: idRealEntidade(evento),
          dados: { data: novaData },
        })
        return
      default:
        // conta, sono, remarcado-na-origem, treino realizado — `GradeMes` já
        // não deveria emitir arrasto para estes; chegar aqui é bug de fiação.
        throw new Error(`Tipo "${evento.tipo}" não é arrastável`)
    }
  }

  return { mover, pendente }
}
```

- [ ] **Passo 2: Verificar**

```bash
cd app && npm run typecheck && npm run lint
```

Esperado: sem erro de tipo. Se `useAtualizarSessao`/`useAtualizarAvaliacao`/
`useAtualizarEventoLivre`/`useAtualizarMarco` reclamarem do shape de `dados`, confira contra
`Parameters<typeof api.atualizarX>[1]` no arquivo de hooks correspondente — o tipo vem de
`TablesUpdate<'...'>`, que aceita campos parciais.

- [ ] **Passo 3: Commit**

```bash
git add app/src/features/calendario/hooks/useMoverEvento.ts
git commit -m "feat(calendario): useMoverEvento despacha o arrasto pra mutation de cada dono"
```

---

### Tarefa 3: Ligar o arrasto em `GradeMes`

**Arquivos:**
- Modificar: `app/src/features/calendario/componentes/GradeMes.tsx`
- Modificar: `app/src/pages/calendario/CalendarioPage.tsx:495-524`

**Interfaces:**
- Consome: `useMoverEvento` da tarefa 2; `movimento`/`precisaConfirmarMovimento` da tarefa 1.
- Produz: prop `onMoverEvento?: (evento: EventoCalendario, novaData: string, novoInicio: string | null, novoFim: string | null) => Promise<void>`
  em `GradeMes`. A tarefa 4 intercepta antes desta prop ser chamada, para o caso `prova`.

**Contexto que o implementador precisa:** `GradeMes` não deve importar `useMoverEvento`
diretamente — ele já não faz nenhuma mutation (é só apresentação, recebe `onClicarDia` e
`onClicarEvento` de fora do mesmo jeito). `CalendarioPage` é quem instancia `useMoverEvento` e
passa a função pronta. Isso mantém `GradeMes` testável sem TanStack Query por perto, e replicável
por uma futura vista de dia sem repetir o hook.

- [ ] **Passo 1: Adicionar a prop e os handlers em `GradeMes`**

Em `app/src/features/calendario/componentes/GradeMes.tsx`, adicione ao import da linha 6-7:

```ts
import type {
  DateClickArg,
  EventDropArg,
} from '@fullcalendar/interaction'
import type {
  DatesSetArg,
  EventClickArg,
  EventContentArg,
} from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
```

(Remova `EventContentArg` se o typecheck disser que não é usado — é só para o caso de precisar
tipar `dayCellContent`, que já está inline.)

Na interface `GradeMesProps` (linha 15-37), depois de `onClicarDia`, adicione:

```ts
  /**
   * Arrastar ou redimensionar um evento (resolução "arrastar eventos",
   * ago/2026). Ausente = grade só de leitura, sem `editable` em nenhum
   * evento — é o comportamento de hoje, preservado enquanto a tarefa 3 não
   * estiver completa em todo call-site.
   */
  onMoverEvento?: (
    evento: EventoCalendario,
    novaData: string,
    novoInicio: string | null,
    novoFim: string | null,
  ) => Promise<void>
```

Na assinatura da função (linha 60-67), adicione `onMoverEvento` à desestruturação.

No `map` que monta `eventosFullCalendar` (linha 86-135), acrescente ao objeto retornado (depois
de `classNames:`):

```ts
        editable: Boolean(onMoverEvento) && evento.movimento !== undefined,
        // Redimensionar só faz sentido pra quem tem hora — prova e marco são
        // datas soltas, sem `fim` que dependa do horário.
        durationEditable:
          Boolean(onMoverEvento) &&
          evento.movimento !== undefined &&
          !evento.diaInteiro,
```

Depois de `aoClicarDia` (linha 150-152), adicione os dois handlers:

```ts
  async function aoSoltarEvento(arg: EventDropArg) {
    const evento = eventos.find((e) => e.id === arg.event.id)
    if (!evento || !onMoverEvento) {
      arg.revert()
      return
    }
    try {
      await onMoverEvento(
        evento,
        paraISO(arg.event.start as Date),
        evento.diaInteiro ? null : formatarHoraISO(arg.event.start as Date),
        evento.diaInteiro || !arg.event.end
          ? null
          : formatarHoraISO(arg.event.end),
      )
    } catch {
      // A mutation já mostra o toast de erro (hooks de cada feature dona);
      // aqui só desfazemos o movimento visual, senão o bloco fica no lugar
      // novo na tela com o banco no lugar antigo até o próximo refresh.
      arg.revert()
    }
  }

  async function aoRedimensionarEvento(arg: EventResizeDoneArg) {
    const evento = eventos.find((e) => e.id === arg.event.id)
    if (!evento || !onMoverEvento || !arg.event.end) {
      arg.revert()
      return
    }
    try {
      await onMoverEvento(
        evento,
        paraISO(arg.event.start as Date),
        formatarHoraISO(arg.event.start as Date),
        formatarHoraISO(arg.event.end),
      )
    } catch {
      arg.revert()
    }
  }
```

Adicione o helper de hora, perto de `aoClicarDia`:

```ts
/** `Date` → `HH:mm:ss`, o formato que as mutations de mover esperam. */
function formatarHoraISO(data: Date): string {
  return data.toTimeString().slice(0, 8)
}
```

E ligue os dois no `<FullCalendar>` (perto de `dateClick`, linha 174):

```tsx
          eventDrop={aoSoltarEvento}
          eventResize={aoRedimensionarEvento}
          snapDuration="00:15:00"
          eventOverlap
```

- [ ] **Passo 2: Passar `onMoverEvento` em `CalendarioPage`**

Em `app/src/pages/calendario/CalendarioPage.tsx`, importe o hook:

```ts
import { useMoverEvento } from '@/features/calendario/hooks/useMoverEvento'
```

Dentro do componente, antes do `return`, instancie:

```ts
  const { mover } = useMoverEvento()
```

No `<GradeMes>` (linha ~495-524), adicione `onMoverEvento={mover}` junto de `onClicarDia`.

- [ ] **Passo 3: Verificar**

```bash
cd app && npm run typecheck && npm run lint && npm test
```

- [ ] **Passo 4: Conferir na tela**

```bash
cd app && npm run dev
```

Abra `/calendario`, vista "Horas". Arraste uma sessão de estudo ou um bloco de trabalho para outro
horário/dia. Confirme, **sem recarregar**:
- o bloco fica no lugar novo
- a Agenda e a Home (abra em outra aba) mostram o novo horário depois de focar a aba
- arrastar uma conta ou o bloco de sono não é possível (o FullCalendar nem inicia o drag)

Encerre o servidor depois.

- [ ] **Passo 5: Commit**

```bash
git add app/src/features/calendario/componentes/GradeMes.tsx \
  app/src/pages/calendario/CalendarioPage.tsx
git commit -m "feat(calendario): arrastar evento na grade move na entidade dona"
```

---

### Tarefa 4: Prova pede confirmação antes de mover

**Arquivos:**
- Criar: `app/src/features/calendario/componentes/DialogConfirmarMoverProva.tsx`
- Modificar: `app/src/pages/calendario/CalendarioPage.tsx`

**Interfaces:**
- Consome: `precisaConfirmarMovimento` da tarefa 1; `mover` da tarefa 2.
- Produz: nada consumido por tarefa adiante — é o último tipo da tabela da spec, seção 1.

**Contexto que o implementador precisa:** o arrasto de uma prova **já aconteceu visualmente** no
FullCalendar quando `eventDrop` dispara — não há como interceptar antes. O padrão é: se
`precisaConfirmarMovimento`, `arg.revert()` imediato (desfaz o movimento visual) e abre um diálogo
perguntando "mover [prova] para [nova data]?"; confirmando, chama `mover` de novo com os mesmos
argumentos. É mais simples e mais previsível do que tentar suspender o `eventDrop` no meio.

- [ ] **Passo 1: Interceptar em `aoSoltarEvento`**

Em `app/src/features/calendario/componentes/GradeMes.tsx`, no topo de `aoSoltarEvento` (antes do
`try`), adicione:

```ts
    if (precisaConfirmarMovimento(evento)) {
      arg.revert()
      onPedirConfirmacao?.(
        evento,
        paraISO(arg.event.start as Date),
        evento.diaInteiro ? null : formatarHoraISO(arg.event.start as Date),
      )
      return
    }
```

Importe `precisaConfirmarMovimento` de `../eventos` (mesmo import de `corDoEvento`/`ehBlocoCheio`,
linha 13). Adicione a prop `onPedirConfirmacao` à interface, com a mesma assinatura de 3 argumentos
(sem `novoFim` — prova é sempre dia inteiro, `eventDurationEditable` já está `false` para ela).

- [ ] **Passo 2: Criar o diálogo**

Crie `app/src/features/calendario/componentes/DialogConfirmarMoverProva.tsx`:

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatarDataExtensa } from '@/lib/datas'
import type { EventoCalendario } from '../eventos'

interface DialogConfirmarMoverProvaProps {
  /** `null` = fechado. */
  pedido: { evento: EventoCalendario; novaData: string } | null
  onFechar: () => void
  onConfirmar: (evento: EventoCalendario, novaData: string) => void
}

/**
 * Confirmação antes de mover uma prova (spec 2026-08-13, seção 1).
 *
 * Mudar a data de avaliação recalcula pressão de prazo e risco em outras
 * telas — não é operação para acontecer por esbarrão no touch. O arrasto na
 * grade já foi revertido visualmente antes deste diálogo abrir (`GradeMes`);
 * confirmar aqui chama `mover` de novo, como se fosse um novo arrasto.
 */
export function DialogConfirmarMoverProva({
  pedido,
  onFechar,
  onConfirmar,
}: DialogConfirmarMoverProvaProps) {
  return (
    <AlertDialog open={pedido !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mover prova?</AlertDialogTitle>
          <AlertDialogDescription>
            {pedido && (
              <>
                Mover "{pedido.evento.titulo}" para{' '}
                {formatarDataExtensa(pedido.novaData)}?
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onFechar}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (pedido) onConfirmar(pedido.evento, pedido.novaData)
              onFechar()
            }}
          >
            Mover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

Confirme que `formatarDataExtensa` existe em `@/lib/datas` (`grep -n "formatarDataExtensa"
app/src/lib/datas.ts`); se não existir, use `format(deISO(pedido.novaData), "dd 'de' MMMM")` de
`date-fns` direto no componente, seguindo o import de `ptBR` já configurado em `lib/locale.ts`.

- [ ] **Passo 3: Ligar em `CalendarioPage`**

Em `app/src/pages/calendario/CalendarioPage.tsx`, adicione o estado:

```ts
  const [pedidoConfirmacao, setPedidoConfirmacao] = useState<{
    evento: EventoCalendario
    novaData: string
  } | null>(null)
```

Passe `onPedirConfirmacao={(evento, novaData) => setPedidoConfirmacao({ evento, novaData })}` ao
`<GradeMes>`, e renderize, próximo aos outros diálogos da página:

```tsx
      <DialogConfirmarMoverProva
        pedido={pedidoConfirmacao}
        onFechar={() => setPedidoConfirmacao(null)}
        onConfirmar={(evento, novaData) => void mover(evento, novaData, null, null)}
      />
```

- [ ] **Passo 4: Verificar e conferir na tela**

```bash
cd app && npm run typecheck && npm run lint && npm test
cd app && npm run dev
```

Arraste uma prova na vista de mês. Esperado: o bloco volta pro lugar original imediatamente, um
diálogo pergunta "mover para [data]?", confirmar move de fato (recalcule `CardPressaoPrazos` na
Home), cancelar não muda nada.

- [ ] **Passo 5: Commit**

```bash
git add app/src/features/calendario/componentes/GradeMes.tsx \
  app/src/features/calendario/componentes/DialogConfirmarMoverProva.tsx \
  app/src/pages/calendario/CalendarioPage.tsx
git commit -m "feat(calendario): mover prova pede confirmacao antes de gravar"
```

---

### Tarefa 5: Redimensionar

**Arquivos:** nenhum novo — `aoRedimensionarEvento` já foi escrito na tarefa 3.

**Interfaces:** nada novo.

- [ ] **Passo 1: Conferir que só tipos com hora redimensionam**

`durationEditable` (tarefa 3, Passo 1) já é `false` para `evento.diaInteiro`. Confirme rodando:

```bash
cd app && npm run dev
```

Na vista de horas, tente redimensionar uma sessão de estudo com hora — deve funcionar e só mudar a
duração, não a data. Na vista de mês, prova e marco não devem oferecer a alça de redimensionar
(são sempre dia inteiro).

- [ ] **Passo 2: Teste de carga**

Em `app/src/features/calendario/carga.test.ts`, siga o padrão de helpers já existente (`aula`,
`treino`, `sessaoEstudo`, linhas 9-50) e adicione:

```ts
describe('mover e redimensionar (resolução "arrastar eventos")', () => {
  it('mover um bloco de terça para quinta transfere minutosRotina entre os dois dias', () => {
    const terca = aula('2026-08-04', '08:00', '09:00')
    const quinta = { ...terca, inicio: '2026-08-06T08:00:00', fim: '2026-08-06T09:00:00' }

    const antes = cargaPorDia([terca], SEMANA)
    const depois = cargaPorDia([quinta], SEMANA)

    expect(antes.find((d) => d.data === '2026-08-04')?.minutosRotina).toBe(60)
    expect(depois.find((d) => d.data === '2026-08-04')?.minutosRotina).toBe(0)
    expect(depois.find((d) => d.data === '2026-08-06')?.minutosRotina).toBe(60)
  })

  it('redimensionar altera minutosRotina só do dia do bloco', () => {
    const curto = aula('2026-08-04', '08:00', '09:00')
    const longo = { ...curto, fim: '2026-08-04T10:00:00' }

    const antes = cargaPorDia([curto], SEMANA)
    const depois = cargaPorDia([longo], SEMANA)

    expect(antes.find((d) => d.data === '2026-08-04')?.minutosRotina).toBe(60)
    expect(depois.find((d) => d.data === '2026-08-04')?.minutosRotina).toBe(120)
  })
})
```

Ajuste `SEMANA` e a assinatura de `aula(...)`/`cargaPorDia(...)` conforme o que já está no topo do
arquivo — o objetivo é reaproveitar os helpers existentes, não inventar novos.

- [ ] **Passo 3: Rodar e commitar**

```bash
cd app && npm test -- src/features/calendario/carga.test.ts && npm run typecheck && npm run lint
git add app/src/features/calendario/carga.test.ts
git commit -m "test(calendario): mover e redimensionar bloco recalculam a carga do dia certo"
```

---

### Tarefa 6: Verificação de ponta a ponta

**Arquivos:** nenhum modificado; esta tarefa é verificação.

- [ ] **Passo 1: Suíte inteira**

```bash
cd app && npm test && npm run typecheck && npm run lint
```

- [ ] **Passo 2: As seis telas, sem recarregar**

Com `npm run dev` rodando, arraste um bloco na vista de horas de `/calendario` e, **sem
recarregar a página**, confira em cada uma:

- `/calendario` — Agenda e Faixa de carga (mesma aba, volte pra vista Agenda)
- `CardPressaoPrazos` (card "Prazos" na própria `/calendario` ou na Home)
- `/calendario/historico`
- `/calendario/semana` (Ritual Semanal)
- `/` (Home) — checks do dia e avisos

Esperado: todas mostram o horário/dia novo. Se alguma não mostrar, é bug de invalidação — confira
se o tipo movido realmente cai numa das mutations que já invalida `['calendario']` (tarefa 2) e não
no `throw` do `default`.

- [ ] **Passo 3: Tipos não arrastáveis**

Confirme que conta, sono e o rastro de remarcação na origem não iniciam arrasto — o cursor não
deve mudar para "mover" ao passar sobre eles.

- [ ] **Passo 4: Reversão em erro**

Simule uma falha (ex.: desconecte a rede no DevTools, arraste um evento, reconecte). Esperado: o
bloco volta ao lugar original e aparece um toast de erro — nunca fica "flutuando" no lugar novo com
o banco desatualizado.

- [ ] **Passo 5: Commit final (se algo mudou na verificação)**

Se a verificação não exigiu nenhuma mudança de código, não há o que commitar — esta tarefa é
checagem, não produção.
