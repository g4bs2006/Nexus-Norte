# Semana começando no domingo — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIO: use `superpowers:subagent-driven-development`
> (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa a tarefa.
> Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Spec:** `docs/superpowers/specs/2026-08-11-semana-domingo-design.md`

**Objetivo:** fazer a semana começar no domingo no sistema inteiro — ordem de exibição,
fronteira de cálculo e a chave do planejamento financeiro no banco.

**Arquitetura:** a semana passa a ser definida em dois lugares e só dois: a constante
`ORDEM_DIAS_SEMANA` em `lib/fluxograma.ts` (ordem de exibição) e a função `inicioSemana` em
`lib/datas.ts` (fronteira de cálculo). Todo o resto consome. Uma migration reancora as linhas
já gravadas de `planejamento_semanal_financeiro`, única tabela chaveada por semana.

**Stack:** React 19 + TypeScript + Vite, date-fns, Tailwind v4, shadcn/ui, Supabase
(Postgres), Vitest.

## Restrições globais

- **Idioma:** identificadores, comentários e mensagens de commit em **português**.
  Comentários explicam o *porquê*, nunca o *quê*.
- **Diretório de trabalho:** todos os comandos `npm` rodam em `app/`.
- **Mobile é restrição de desenho, não ajuste posterior.** Alvo de toque de 44px (`size-11`)
  até `sm:`; nunca esconder ação atrás de `hover` sem alternativa no toque.
- **Nunca ajustar um teste para ele passar** sem entender por que quebrou. Se um teste fora
  do escopo deste plano quebrar, pare e investigue.
- **Comandos de verificação** (sempre em `app/`):
  - `npm test` — Vitest, suíte inteira
  - `npm run typecheck` — `tsc -b --noEmit`
  - `npm run lint` — oxlint
- **`dia_semana` segue `Date.getDay()`**: 0 = domingo … 6 = sábado. Isso **não muda** neste
  plano. O que muda é a ordem em que os dias são exibidos e onde a semana começa.

---

## Estrutura de arquivos

**Modificados — definição da semana (o núcleo):**
- `app/src/lib/fluxograma.ts` — `ORDEM_DIAS_SEMANA` vira `[0..6]`
- `app/src/lib/datas.ts` — `inicioSemana` vira domingo; `inicioSemanaCalendario` é apagada
- `app/src/lib/locale.ts` — default do date-fns vira domingo

**Modificados — consumidores que tinham cópia própria:**
- `app/src/pages/calendario/RitualSemanalPage.tsx`
- `app/src/features/sono/componentes/DialogSono.tsx`
- `app/src/features/treino/componentes/DialogFluxogramaTreino.tsx`
- `app/src/features/estudos/componentes/DialogFluxograma.tsx`
- `app/src/features/financeiro/componentes/GradePlanejamentoSemanal.tsx`
- `app/src/features/financeiro/periodos.ts`
- `app/src/pages/calendario/CalendarioPage.tsx`
- `app/src/pages/financeiro/FinanceiroPage.tsx`

**Criados:**
- `app/supabase/migrations/20260811000001_semana_comeca_no_domingo.sql`
- `app/src/lib/datas.test.ts`
- `app/src/features/financeiro/periodos.test.ts`

**Modificado — teste existente:**
- `app/src/features/metas/calculos.test.ts`

---

## Ordem das tarefas e por quê

1. Ordem de exibição (isolada, sem efeito de cálculo)
2. Fronteira da semana (cliente)
3. Migration (banco)
4. Ritual na semana atual
5. Dias passados esmaecidos
6. Rolagem até hoje no mobile
7. Verificação de ponta a ponta e deploy

A tarefa 1 vem antes da 2 porque é a única que pode ser revisada sem pensar em datas. A 3 vem
depois da 2 para que a mudança de cliente e a de banco estejam adjacentes no histórico — mas
**no deploy a ordem inverte**, e a tarefa 7 trata disso.

---

### Tarefa 1: Ordem de exibição numa constante só

**Arquivos:**
- Modificar: `app/src/lib/fluxograma.ts:10-11`
- Modificar: `app/src/pages/calendario/RitualSemanalPage.tsx:40`
- Modificar: `app/src/features/sono/componentes/DialogSono.tsx:34`
- Modificar: `app/src/features/treino/componentes/DialogFluxogramaTreino.tsx:26`
- Modificar: `app/src/features/estudos/componentes/DialogFluxograma.tsx:41`
- Modificar: `app/src/features/financeiro/componentes/GradePlanejamentoSemanal.tsx:18-23`
- Teste: `app/src/lib/fluxograma.test.ts`

**Interfaces:**
- Produz: `ORDEM_DIAS_SEMANA: readonly [0, 1, 2, 3, 4, 5, 6]` exportada de `@/lib/fluxograma`.
  As tarefas 5 e 6 dependem de o índice do dia na constante ser igual ao próprio
  `dia_semana` — verdade só depois desta tarefa.

- [ ] **Passo 1: Escrever o teste que falha**

Adicione ao **topo** do bloco de `describe` em `app/src/lib/fluxograma.test.ts`, e inclua
`ORDEM_DIAS_SEMANA` no import da linha 2:

```ts
describe('ORDEM_DIAS_SEMANA', () => {
  it('começa no domingo e termina no sábado', () => {
    expect(ORDEM_DIAS_SEMANA).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  // Garante o que as grades assumem: a coluna de índice N é o dia_semana N.
  // Sem isso, derivar a data de uma coluna como `inicio + indice` erra.
  it('o índice de cada dia é o próprio dia_semana', () => {
    ORDEM_DIAS_SEMANA.forEach((dia, indice) => {
      expect(dia).toBe(indice)
    })
  })
})
```

- [ ] **Passo 2: Rodar e ver falhar**

```bash
cd app && npm test -- src/lib/fluxograma.test.ts
```

Esperado: FALHA. A primeira asserção recebe `[1, 2, 3, 4, 5, 6, 0]`.

- [ ] **Passo 3: Virar a constante**

Em `app/src/lib/fluxograma.ts`, substitua a linha 10 (comentário) e a 11 por:

```ts
/**
 * Ordem de exibição das grades semanais: domingo a sábado, igual ao valor de
 * `dia_semana` — o índice na lista é o próprio dia.
 *
 * Nasceu como `[1,2,3,4,5,6,0]` no spec dos blocos fixos, com o argumento de
 * que o fluxograma é configuração de rotina e não visualização de calendário.
 * O spec 2 revogou isso: as duas ordens se encontram dentro de
 * `GradePlanejamentoSemanal`, que é grade de rotina e de calendário ao mesmo
 * tempo. Duas ordens convivendo custam mais do que o argumento vale.
 */
export const ORDEM_DIAS_SEMANA = [0, 1, 2, 3, 4, 5, 6] as const
```

- [ ] **Passo 4: Rodar e ver passar**

```bash
cd app && npm test -- src/lib/fluxograma.test.ts
```

Esperado: PASSA.

- [ ] **Passo 5: Apagar as cinco cópias locais**

Em cada arquivo abaixo, **apague** a linha `const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0] as const`
e adicione o import. Não renomeie os usos — em vez disso, importe com o nome curto para o
diff ficar mínimo:

```ts
import { ORDEM_DIAS_SEMANA as ORDEM_DIAS } from '@/lib/fluxograma'
```

- `app/src/pages/calendario/RitualSemanalPage.tsx` — apagar a linha 40, adicionar o import
  junto dos outros de `@/lib/*`
- `app/src/features/sono/componentes/DialogSono.tsx` — apagar a linha 34
- `app/src/features/treino/componentes/DialogFluxogramaTreino.tsx` — apagar a linha 26
- `app/src/features/estudos/componentes/DialogFluxograma.tsx` — apagar a linha 41

Em `app/src/features/financeiro/componentes/GradePlanejamentoSemanal.tsx`, apague o bloco de
comentário das linhas 18-22 **e** a linha 23, e adicione o import. O comentário antigo afirma
que "`semana_inicio` é sempre a segunda-feira" — vira falso na tarefa 3, então some junto.

- [ ] **Passo 6: Verificar**

```bash
cd app && npm run typecheck && npm run lint && npm test
```

Esperado: os três passam. Nenhum `const ORDEM_DIAS =` deve restar:

```bash
cd app && grep -rn "const ORDEM_DIAS" src/
```

Esperado: nenhuma saída.

- [ ] **Passo 7: Commit**

```bash
git add app/src/lib/fluxograma.ts app/src/lib/fluxograma.test.ts \
  app/src/pages/calendario/RitualSemanalPage.tsx \
  app/src/features/sono/componentes/DialogSono.tsx \
  app/src/features/treino/componentes/DialogFluxogramaTreino.tsx \
  app/src/features/estudos/componentes/DialogFluxograma.tsx \
  app/src/features/financeiro/componentes/GradePlanejamentoSemanal.tsx
git commit -m "refactor(semana): ordem de exibicao vira domingo-primeiro numa constante so"
```

---

### Tarefa 2: Fronteira da semana num helper só

**Arquivos:**
- Modificar: `app/src/lib/datas.ts:45-60`
- Modificar: `app/src/lib/locale.ts:4-14`
- Modificar: `app/src/features/financeiro/periodos.ts:1-8, 51`
- Modificar: `app/src/pages/calendario/CalendarioPage.tsx:31, 91, 244`
- Criar: `app/src/lib/datas.test.ts`
- Criar: `app/src/features/financeiro/periodos.test.ts`
- Modificar: `app/src/features/metas/calculos.test.ts:5, 42-52`

**Interfaces:**
- Consome: nada da tarefa 1.
- Produz: `inicioSemana(data: Date): Date` devolvendo o **domingo** da semana de `data`.
  `inicioSemanaCalendario` deixa de existir. As tarefas 4, 5 e 6 dependem disso.

- [ ] **Passo 1: Escrever o teste que falha (datas)**

Crie `app/src/lib/datas.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { inicioSemana, paraISO } from './datas'

/**
 * Datas fixas de 2026-08: 02 é domingo, 05 quarta, 08 sábado, 09 domingo.
 * Construídas com `new Date(ano, mês, dia)` — o mês é 0-indexado — porque
 * `new Date('2026-08-05')` seria interpretado como UTC e cairia no dia 4 no
 * fuso do Brasil.
 */
describe('inicioSemana', () => {
  it('volta para o domingo anterior a partir de uma quarta', () => {
    expect(paraISO(inicioSemana(new Date(2026, 7, 5)))).toBe('2026-08-02')
  })

  it('devolve o próprio dia quando recebe um domingo', () => {
    expect(paraISO(inicioSemana(new Date(2026, 7, 2)))).toBe('2026-08-02')
  })

  it('volta seis dias a partir de um sábado', () => {
    expect(paraISO(inicioSemana(new Date(2026, 7, 8)))).toBe('2026-08-02')
  })

  it('o domingo seguinte já abre a semana seguinte', () => {
    expect(paraISO(inicioSemana(new Date(2026, 7, 9)))).toBe('2026-08-09')
  })
})
```

- [ ] **Passo 2: Escrever o teste que falha (períodos)**

Crie `app/src/features/financeiro/periodos.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { intervaloDoPreset } from './periodos'

/** 2026-08-05 é uma quarta; a semana (dom-sáb) vai de 08-02 a 08-08. */
const HOJE = new Date(2026, 7, 5)

describe('intervaloDoPreset', () => {
  it('"semana" vai de domingo a sábado', () => {
    expect(intervaloDoPreset('semana', HOJE)).toEqual({
      de: '2026-08-02',
      ate: '2026-08-08',
    })
  })

  it('"hoje" devolve o mesmo dia nos dois lados', () => {
    expect(intervaloDoPreset('hoje', HOJE)).toEqual({
      de: '2026-08-05',
      ate: '2026-08-05',
    })
  })
})
```

- [ ] **Passo 3: Rodar e ver falhar**

```bash
cd app && npm test -- src/lib/datas.test.ts src/features/financeiro/periodos.test.ts
```

Esperado: FALHA nos dois. `inicioSemana` devolve `2026-08-03` (segunda) e o preset devolve
`{ de: '2026-08-03', ate: '2026-08-09' }`.

- [ ] **Passo 4: Virar `inicioSemana` e apagar `inicioSemanaCalendario`**

Em `app/src/lib/datas.ts`, substitua **todo** o bloco das linhas 45 a 60 por:

```ts
/**
 * Domingo da semana de `data` — a semana do sistema inteiro.
 *
 * `weekStartsOn` fica explícito de propósito, apesar de `lib/locale.ts` já
 * definir o mesmo default: o comentário de lá registra que um default
 * implícito já desalinhou o cálculo antes. A redundância é o para-raios.
 */
export function inicioSemana(data: Date): Date {
  return startOfWeek(data, { weekStartsOn: 0 })
}
```

Isso apaga `inicioSemanaCalendario`, que virou idêntica.

- [ ] **Passo 5: Trocar os call-sites de `inicioSemanaCalendario`**

Em `app/src/pages/calendario/CalendarioPage.tsx`:
- linha 31: `import { deISO, inicioSemanaCalendario, paraISO } from '@/lib/datas'` vira
  `import { deISO, inicioSemana, paraISO } from '@/lib/datas'`
- linha 91: `useState(() => inicioSemanaCalendario(hoje))` vira `useState(() => inicioSemana(hoje))`
- linha 244: `setAncora(inicioSemanaCalendario(hoje))` vira `setAncora(inicioSemana(hoje))`

- [ ] **Passo 6: Fazer `periodos.ts` usar o helper**

Em `app/src/features/financeiro/periodos.ts`:
- linha 51: `const inicio = startOfWeek(hoje, { weekStartsOn: 1 })` vira
  `const inicio = inicioSemana(hoje)`
- linha 8: `import { paraISO } from '@/lib/datas'` vira
  `import { inicioSemana, paraISO } from '@/lib/datas'`
- remova `startOfWeek` do import de `date-fns` (linha 5) — deixa de ser usado

- [ ] **Passo 7: Virar o default do locale**

Em `app/src/lib/locale.ts`, substitua o bloco de comentário (linhas 4-13) e a linha 14 por:

```ts
/**
 * Define pt-BR como locale padrão do date-fns e domingo como início da semana.
 *
 * Sem isso, todo `format()` com nome de dia ou mês sairia em inglês, e
 * `startOfWeek` sem argumento cairia num default que pode divergir de
 * `lib/datas.ts` — foi o que aconteceu enquanto a semana começava na segunda.
 *
 * Importado uma única vez em `main.tsx`, antes de qualquer render.
 */
setDefaultOptions({ locale: ptBR, weekStartsOn: 0 })
```

- [ ] **Passo 8: Rodar e ver passar**

```bash
cd app && npm test -- src/lib/datas.test.ts src/features/financeiro/periodos.test.ts
```

Esperado: PASSAM os dois.

- [ ] **Passo 9: Corrigir o teste de metas que a virada quebra**

`npm test` agora acusa `src/features/metas/calculos.test.ts`. **Não é regressão** — o teste
descreve a semana antiga. Em `app/src/features/metas/calculos.test.ts`, troque a linha 5 por:

```ts
/** 2026-08-05 é uma quarta-feira; a semana (dom-sáb) vai de 08-02 a 08-08. */
```

E substitua o `it` das linhas 43-52 por:

```ts
  it('conta só os check-ins dentro da semana (domingo a sábado)', () => {
    const checkins = [
      checkin('2026-08-02'), // domingo — abre a semana, dentro
      checkin('2026-08-05'), // dentro
      checkin('2026-08-08'), // sábado — fecha a semana, dentro
      checkin('2026-08-09'), // fora (domingo seguinte já é outra semana)
      checkin('2026-08-01'), // fora (semana anterior)
    ]
    expect(checkinsNaSemana(checkins, HOJE)).toBe(3)
  })
```

Atualize também o comentário JSDoc de `checkinsNaSemana` em
`app/src/features/metas/calculos.ts:29`, que diz "(segunda a domingo)" — vira
"(domingo a sábado)".

- [ ] **Passo 10: Rodar a suíte inteira**

```bash
cd app && npm test && npm run typecheck && npm run lint
```

Esperado: tudo passa. **Se algum teste de `carga`, `eventos`, `planejador`, `recorrencia` ou
`canceladas` falhar, PARE** — o spec prevê que eles não dependem da fronteira da semana. Uma
falha ali é acoplamento não mapeado; investigue antes de tocar no teste.

Confirme que a função apagada não sobrou em lugar nenhum:

```bash
cd app && grep -rn "inicioSemanaCalendario\|weekStartsOn: 1" src/
```

Esperado: nenhuma saída.

- [ ] **Passo 11: Commit**

```bash
git add app/src/lib/datas.ts app/src/lib/datas.test.ts app/src/lib/locale.ts \
  app/src/features/financeiro/periodos.ts app/src/features/financeiro/periodos.test.ts \
  app/src/pages/calendario/CalendarioPage.tsx \
  app/src/features/metas/calculos.ts app/src/features/metas/calculos.test.ts
git commit -m "feat(semana): fronteira da semana vira domingo em inicioSemana"
```

---

### Tarefa 3: Migration do planejamento financeiro

**Arquivos:**
- Criar: `app/supabase/migrations/20260811000001_semana_comeca_no_domingo.sql`

**Interfaces:**
- Consome: nada em código. Depende conceitualmente da tarefa 2 (o cliente já procura por
  domingos).
- Produz: `planejamento_semanal_financeiro.semana_inicio` ancorado no domingo.

- [ ] **Passo 1: Contar as linhas ANTES**

Rode contra o banco (MCP do Supabase, `execute_sql`, projeto do Nexus Norte) e **anote o
número**:

```sql
select count(*) from public.planejamento_semanal_financeiro;
```

Se o resultado for `0`, a migration é um no-op e os passos 3 a 5 vão confirmar isso — crie o
arquivo mesmo assim, para que um banco restaurado de backup receba a correção.

- [ ] **Passo 2: Criar o arquivo de migration**

Crie `app/supabase/migrations/20260811000001_semana_comeca_no_domingo.sql`:

```sql
-- =============================================================================
-- Semana passa a começar no domingo (spec 2)
--
-- `semana_inicio` guarda o primeiro dia da semana, então toda linha precisa da
-- nova âncora. Esta é a única tabela chaveada por semana: o resto do sistema
-- deriva a semana de um intervalo de datas na hora.
--
-- O domingo não anda junto com o resto. Numa semana ancorada na segunda M, o
-- domingo é M+6 e FECHA a semana; com semanas em domingo, esse mesmo dia ABRE a
-- semana M+6. Um `- 1 day` cego o jogaria sete dias para trás — o planejamento
-- de um domingo apareceria no domingo da semana anterior, silenciosamente.
--
-- O unique (semana_inicio, dia_semana, categoria_id) sobrevive: a semana M+6
-- passa a conter o domingo vindo da semana antiga M e os dias 1-6 vindos da
-- semana antiga M+7 — chaves distintas.
--
-- NÃO É IDEMPOTENTE: rodar duas vezes desloca duas vezes.
--
-- RLS permanece desabilitado (resoluções 10.0/10.8).
-- =============================================================================

update public.planejamento_semanal_financeiro
set semana_inicio = case
  when dia_semana = 0 then semana_inicio + 6
  else semana_inicio - 1
end;
```

- [ ] **Passo 3: Aplicar a migration**

Aplique o conteúdo do arquivo via `apply_migration` do MCP do Supabase, com o nome
`semana_comeca_no_domingo`.

- [ ] **Passo 4: Contar as linhas DEPOIS**

```sql
select count(*) from public.planejamento_semanal_financeiro;
```

Esperado: **exatamente o número anotado no passo 1**. A migration move linhas, não cria nem
apaga.

Não compare `count(distinct semana_inicio)`: uma semana que só tinha entrada de domingo se
esvazia, e esse domingo pode aterrissar numa semana que já existia. O número de semanas pode
mudar legitimamente.

- [ ] **Passo 5: Provar que a âncora está correta**

```sql
select count(*) from public.planejamento_semanal_financeiro
where extract(dow from semana_inicio) <> 0
   or extract(dow from semana_inicio + dia_semana) <> dia_semana;
```

Esperado: **0**.

A primeira condição garante que toda âncora caiu num domingo. A segunda garante que nenhuma
entrada mudou de dia real — o que foi planejado para o domingo dia 15 continua no domingo dia
15. Um resultado diferente de zero significa migration aplicada duas vezes ou `case`
incorreto: **pare e investigue antes de qualquer outra coisa.**

- [ ] **Passo 6: Commit**

```bash
git add app/supabase/migrations/20260811000001_semana_comeca_no_domingo.sql
git commit -m "feat(semana): migration reancora planejamento_semanal_financeiro no domingo"
```

---

### Tarefa 4: Ritual passa a planejar a semana atual

**Arquivos:**
- Modificar: `app/src/pages/calendario/RitualSemanalPage.tsx:59-69`

**Interfaces:**
- Consome: `inicioSemana` da tarefa 2.
- Produz: `semanaInicioISO` na página passa a ser o domingo da semana **atual**. As tarefas 5
  e 6 assumem isso.

- [ ] **Passo 1: Trocar a semana**

Em `app/src/pages/calendario/RitualSemanalPage.tsx`, substitua as linhas 59 a 69 por:

```ts
  // A semana ATUAL, não a seguinte. Com domingo abrindo a semana, o ritual
  // feito no domingo planeja de hoje até sábado — "próxima" e "atual"
  // coincidem no dia em que o ritual acontece. Aberto no meio da semana, passa
  // a corrigir a semana em curso em vez de pular para a seguinte, que era o
  // comportamento anterior e nunca foi o desejado.
  const semana = useMemo(() => inicioSemana(hoje), [hoje])
  const semanaInicioISO = paraISO(semana)
  const intervalo = useMemo(
    () => ({ de: semanaInicioISO, ate: paraISO(addDays(semana, 6)) }),
    [semanaInicioISO, semana],
  )
```

`addDays` continua importado e usado. Nenhum outro ponto da página referencia
`proximaSemana` — confirme com:

```bash
cd app && grep -n "proximaSemana" src/pages/calendario/RitualSemanalPage.tsx
```

Esperado: nenhuma saída.

- [ ] **Passo 2: Verificar**

```bash
cd app && npm run typecheck && npm run lint && npm test
```

Esperado: tudo passa.

- [ ] **Passo 3: Conferir na tela**

```bash
cd app && npm run dev
```

Abra `/calendario/semana`. Os cabeçalhos de dia do passo Financeiro devem mostrar a semana
que contém hoje, começando num domingo. Encerre o servidor depois.

- [ ] **Passo 4: Commit**

```bash
git add app/src/pages/calendario/RitualSemanalPage.tsx
git commit -m "feat(ritual): planeja a semana atual, nao a seguinte"
```

---

### Tarefa 5: Dias já vividos esmaecidos e editáveis

**Arquivos:**
- Modificar: `app/src/pages/calendario/RitualSemanalPage.tsx` — `PassoRotina` (~:247-390) e
  `PassoEstudoTreino` (~:394-522), e as chamadas em :127 e :130
- Modificar: `app/src/features/financeiro/componentes/GradePlanejamentoSemanal.tsx`
- Modificar: `app/src/pages/financeiro/FinanceiroPage.tsx:248`

**Interfaces:**
- Consome: `ORDEM_DIAS_SEMANA` com índice = `dia_semana` (tarefa 1); `semanaInicioISO` como
  domingo da semana atual (tarefa 4).
- Produz: `GradePlanejamentoSemanal` passa a exigir a prop `hojeISO: string`. A tarefa 6 usa a
  mesma prop. Os dois sub-componentes do ritual recebem `hojeISO: string` também — uma forma
  só para o mesmo dado, e as duas páginas que montam a grade já têm a variável pronta
  (`FinanceiroPage:63`, `RitualSemanalPage:57`).

**Contexto que o implementador precisa:** os campos ficam **habilitados**. O plano de um dia
pode mudar depois do fato, e travar o campo impediria justamente a correção que motiva abrir o
ritual numa quarta. O esmaecido é informação, não bloqueio.

O passo **Sono** fica de fora: `planejamento_sono` é chaveado só por `dia_semana`, sem data —
é configuração de rotina permanente, não existe "domingo passado" ali.

- [ ] **Passo 1: Adicionar a prop `hojeISO` na grade do planejamento**

Em `app/src/features/financeiro/componentes/GradePlanejamentoSemanal.tsx`, adicione ao
`interface GradePlanejamentoSemanalProps` (linhas 29-35):

```ts
  /**
   * Data de hoje em `YYYY-MM-DD`, usada só para esmaecer os dias já vividos.
   * Entra como prop em vez de `new Date()` interno para o componente continuar
   * previsível — as duas páginas que o montam já têm a data estabilizada por
   * render.
   */
  hojeISO: string
```

Adicione `hojeISO` à desestruturação dos parâmetros (linhas 43-49).

O componente ainda precisa de `paraISO` para calcular a data de cada coluna, então troque o
import da linha 12 para incluir:

```ts
import { deISO, formatarMoeda, paraISO } from '@/lib/datas'
```

- [ ] **Passo 2: Esmaecer as colunas passadas**

Ainda em `GradePlanejamentoSemanal`, o cabeçalho (linhas 125-137) vira:

```tsx
                {ORDEM_DIAS.map((dia, indice) => {
                  const data = addDays(inicio, indice)
                  const passado = paraISO(data) < hojeISO
                  return (
                    <th
                      key={dia}
                      className={cn(
                        'text-muted-foreground px-1 py-2 text-center text-xs font-normal',
                        passado && 'opacity-40',
                      )}
                    >
                      <div className="capitalize">{format(data, 'EEEEEE')}</div>
                      <div className="text-[10px] opacity-60">
                        {format(data, 'dd/MM')}
                      </div>
                    </th>
                  )
                })}
```

E as células (linhas 146-171) ganham o mesmo esmaecido, **sem** desabilitar o input:

```tsx
                  {ORDEM_DIAS.map((dia, indice) => {
                    const id = chave(categoria.id, dia)
                    const passado = paraISO(addDays(inicio, indice)) < hojeISO
                    return (
                      <td
                        key={dia}
                        className={cn(
                          'border-border border-t p-0.5',
                          // Esmaecido, não desabilitado: o plano de um dia pode
                          // mudar depois do fato, e travar o campo impediria a
                          // correção.
                          passado && 'opacity-50',
                        )}
                      >
                        <Input
                          // `text`, não `number`: a vírgula do teclado brasileiro
                          // é inválida num campo numérico e chegaria como vazio
                          type="text"
                          inputMode="decimal"
                          value={valores[id] ?? ''}
                          onChange={(evento) =>
                            setValores((atual) => ({
                              ...atual,
                              [id]: evento.target.value,
                            }))
                          }
                          className={cn(
                            'h-8 w-20 border-transparent text-center text-xs tabular-nums',
                            'hover:border-border focus:border-ring shadow-none',
                          )}
                          placeholder="—"
                          aria-label={`${categoria.nome}, dia ${dia}`}
                        />
                      </td>
                    )
                  })}
```

- [ ] **Passo 3: Passar `hoje` nos dois call-sites**

Em `app/src/pages/financeiro/FinanceiroPage.tsx:248`, adicione `hojeISO={hojeISO}` ao
`<GradePlanejamentoSemanal>`. A variável já existe na linha 63.

Em `app/src/pages/calendario/RitualSemanalPage.tsx`, `PassoFinanceiro` precisa receber a data.
Troque a assinatura:

```tsx
function PassoFinanceiro({
  semanaInicio,
  hojeISO,
}: {
  semanaInicio: string
  hojeISO: string
}) {
```

e adicione `hojeISO={hojeISO}` ao `<GradePlanejamentoSemanal>` dentro dela. Na linha 132, a
chamada vira:

```tsx
        {passo === 3 && (
          <PassoFinanceiro semanaInicio={semanaInicioISO} hojeISO={hojeISO} />
        )}
```

- [ ] **Passo 4: Esmaecer os dias passados no passo Rotina**

Em `PassoRotina`, adicione `hojeISO` às props. A interface (linhas 245-248) vira — note que
`semanaInicio` continua declarado, apesar de não ser usado no corpo: a chamada da linha 127 o
passa, e removê-lo daria erro de tipo:

```ts
interface PassoRotinaProps {
  semanaInicio: string
  intervalo: { de: string; ate: string }
  hojeISO: string
}
```

e a assinatura vira `function PassoRotina({ intervalo, hojeISO }: PassoRotinaProps) {`.

No grid "Confirme a rotina da semana" (a partir da linha ~336), o `map` vira:

```tsx
          {ORDEM_DIAS.map((dia) => {
            const doDia = (porDia.get(dia) ?? []).sort((a, b) =>
              a.regra.horario_inicio.localeCompare(b.regra.horario_inicio),
            )
            // O índice na constante é o próprio dia_semana e `intervalo.de` é
            // sempre o domingo, então a data do dia é `de + dia`.
            const passado = paraISO(addDays(deISO(intervalo.de), dia)) < hojeISO
            return (
              <div key={dia} className={cn('space-y-1.5', passado && 'opacity-50')}>
```

O resto do bloco não muda. Confirme que `cn`, `addDays`, `deISO` e `paraISO` já estão
importados no arquivo — `cn` está na linha 11, `addDays` na 2, `deISO` e `paraISO` na 9.

Na chamada da linha 127, adicione a prop:

```tsx
          <PassoRotina semanaInicio={semanaInicioISO} intervalo={intervalo} hojeISO={hojeISO} />
```

- [ ] **Passo 5: Esmaecer os dias passados no passo Estudo e treino**

`PassoEstudoTreino` declara as props inline (linhas 392-398). A assinatura vira — de novo,
`semanaInicio` continua declarado porque a chamada o passa:

```tsx
function PassoEstudoTreino({
  intervalo,
  hojeISO,
}: {
  semanaInicio: string
  intervalo: { de: string; ate: string }
  hojeISO: string
}) {
```

A faixa de dias (linhas ~482-491) vira:

```tsx
          {dias.map((dia) => (
            <div
              key={dia.data}
              className={cn(
                'rounded-md border p-2 text-center',
                dia.data < hojeISO && 'opacity-50',
              )}
            >
```

`dia.data` já é uma string ISO `YYYY-MM-DD`, comparável direto com `hojeISO`.

Na chamada da linha 130, adicione a prop:

```tsx
          <PassoEstudoTreino semanaInicio={semanaInicioISO} intervalo={intervalo} hojeISO={hojeISO} />
```

- [ ] **Passo 6: Verificar**

```bash
cd app && npm run typecheck && npm run lint && npm test
```

Esperado: tudo passa.

- [ ] **Passo 7: Conferir na tela, incluindo o mobile**

```bash
cd app && npm run dev
```

Abra `/calendario/semana` e percorra os quatro passos. Num dia que não seja domingo:
- Sono: **nenhum** dia esmaecido
- Rotina, Estudo e treino, Financeiro: os dias anteriores a hoje esmaecidos
- clique num campo de dia passado no Financeiro e digite — **tem que aceitar**

Repita com o DevTools em largura de celular (375px). Encerre o servidor depois.

- [ ] **Passo 8: Commit**

```bash
git add app/src/pages/calendario/RitualSemanalPage.tsx \
  app/src/features/financeiro/componentes/GradePlanejamentoSemanal.tsx \
  app/src/pages/financeiro/FinanceiroPage.tsx
git commit -m "feat(ritual): dias ja vividos esmaecidos e ainda editaveis"
```

---

### Tarefa 6: Rolagem até hoje no mobile

**Arquivos:**
- Modificar: `app/src/features/financeiro/componentes/GradePlanejamentoSemanal.tsx`

**Interfaces:**
- Consome: a prop `hojeISO: string` da tarefa 5.
- Produz: nada consumido adiante.

**Contexto que o implementador precisa:** a tabela tem sete colunas de `w-20` dentro de um
`overflow-x-auto`. Num celular de 375px cabem duas ou três. Aberta numa quarta, o que aparece
é domingo e segunda — dias que já passaram. No desktop a tabela não transborda e o efeito é um
no-op, sem precisar de nenhuma checagem de largura.

- [ ] **Passo 1: Adicionar o ref e o efeito**

Em `GradePlanejamentoSemanal`, troque o import da linha 1 para incluir `useRef`:

```ts
import { useEffect, useMemo, useRef, useState } from 'react'
```

Depois de `const inicio = deISO(semanaInicio)` (linha 94), adicione:

```ts
  const celulaDeHoje = useRef<HTMLTableCellElement>(null)

  /*
    Rola a grade até a coluna de hoje ao montar.

    Sem isso, abrir o ritual numa quarta no celular mostra domingo e segunda —
    dias já vividos — enquanto o que se quer planejar está fora da tela à
    direita. `block: 'nearest'` é obrigatório: sem ele o navegador também rola
    a página verticalmente e joga o cabeçalho do ritual para fora da vista.

    No desktop a tabela não transborda e isto é um no-op.
  */
  useEffect(() => {
    celulaDeHoje.current?.scrollIntoView({ inline: 'start', block: 'nearest' })
  }, [semanaInicio])
```

- [ ] **Passo 2: Marcar a coluna de hoje**

No `<th>` do cabeçalho (o bloco editado na tarefa 5), calcule também `ehHoje` e prenda o ref:

```tsx
                {ORDEM_DIAS.map((dia, indice) => {
                  const data = addDays(inicio, indice)
                  const dataISO = paraISO(data)
                  const passado = dataISO < hojeISO
                  return (
                    <th
                      key={dia}
                      ref={dataISO === hojeISO ? celulaDeHoje : undefined}
                      className={cn(
                        'text-muted-foreground px-1 py-2 text-center text-xs font-normal',
                        passado && 'opacity-40',
                      )}
                    >
                      <div className="capitalize">{format(data, 'EEEEEE')}</div>
                      <div className="text-[10px] opacity-60">
                        {format(data, 'dd/MM')}
                      </div>
                    </th>
                  )
                })}
```

Quando `hoje` cai fora da semana exibida — possível no Financeiro se a semana vier de outra
origem — nenhum `th` recebe o ref, `current` fica `null` e o efeito não faz nada. É o
comportamento correto: sem coluna de hoje, não há para onde rolar.

- [ ] **Passo 3: Registrar a exceção de 44px**

O `Input` da grade tem `h-8` (32px), abaixo da régua de 44px do projeto. Fica como está —
registre o porquê para não ser "corrigido" depois sem contexto. Substitua o comentário de
duas linhas acima de `type="text"` por:

```tsx
                          // `text`, não `number`: a vírgula do teclado brasileiro
                          // é inválida num campo numérico e chegaria como vazio.
                          //
                          // `h-8` (32px) é exceção consciente à régua de 44px:
                          // são 7 colunas por categoria, e 44px de altura por
                          // célula deixaria a tabela alta demais para uma tela
                          // de celular. O alvo aqui é campo de digitação, não
                          // botão.
```

- [ ] **Passo 4: Verificar**

```bash
cd app && npm run typecheck && npm run lint && npm test
```

Esperado: tudo passa.

- [ ] **Passo 5: Conferir no mobile — este é o passo que justifica a tarefa**

```bash
cd app && npm run dev
```

Com o DevTools em 375px de largura, abra `/calendario/semana` e vá ao passo Financeiro.
Verifique, num dia que não seja domingo:
- a grade abre já mostrando a coluna de hoje na borda esquerda
- a página **não** rolou verticalmente — o cabeçalho do ritual continua visível
- é possível rolar a grade para trás à mão e alcançar os dias passados

Repita em largura de desktop: a tabela inteira aparece e nada se move.

Encerre o servidor depois.

- [ ] **Passo 6: Commit**

```bash
git add app/src/features/financeiro/componentes/GradePlanejamentoSemanal.tsx
git commit -m "feat(planejamento): grade rola ate a coluna de hoje no mobile"
```

---

### Tarefa 7: Verificação de ponta a ponta e deploy

**Arquivos:** nenhum modificado; esta tarefa é verificação.

- [ ] **Passo 1: Suíte inteira e build**

```bash
cd app && npm test && npm run typecheck && npm run lint && npm run build
```

Esperado: os quatro passam. O `build` é o único que exercita `tsc -b` completo mais o bundle.

- [ ] **Passo 2: Confirmar que não sobrou nenhuma semana de segunda**

```bash
cd app && grep -rn "weekStartsOn: 1\|inicioSemanaCalendario\|const ORDEM_DIAS =" src/
```

Esperado: nenhuma saída.

```bash
cd app && grep -rn "segunda-feira\|segunda a domingo\|seg-dom" src/
```

Esperado: nenhuma saída, ou só ocorrências que descrevem outra coisa que não a fronteira da
semana. Qualquer comentário que ainda anuncie a semana começando na segunda está mentindo e
precisa ser corrigido antes do deploy.

- [ ] **Passo 3: Passar o app inteiro no olho, no celular**

```bash
cd app && npm run dev
```

Com o DevTools em 375px, confirme que a semana começa no domingo em:
- `/` (Home) — contadores semanais
- `/calendario` — as três vistas: Agenda, Mês e Horas
- `/calendario/semana` — os quatro passos do ritual
- `/calendario/blocos` — grade dos blocos fixos
- `/financeiro` — grade do planejamento e o preset "Esta semana" da lista de lançamentos
- `/treino` — frequência da semana
- `/estudos` — diálogo do fluxograma

Encerre o servidor depois.

- [ ] **Passo 4: Ordem do deploy — e ela importa**

A migration da tarefa 3 já foi aplicada ao banco de produção quando você a rodou; o Supabase é
único, sem ambiente separado. Isso significa que **desde aquele momento até o deploy do
cliente, o app em produção está procurando por segundas numa tabela chaveada em domingos** e o
planejamento financeiro aparece vazio.

A janela deve ser curta. Faça o deploy assim que a tarefa 6 estiver commitada:

```bash
git push
```

O Vercel publica a partir de `main`. Depois de publicar, abra `/financeiro` no celular e
confirme que a grade do planejamento voltou a mostrar os valores já gravados. Se aparecer
vazia, releia a verificação do passo 5 da tarefa 3 antes de mexer em qualquer coisa — o
sintoma de "migration rodada duas vezes" e o de "não rodou" são idênticos na tela.

- [ ] **Passo 5: Atualizar a memória do projeto**

Depois de confirmado em produção, registre em
`~/.claude/projects/C--Users-T-GAMER-Desktop-Nexus-Norte-Nexus-Norte/memory/` que a semana do
Nexus Norte começa no domingo em todo o sistema desde 11/08/2026, e que
`planejamento_semanal_financeiro.semana_inicio` guarda domingos — é o tipo de fato que não se
deduz do código sem ler três arquivos.
