# Blocos fixos — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar aos blocos livres do fluxograma ("Trabalho") uma página própria com CRUD completo, e ajustar três pontos vizinhos do Calendário: semana começando no domingo, Sono fora das vistas de Mês e Horas, e o desfazer de cancelamento na Home.

**Architecture:** Nada de banco muda. A camada de dados (`features/fluxograma/api.ts` e `hooks.ts`) já tem CRUD completo e o `DialogFluxogramaLivre` já suporta edição — o trabalho é fiação, uma página nova, um componente de listagem desenhado para o mobile, e três ajustes pontuais em arquivos existentes. Uma única regra de negócio é extraída para função pura e ganha teste.

**Tech Stack:** React 19, TypeScript, Vite, react-router-dom 7, TanStack Query 5, Tailwind 4, shadcn/radix-ui, FullCalendar 6, date-fns 4, vitest 4.

Spec: `docs/superpowers/specs/2026-08-09-blocos-fixos-design.md`

## Global Constraints

- Todos os comandos rodam com `--prefix app` (o `package.json` está em `app/`, não na raiz).
- Código em **português**: identificadores, comentários e mensagens de commit.
- Comentários explicam o **porquê**, nunca o **quê**. Só comente o que não é óbvio pelo código.
- Alvos de toque no mobile: **44px** (`size-11`), voltando a tamanho de mouse a partir de `sm:`. Nunca esconder ação atrás de `hover` sem alternativa no toque.
- Não existe testing-library nem jsdom no projeto. **Não adicionar dependências.** Só lógica pura tem teste automatizado; componentes verificam-se com `typecheck`, `lint` e conferência manual.
- Classes Tailwind precisam ser strings literais estáticas — nunca montar `bg-${variavel}`.
- `npm --prefix app run typecheck` e `npm --prefix app run lint` devem passar limpos ao fim de cada task.
- Trabalhar no branch `feat/blocos-fixos`, já criado.

---

### Task 1: Regra das canceladas de hoje incluindo blocos livres

Extrai para função pura a derivação que hoje vive inline num `useMemo` de 40 linhas em `HomePage`, e corrige o bug: blocos livres cancelados não aparecem, então não há caminho de desfazer.

**Files:**
- Create: `app/src/features/calendario/canceladas.ts`
- Create: `app/src/features/calendario/canceladas.test.ts`
- Modify: `app/src/pages/HomePage.tsx:356-394`

**Interfaces:**
- Consumes: `ExcecaoRecorrencia` de `@/lib/recorrencia` (já existe).
- Produces: `canceladasDeHoje(regras, excecoes, hojeISO)`, tipos `RegraRotulada` e `CanceladaDeHoje`. Nada depois desta task consome.

- [ ] **Step 1: Escrever o teste que falha**

Criar `app/src/features/calendario/canceladas.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { canceladasDeHoje, type RegraRotulada } from './canceladas'
import type { ExcecaoRecorrencia } from '@/lib/recorrencia'

const HOJE = '2026-08-09'

const REGRAS: RegraRotulada[] = [
  { id: 'aula-1', horario_inicio: '08:00:00', rotulo: 'Cálculo II' },
  { id: 'trabalho-1', horario_inicio: '09:00:00', rotulo: 'Escritório' },
]

function cancelamento(
  fluxogramaId: string,
  data: string,
): ExcecaoRecorrencia {
  return { fluxograma_id: fluxogramaId, data, status: 'cancelado' }
}

describe('canceladasDeHoje', () => {
  it('inclui bloco livre cancelado hoje', () => {
    const resultado = canceladasDeHoje(
      REGRAS,
      [cancelamento('trabalho-1', HOJE)],
      HOJE,
    )

    expect(resultado).toEqual([
      {
        fluxogramaId: 'trabalho-1',
        rotulo: 'Escritório',
        horario: '09:00',
        data: HOJE,
      },
    ])
  })

  it('inclui aula cancelada hoje', () => {
    const resultado = canceladasDeHoje(
      REGRAS,
      [cancelamento('aula-1', HOJE)],
      HOJE,
    )

    expect(resultado.map((c) => c.rotulo)).toEqual(['Cálculo II'])
  })

  it('ignora cancelamento de outra data', () => {
    const resultado = canceladasDeHoje(
      REGRAS,
      [cancelamento('trabalho-1', '2026-08-08')],
      HOJE,
    )

    expect(resultado).toEqual([])
  })

  it('ignora remarcação — só cancelamento tem o que desfazer', () => {
    const remarcada: ExcecaoRecorrencia = {
      fluxograma_id: 'trabalho-1',
      data: HOJE,
      status: 'remarcado',
      nova_data: '2026-08-10',
    }

    expect(canceladasDeHoje(REGRAS, [remarcada], HOJE)).toEqual([])
  })

  it('ignora exceção cuja regra não está na lista recebida', () => {
    const resultado = canceladasDeHoje(
      REGRAS,
      [cancelamento('regra-que-nao-veio', HOJE)],
      HOJE,
    )

    expect(resultado).toEqual([])
  })

  it('trunca o horário para HH:MM', () => {
    const resultado = canceladasDeHoje(
      REGRAS,
      [cancelamento('aula-1', HOJE)],
      HOJE,
    )

    expect(resultado[0]?.horario).toBe('08:00')
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm --prefix app run test -- canceladas`
Expected: FAIL — não resolve `./canceladas`.

- [ ] **Step 3: Implementar a função**

Criar `app/src/features/calendario/canceladas.ts`:

```ts
import type { ExcecaoRecorrencia } from '@/lib/recorrencia'

/**
 * Regra de fluxograma já com o nome resolvido.
 *
 * O rótulo entra pronto porque quem sabe traduzir `materia_id` em "Cálculo II"
 * é a página, que tem as queries. Aqui só interessa o par id → nome.
 */
export interface RegraRotulada {
  id: string
  /** `HH:MM:SS` como vem do banco. */
  horario_inicio: string
  rotulo: string
}

export interface CanceladaDeHoje {
  fluxogramaId: string
  rotulo: string
  /** `HH:MM`, já truncado para exibição. */
  horario: string
  data: string
}

/**
 * As ocorrências de hoje que foram canceladas, para continuarem listadas
 * riscadas com opção de desfazer.
 *
 * Sai das exceções e não das ocorrências: a expansão justamente as omite, e sem
 * esta derivação não haveria caminho de volta depois de cancelar por engano.
 *
 * Remarcação não entra: ela não sumiu, mudou de lugar — e aparece na data de
 * destino por conta própria.
 */
export function canceladasDeHoje(
  regras: readonly RegraRotulada[],
  excecoes: readonly ExcecaoRecorrencia[],
  hojeISO: string,
): CanceladaDeHoje[] {
  const porId = new Map(regras.map((regra) => [regra.id, regra]))

  return excecoes.flatMap((excecao) => {
    if (excecao.status !== 'cancelado' || excecao.data !== hojeISO) return []

    const regra = porId.get(excecao.fluxograma_id)
    if (!regra) return []

    return [
      {
        fluxogramaId: excecao.fluxograma_id,
        rotulo: regra.rotulo,
        horario: regra.horario_inicio.slice(0, 5),
        data: excecao.data,
      },
    ]
  })
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm --prefix app run test -- canceladas`
Expected: PASS, 6 testes.

- [ ] **Step 5: Ligar na HomePage**

Em `app/src/pages/HomePage.tsx`, adicionar aos imports existentes:

```ts
import { canceladasDeHoje as derivarCanceladas } from '@/features/calendario/canceladas'
import { useExcecoes, useFluxogramaLivre } from '@/features/fluxograma/hooks'
```

(a linha `import { useExcecoes } from '@/features/fluxograma/hooks'` na linha 35 é substituída pela de cima)

Adicionar a query junto das outras, logo após a linha 125 (`const fluxogramaTreino = useFluxogramaTreino()`):

```ts
const blocosLivres = useFluxogramaLivre()
```

Substituir todo o bloco das linhas 356-394 por:

```ts
  /**
   * Canceladas de hoje, para continuarem listadas riscadas.
   *
   * Blocos livres entram junto: sem eles, cancelar o expediente por engano
   * não tinha caminho de volta.
   */
  const canceladasDeHoje = useMemo(
    () =>
      derivarCanceladas(
        [
          ...(fluxogramaEstudos.data ?? []).map((regra) => ({
            id: regra.id,
            horario_inicio: regra.horario_inicio,
            rotulo:
              (materias.data ?? []).find((m) => m.id === regra.materia_id)
                ?.nome ?? 'Aula',
          })),
          ...(fluxogramaTreino.data ?? []).map((regra) => ({
            id: regra.id,
            horario_inicio: regra.horario_inicio,
            rotulo:
              (treinos.data ?? []).find((t) => t.id === regra.treino_id)
                ?.nome ?? 'Treino',
          })),
          ...(blocosLivres.data ?? []).map((regra) => ({
            id: regra.id,
            horario_inicio: regra.horario_inicio,
            rotulo: regra.rotulo,
          })),
        ],
        listaExcecoes,
        hojeISO,
      ),
    [
      listaExcecoes,
      hojeISO,
      fluxogramaEstudos.data,
      fluxogramaTreino.data,
      blocosLivres.data,
      materias.data,
      treinos.data,
    ],
  )
```

- [ ] **Step 6: Verificar**

Run: `npm --prefix app run typecheck` — Expected: sem erros.
Run: `npm --prefix app run lint` — Expected: sem erros.
Run: `npm --prefix app run test` — Expected: toda a suíte passa.

- [ ] **Step 7: Commit**

```bash
git add app/src/features/calendario/canceladas.ts app/src/features/calendario/canceladas.test.ts app/src/pages/HomePage.tsx
git commit -m "fix(home): bloco de trabalho cancelado nao tinha como desfazer"
```

---

### Task 2: Semana começando no domingo no Calendário

**Files:**
- Modify: `app/src/lib/datas.ts` (adicionar função)
- Modify: `app/src/features/calendario/componentes/GradeMes.tsx:151`
- Modify: `app/src/pages/calendario/CalendarioPage.tsx:29,95,244`

**Interfaces:**
- Produces: `inicioSemanaCalendario(data: Date): Date` em `@/lib/datas`. Consumida só pela `CalendarioPage`.

- [ ] **Step 1: Adicionar a função em `lib/datas.ts`**

Logo abaixo de `inicioSemana` (que termina na linha 48), adicionar:

```ts
/**
 * Domingo da semana de `data` — a semana **de exibição** do Calendário.
 *
 * Deliberadamente diferente de `inicioSemana`, logo acima: aquela é a chave de
 * `planejamento_semanal_financeiro` e continua na segunda. Alinhar as duas
 * exigiria migrar as linhas já gravadas, que estão chaveadas em segundas —
 * está previsto, mas em outro spec.
 */
export function inicioSemanaCalendario(data: Date): Date {
  return startOfWeek(data, { weekStartsOn: 0 })
}
```

- [ ] **Step 2: Trocar o `firstDay` do FullCalendar**

Em `app/src/features/calendario/componentes/GradeMes.tsx`, linha 151:

```tsx
          firstDay={0}
```

Isso cobre as duas vistas de uma vez: "Mês" monta este componente como `dayGridMonth` e "Horas" como `timeGridWeek`.

- [ ] **Step 3: Alinhar a vista de agenda**

Em `app/src/pages/calendario/CalendarioPage.tsx`, linha 29, trocar o import:

```ts
import { deISO, inicioSemanaCalendario, paraISO } from '@/lib/datas'
```

Linha 94-95:

```ts
  /** Domingo da semana visível na agenda. */
  const [ancora, setAncora] = useState(() => inicioSemanaCalendario(hoje))
```

Linha 244, dentro de `irParaHoje`:

```ts
    setAncora(inicioSemanaCalendario(hoje))
```

- [ ] **Step 4: Verificar**

Run: `npm --prefix app run typecheck` — Expected: sem erros.
Run: `npm --prefix app run lint` — Expected: sem erros.
Run: `npm --prefix app run test` — Expected: toda a suíte passa. Nenhum teste depende do início da semana do Calendário; se algum quebrar, é sinal de acoplamento não previsto — investigar antes de seguir.

Conferir no app (`npm --prefix app run dev`), em `/calendario`:
- vista **Semana**: a primeira coluna/dia é domingo
- vista **Mês**: a primeira coluna da grade é domingo
- vista **Horas**: idem (no desktop; no mobile são 3 dias a partir de hoje, por desenho)
- `/financeiro` → planejamento semanal continua abrindo na **segunda**, com os valores já gravados visíveis

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/datas.ts app/src/features/calendario/componentes/GradeMes.tsx app/src/pages/calendario/CalendarioPage.tsx
git commit -m "feat(calendario): semana comeca no domingo nas tres vistas"
```

---

### Task 3: Sono fora das vistas de Mês e Horas

**Files:**
- Modify: `app/src/features/calendario/componentes/GradeMes.tsx:78-97`
- Modify: `app/src/pages/calendario/CalendarioPage.tsx:256,297-310`

- [ ] **Step 1: Filtrar o Sono na grade**

Em `app/src/features/calendario/componentes/GradeMes.tsx`, substituir o bloco das linhas 78-97 por:

```tsx
  /*
   * Sono fica de fora destas vistas. Ele é contexto de fundo, não compromisso,
   * e numa grade de mês ou de horas rouba a leitura dos que são. Segue na
   * agenda, e o cálculo de tempo livre das células não usa estes eventos —
   * vem de `planejamentoSono` (carga.ts).
   */
  const eventosFullCalendar = eventos
    .filter((evento) => evento.camada !== 'sono')
    .map((evento) => {
      const cor = COR_CAMADA[evento.camada]
      const prazo = ehImportante(evento)

      return {
        id: evento.id,
        title: evento.titulo,
        start: evento.inicio,
        ...(evento.fim ? { end: evento.fim } : {}),
        allDay: evento.diaInteiro,
        // Prazo preenche; rotina fica só com a borda e o texto na cor do tema
        backgroundColor: prazo ? cor : 'transparent',
        borderColor: cor,
        textColor: prazo ? '#ffffff' : 'var(--foreground)',
        classNames: evento.rota ? ['evento-clicavel'] : [],
      }
    })
```

- [ ] **Step 2: Tirar o Sono do menu de camadas nessas vistas**

Em `app/src/pages/calendario/CalendarioPage.tsx`, substituir a linha 256 (`const escondidas = CAMADAS.length - visiveis.size`) por:

```ts
  /*
   * Sono não é desenhado nas vistas de Mês e Horas, então listar o toggle dele
   * ali seria um controle que não faz nada — o mesmo defeito do toggle
   * duplicado corrigido em 63f3544.
   */
  const camadasDoMenu = useMemo(
    () => (vista === 'agenda' ? CAMADAS : CAMADAS.filter((c) => c !== 'sono')),
    [vista],
  )

  const escondidas = camadasDoMenu.filter(
    (camada) => !visiveis.has(camada),
  ).length
```

E na linha 297, trocar `{CAMADAS.map((camada) => (` por:

```tsx
                {camadasDoMenu.map((camada) => (
```

- [ ] **Step 3: Verificar**

Run: `npm --prefix app run typecheck` — Expected: sem erros.
Run: `npm --prefix app run lint` — Expected: sem erros. `useMediaQuery` continua em uso em `GradeMes` (`telaEstreita` alimenta `vistaEfetiva` e `dayMaxEvents`) — não remover.
Run: `npm --prefix app run test` — Expected: toda a suíte passa.

Conferir no app, em `/calendario`:
- vistas **Mês** e **Horas**: nenhuma faixa de sono; o menu Camadas não lista "Sono"; o contador `−N` bate com o número de camadas realmente desmarcadas
- vista **Semana**: o sono continua aparecendo e "Sono" volta ao menu
- o tempo livre nas células do mês (ex.: `6h30`) continua igual ao de antes da mudança

- [ ] **Step 4: Commit**

```bash
git add app/src/features/calendario/componentes/GradeMes.tsx app/src/pages/calendario/CalendarioPage.tsx
git commit -m "feat(calendario): sono sai das vistas de mes e horas"
```

---

### Task 4: Componente `ListaBlocosFixos`

Listagem dos blocos livres com editar e excluir, desenhada para o mobile. **Não estende `GradeFluxograma`**: aquele é compartilhado com Estudos e Treino, e o que esta tela precisa no celular é o oposto do que ele faz (ele empilha os sete dias, inclusive os vazios).

**Files:**
- Create: `app/src/features/fluxograma/componentes/ListaBlocosFixos.tsx`

**Interfaces:**
- Consumes: `FluxogramaLivre` de `../api`, `DialogFluxogramaLivre` de `./DialogFluxogramaLivre`.
- Produces: `<ListaBlocosFixos itens={...} onExcluir={(id) => void} excluindo={boolean} />`. Consumida pela Task 5.

- [ ] **Step 1: Criar o componente**

Criar `app/src/features/fluxograma/componentes/ListaBlocosFixos.tsx`:

```tsx
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { DIAS_SEMANA } from '@/lib/constants'
import { DialogFluxogramaLivre } from './DialogFluxogramaLivre'
import type { FluxogramaLivre } from '../api'

/** Ordem de exibição: segunda a domingo, apesar de `dia_semana` usar 0 = domingo. */
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0] as const

/** `08:00:00` → `08:00` */
function hora(valor: string): string {
  return valor.slice(0, 5)
}

function minutosDe(valor: string): number {
  const [horas = '0', minutos = '0'] = valor.split(':')
  return Number(horas) * 60 + Number(minutos)
}

/** `09:00`–`18:00` → `9h`; `09:00`–`11:30` → `2h30`. */
function duracao(inicio: string, fim: string): string {
  const total = minutosDe(fim) - minutosDe(inicio)
  const horas = Math.floor(total / 60)
  const resto = total % 60
  if (horas === 0) return `${resto}min`
  return resto === 0 ? `${horas}h` : `${horas}h${String(resto).padStart(2, '0')}`
}

function agruparPorDia(
  itens: readonly FluxogramaLivre[],
): Map<number, FluxogramaLivre[]> {
  const porDia = new Map<number, FluxogramaLivre[]>()
  for (const item of itens) {
    const lista = porDia.get(item.dia_semana)
    if (lista) lista.push(item)
    else porDia.set(item.dia_semana, [item])
  }
  for (const lista of porDia.values()) {
    lista.sort((a, b) => a.horario_inicio.localeCompare(b.horario_inicio))
  }
  return porDia
}

interface LinhaBlocoProps {
  item: FluxogramaLivre
  onExcluir: (id: string) => void
  excluindo: boolean
  /** No mobile as ações ficam sempre visíveis; no desktop, no hover. */
  acoesSempreVisiveis: boolean
}

function LinhaBloco({
  item,
  onExcluir,
  excluindo,
  acoesSempreVisiveis,
}: LinhaBlocoProps) {
  return (
    <li className="border-border bg-card group flex items-center gap-2 rounded-md border px-2 py-1.5">
      <span aria-hidden className="bg-trabalho mt-0.5 size-1.5 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs">{item.rotulo}</p>
        <p className="text-muted-foreground text-[11px] tabular-nums">
          {hora(item.horario_inicio)}–{hora(item.horario_fim)} ·{' '}
          {duracao(item.horario_inicio, item.horario_fim)}
        </p>
      </div>
      <div
        className={
          acoesSempreVisiveis
            ? 'flex shrink-0 items-center'
            : 'flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'
        }
      >
        <DialogFluxogramaLivre bloco={item} />
        <DialogConfirmarExclusao
          titulo={`Remover ${item.rotulo}`}
          mensagem={`${item.rotulo}, ${hora(item.horario_inicio)}–${hora(item.horario_fim)}, sai da rotina fixa da semana.`}
          onConfirmar={() => onExcluir(item.id)}
          pendente={excluindo}
          classeTrigger={
            acoesSempreVisiveis
              ? 'text-muted-foreground hover:text-status-risco size-11 shrink-0'
              : 'text-muted-foreground hover:text-status-risco size-7 shrink-0'
          }
        />
      </div>
    </li>
  )
}

interface ListaBlocosFixosProps {
  itens: readonly FluxogramaLivre[]
  onExcluir: (id: string) => void
  excluindo?: boolean
}

/**
 * Blocos fixos da semana, em duas formas.
 *
 * No celular, **só os dias que têm bloco**: a grade de sete colunas do
 * `GradeFluxograma` vira uma coluna única no mobile e renderiza os sete dias
 * com cabeçalho, inclusive os vazios — três blocos ocupavam uma tela inteira de
 * rolagem para mostrar três linhas. A partir de `sm:` a grade volta, porque aí
 * as colunas cabem lado a lado e o dia vazio custa nada.
 */
export function ListaBlocosFixos({
  itens,
  onExcluir,
  excluindo = false,
}: ListaBlocosFixosProps) {
  const porDia = agruparPorDia(itens)
  const diasComBloco = ORDEM_DIAS.filter((dia) => porDia.has(dia))

  return (
    <>
      {/* Mobile: só os dias povoados */}
      <div className="space-y-4 sm:hidden">
        {diasComBloco.map((dia) => (
          <div key={dia} className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">
              {DIAS_SEMANA[dia]}
            </p>
            <ul className="space-y-1">
              {(porDia.get(dia) ?? []).map((item) => (
                <LinhaBloco
                  key={item.id}
                  item={item}
                  onExcluir={onExcluir}
                  excluindo={excluindo}
                  acoesSempreVisiveis
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Desktop: a semana inteira, dias vazios incluídos */}
      <div className="hidden gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        {ORDEM_DIAS.map((dia) => {
          const doDia = porDia.get(dia) ?? []
          return (
            <div key={dia} className="space-y-1.5">
              <p className="text-muted-foreground text-xs font-medium">
                {DIAS_SEMANA[dia]}
              </p>
              {doDia.length === 0 ? (
                <p className="text-muted-foreground/60 text-xs">—</p>
              ) : (
                <ul className="space-y-1">
                  {doDia.map((item) => (
                    <LinhaBloco
                      key={item.id}
                      item={item}
                      onExcluir={onExcluir}
                      excluindo={excluindo}
                      acoesSempreVisiveis={false}
                    />
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verificar**

Run: `npm --prefix app run typecheck` — Expected: sem erros. O componente ainda não é usado por ninguém; isso é esperado nesta task.
Run: `npm --prefix app run lint` — Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/fluxograma/componentes/ListaBlocosFixos.tsx
git commit -m "feat(fluxograma): componente de lista dos blocos fixos"
```

---

### Task 5: Página `/calendario/blocos`

**Files:**
- Create: `app/src/pages/calendario/BlocosPage.tsx`
- Modify: `app/src/App.tsx:38,72`
- Modify: `app/src/lib/pilares.ts:1-13,108-142`

**Interfaces:**
- Consumes: `ListaBlocosFixos` da Task 4.
- Produces: rota `/calendario/blocos`; entrada `blocos-fixos` em `SUBPAGINAS`.

- [ ] **Step 1: Criar a página**

Criar `app/src/pages/calendario/BlocosPage.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { ArrowLeft, Briefcase } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EstadoVazio } from '@/components/EstadoVazio'
import { SkeletonPagina } from '@/components/Skeletons'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DialogFluxogramaLivre } from '@/features/fluxograma/componentes/DialogFluxogramaLivre'
import { ListaBlocosFixos } from '@/features/fluxograma/componentes/ListaBlocosFixos'
import {
  useExcluirFluxogramaLivre,
  useFluxogramaLivre,
} from '@/features/fluxograma/hooks'

/**
 * Configuração dos blocos fixos sem pilar próprio — trabalho, sobretudo.
 *
 * Existia como um card no rodapé do Calendário, depois da agenda, da faixa de
 * carga e dos avisos: para chegar nele era preciso rolar a página mais pesada
 * do app inteiro, e ele não aparecia na navegação nem na paleta de comandos.
 * Como sub-página ele entra em `SUBPAGINAS` e passa a ser alcançável por busca.
 */
export default function BlocosPage() {
  const blocos = useFluxogramaLivre()
  const excluir = useExcluirFluxogramaLivre()

  const lista = blocos.data ?? []

  return (
    <>
      <PageHeader
        titulo="Blocos fixos"
        descricao="Trabalho e outros compromissos recorrentes que não pertencem a um pilar."
        pilar="sono"
        icone={Briefcase}
        acoes={
          <div className="flex items-center gap-1">
            <DialogFluxogramaLivre />
            <Button asChild variant="ghost" size="sm">
              <Link to="/calendario">
                <ArrowLeft className="size-4" />
                Calendário
              </Link>
            </Button>
          </div>
        }
      />

      {blocos.isPending ? (
        <SkeletonPagina variante="grade" />
      ) : blocos.isError ? (
        <Card className="border-status-risco/40">
          <CardContent className="text-status-risco text-sm">
            Erro ao carregar: {blocos.error.message}
          </CardContent>
        </Card>
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={Briefcase}
          classeCor="text-trabalho"
          classeFundo="bg-trabalho-soft"
          titulo="Nenhum bloco fixo"
          descricao="Um bloco é um compromisso que se repete toda semana no mesmo horário — o expediente, um curso, um voluntariado. Ele entra no calendário e conta na carga do dia."
          acao={<DialogFluxogramaLivre />}
        />
      ) : (
        <div className="surgir-grupo">
          <Card>
            <CardContent>
              <ListaBlocosFixos
                itens={lista}
                onExcluir={(id) => excluir.mutate(id)}
                excluindo={excluir.isPending}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Registrar a rota**

Em `app/src/App.tsx`, depois da linha 38 (`const HistoricoPage = ...`):

```ts
const BlocosPage = lazy(() => import('@/pages/calendario/BlocosPage'))
```

E depois da linha 72 (`<Route path="calendario/historico" ... />`):

```tsx
        <Route path="calendario/blocos" element={<BlocosPage />} />
```

- [ ] **Step 3: Registrar na paleta de comandos**

Em `app/src/lib/pilares.ts`, adicionar `Briefcase` à lista de ícones importados de `lucide-react` (linhas 1-13, em ordem alfabética — fica logo depois de `import {`, antes de `CalendarCheck`).

E adicionar como último item de `SUBPAGINAS` (depois do item `historico`, que fecha na linha 141):

```ts
  {
    id: 'blocos-fixos',
    nome: 'Blocos fixos',
    termos: 'trabalho blocos fixos expediente rotina horário semanal recorrente',
    rota: '/calendario/blocos',
    icone: Briefcase,
    classeTexto: 'text-trabalho',
  },
```

- [ ] **Step 4: Verificar**

Run: `npm --prefix app run typecheck` — Expected: sem erros.
Run: `npm --prefix app run lint` — Expected: sem erros.
Run: `npm --prefix app run test` — Expected: toda a suíte passa.

Conferir no app:
- `/calendario/blocos` abre e lista os blocos existentes
- o lápis abre o dialog **preenchido**; salvar altera o bloco (e não cria um segundo)
- a lixeira pede confirmação e remove
- criar um bloco pelo botão do cabeçalho funciona
- com zero blocos, aparece o estado vazio com o botão de criar
- `Ctrl/Cmd+K` → buscar "trabalho" → o item "Blocos fixos" aparece e navega
- no celular (DevTools ~390px): só os dias com bloco aparecem; lápis e lixeira têm 44px e estão sempre visíveis
- alterar um bloco e voltar para `/calendario`: a agenda reflete a mudança (o `RAIZES_AFETADAS` do hook já invalida `['calendario']`)

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/calendario/BlocosPage.tsx app/src/App.tsx app/src/lib/pilares.ts
git commit -m "feat(calendario): pagina propria para os blocos fixos"
```

---

### Task 6: Tirar o card do Calendário e agrupar a navegação no mobile

**Files:**
- Modify: `app/src/pages/calendario/CalendarioPage.tsx:1-55,265-334,525-537`

- [ ] **Step 1: Remover o card do rodapé**

Em `app/src/pages/calendario/CalendarioPage.tsx`, apagar o bloco inteiro das linhas 525-537 — o `<Card>` … `</Card>` que contém o texto "Trabalho e outros blocos".

Ele é o último filho do `<div className="surgir-grupo mt-4 space-y-4">` aberto na linha 454, **depois** do ternário `vista === 'agenda' ? … : …` que fecha na 452. É a remoção de um irmão: nenhuma tag de fechamento acompanha, e o `</div>` da linha 538 continua fechando o `div` da 454.

- [ ] **Step 2: Remover o que ficou órfão**

Apagar as linhas 130-131:

```ts
  const blocosLivres = useFluxogramaLivre()
  const excluirBlocoLivre = useExcluirFluxogramaLivre()
```

Apagar os imports das linhas 50-55:

```ts
import { GradeFluxograma } from '@/components/GradeFluxograma'
import { DialogFluxogramaLivre } from '@/features/fluxograma/componentes/DialogFluxogramaLivre'
import {
  useExcluirFluxogramaLivre,
  useFluxogramaLivre,
} from '@/features/fluxograma/hooks'
```

- [ ] **Step 3: Agrupar os três links num menu no mobile**

Adicionar `Briefcase` à lista de ícones de `lucide-react` (linhas 4-11), e `DropdownMenuItem` ao import de dropdown-menu (linhas 22-28).

Substituir os dois botões de Ritual e Histórico (linhas 271-282) por:

```tsx
            {/*
              No celular os três links viram um menu só. Com quatro ações o
              cabeçalho já tinha estourado a largura da tela — foi o motivo de
              os rótulos sumirem no mobile — e "Blocos fixos" seria a quinta.
              De `sm:` para cima sobra espaço e eles voltam a ser botões.
            */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="sm:hidden"
                  aria-label="Ir para"
                >
                  <CalendarCheck className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/calendario/semana">
                    <CalendarCheck className="size-4" />
                    Ritual de domingo
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/calendario/historico">
                    <History className="size-4" />
                    Histórico
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/calendario/blocos">
                    <Briefcase className="size-4" />
                    Blocos fixos
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              asChild
              variant="secondary"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link to="/calendario/semana">
                <CalendarCheck className="size-4" />
                Ritual de domingo
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link to="/calendario/historico">
                <History className="size-4" />
                Histórico
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link to="/calendario/blocos">
                <Briefcase className="size-4" />
                Blocos fixos
              </Link>
            </Button>
```

O comentário das linhas 267-270, que explicava o `hidden sm:inline` dos rótulos, deixa de valer para estes botões — substituí-lo pelo comentário acima.

- [ ] **Step 4: Verificar**

Run: `npm --prefix app run typecheck` — Expected: sem erros. Se acusar import não usado, é sinal de que sobrou algo do Step 2.
Run: `npm --prefix app run lint` — Expected: sem erros.
Run: `npm --prefix app run test` — Expected: toda a suíte passa.

Conferir no app, em `/calendario`:
- o card "Trabalho e outros blocos" não existe mais no rodapé
- os blocos de trabalho **continuam aparecendo** na agenda e na grade, com a cor de trabalho
- no desktop: três botões no cabeçalho, todos navegando
- no celular (~390px): um botão de menu; abrindo, os três destinos; o cabeçalho não estoura nem corta botão
- a página continua rolando sem barra horizontal

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/calendario/CalendarioPage.tsx
git commit -m "refactor(calendario): move blocos fixos para pagina propria"
```

---

## Verificação final

- [ ] **Rodar a suíte inteira e o build**

Run: `npm --prefix app run test` — Expected: todos passam.
Run: `npm --prefix app run typecheck` — Expected: sem erros.
Run: `npm --prefix app run lint` — Expected: sem erros.
Run: `npm --prefix app run build` — Expected: build conclui.

- [ ] **Conferir o que o spec prometeu não quebrar**

- `/financeiro` → planejamento semanal continua na segunda, com os valores gravados visíveis
- `/calendario/semana` (Ritual) continua planejando a próxima semana ancorada na segunda
- `/treino` → frequência da semana inalterada
- Home → blocos de trabalho de hoje aparecem; cancelar um e conferir que ele volta riscado com opção de desfazer
- tempo livre nas células da vista de Mês igual ao de antes
