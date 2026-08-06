# Metas — design

**Data:** 2026-08-05
**Status:** aprovado para planejamento
**Contexto:** próximo passo depois é um editor de blocos (fora de escopo deste spec — ver "Fora de escopo").

## Problema

Hoje "meta" existe de forma fragmentada e sem unificação visual: `categorias.meta_mensal`
(Financeiro), `marcos_projeto` (Projetos), `personal_records` (Treino) — e nada equivalente em
Estudos ou Sono. Não há um lugar único onde o usuário veja tudo que está perseguindo,
independente do pilar.

Inspiração: o AppFlowy trata "database" como um dado único exibido em várias views (grid,
board, calendário) — aqui aplicamos a mesma ideia de unificação, mas para o conceito de meta:
um dado (`metas`), múltiplas formas (numérica, marco, hábito, livre), e vínculo opcional com
qualquer pilar existente.

## Restrição de navegação

A barra inferior mobile já está no limite (6 itens, comentário no código já registra isso:
"seis alvos numa faixa é apertado" — `BottomNav.tsx`). **Metas não ganha rota nova nem item de
navegação.** Vive como seção dentro da Home (hub central já existente).

## Modelo de dados

### Tabela `metas`

```sql
create table metas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('numerica', 'marco', 'habito', 'livre')),
  titulo text not null,
  descricao text,
  criada_em timestamptz not null default now(),
  data_alvo date,               -- opcional e livre, sem período fixo (mensal/anual)
  concluida boolean not null default false,  -- usado por marco e livre

  -- link opcional a um pilar (no máximo um preenchido por linha)
  categoria_id uuid references categorias(id),
  materia_id uuid references materias(id),
  tipo_treino_id uuid references tipos_treino(id),
  projeto_id uuid references projetos(id),

  -- meta numérica
  valor_alvo numeric,
  valor_atual_manual numeric,    -- só usado quando tipo='numerica' e SEM link de pilar
  unidade text,                  -- "R$", "h", "kg", "livros" etc.

  -- meta hábito/streak
  frequencia_alvo int,           -- ex: 4 (vezes)
  frequencia_periodo text check (frequencia_periodo in ('semana'))
);
```

Nota de desambiguação: `metas.valor_alvo` é independente de `categorias.meta_mensal` — uma meta
pode, por exemplo, ter um alvo de economia diferente do orçamento mensal da categoria (ex: meta
"economizar R$2000 em Lazer até dezembro" vs. o orçamento mensal recorrente da categoria). O
link existe só para saber de onde tirar o progresso real, não para herdar o alvo.

Regras de integridade (checar em app-level e/ou constraint):
- No máximo uma das FKs de pilar (`categoria_id`, `materia_id`, `tipo_treino_id`,
  `projeto_id`) pode estar preenchida por linha.
- Campos específicos de tipo (`valor_alvo`/`unidade`/link para `numerica`;
  `frequencia_alvo`/`frequencia_periodo` para `habito`) só fazem sentido para o `tipo`
  correspondente — a UI garante isso via formulário condicional; não há CHECK constraint
  cruzado no banco para manter a migration simples.

### Tabela `metas_checkins` (só para `tipo = 'habito'`)

```sql
create table metas_checkins (
  id uuid primary key default gen_random_uuid(),
  meta_id uuid not null references metas(id) on delete cascade,
  data date not null,
  feito boolean not null default true,
  unique (meta_id, data)
);
```

Um check-in por dia por meta. Streak = contagem de dias consecutivos com `feito = true`
terminando hoje ou ontem; progresso da semana = contagem de `feito = true` na semana atual vs
`frequencia_alvo`.

### Marco — decisão de escopo (v1)

Um único marco por linha de `metas` (data-alvo opcional + `concluida`), no mesmo espírito de
`marcos_projeto`. **Sem** checklist de sub-etapas nesta versão — se precisar de múltiplas etapas
dentro de uma meta de marco, é uma extensão natural futura (nova tabela `metas_etapas`), não
faz parte deste spec (YAGNI).

## Cálculo de progresso

### Numérica com link de pilar

Função Postgres `progresso_meta(meta_id uuid) returns numeric`, seguindo a mesma convenção que
já existe no schema (`progresso_categoria`, `calcular_media_materia`, `candidatos_corte`). A
função inspeciona qual FK está preenchida e agrega o dado real daquele pilar no período da meta
(entre `criada_em` e `data_alvo`, ou até hoje se `data_alvo` for nulo):

| FK preenchida | Agregação |
|---|---|
| `categoria_id` | soma de `lancamentos.valor` da categoria no período |
| `materia_id` | soma de `sessoes_estudo.duracao_minutos` da matéria no período |
| `tipo_treino_id` | contagem/duração de `execucoes_treino` daquele tipo no período |
| `projeto_id` | % de `marcos_projeto` concluídos do projeto |

Chamada via RPC do Supabase, exposta no client como `api.progressoMeta(metaId)`, exatamente como
as outras funções de cálculo já expostas em `features/*/api.ts`.

### Numérica sem link (fallback manual)

Progresso = `valor_atual_manual / valor_alvo`. Editável direto no card (botão "+"/input, no
mesmo padrão de outros incrementos rápidos do app).

### Marco / Livre

Progresso é binário: `concluida`. Sem cálculo.

### Hábito

Progresso = check-ins `feito=true` na semana atual / `frequencia_alvo`. Streak calculado
client-side a partir da lista de check-ins retornada (função pura em `calculos.ts`, testável
como as demais — ver `sono/calculos.ts`, `treino/calculos.ts`).

## Estrutura de UI

Novo `app/src/features/metas/` seguindo a convenção já estabelecida pelos outros pilares:

```
features/metas/
  api.ts          -- CRUD de metas + metas_checkins, chamada de progressoMeta RPC
  hooks.ts         -- useMetas(), useCriarMeta(), useAtualizarMeta(), useCheckinHabito(), etc.
  calculos.ts      -- streak(), progressoSemanaHabito(), formatação de progresso
  calculos.test.ts
  schemas.ts        -- zod, validação condicional por tipo
  types.ts
  componentes/
    CardMeta.tsx           -- renderiza diferente por tipo (ring/barra, checkbox, streak)
    DialogListaMetas.tsx    -- tela cheia, lista completa, agrupável por pilar/status
    DialogMeta.tsx           -- formulário de criar/editar, campos condicionais por tipo
```

### Seção na Home

- Lista horizontal com scroll lateral no mobile (não empilha verticalmente, preserva o layout
  atual da Home).
- Mostra as ~3–4 metas mais relevantes (heurística inicial: mais próximas do prazo, ou com
  progresso mais avançado — a decidir no plano de implementação).
- Cada `CardMeta` usa a cor do pilar linkado (reaproveita `cores.ts`/paleta de `pilares.ts`) ou
  cor neutra para meta livre/sem link.
- Reaproveita componentes visuais existentes: `AnelProgresso`/`BarraProgresso` para numérica,
  padrão de `CheckDia` para hábito.
- Botão "Ver todas" abre `DialogListaMetas`.

### Diálogo de lista (`DialogListaMetas`)

- Tela cheia (mobile e desktop).
- Agrupamento por pilar ou por status (ativa/concluída) — filtro simples, não precisa de views
  salvas tipo AppFlowy nesta v1.
- Ações: criar (abre `DialogMeta` vazio), editar (abre `DialogMeta` preenchido), excluir
  (reaproveita `DialogConfirmarExclusao` já existente).

### Diálogo de formulário (`DialogMeta`)

- Campo `tipo` primeiro; o resto do formulário é condicional:
  - `numerica`: seletor de pilar/entidade (opcional) + `valor_alvo` + `unidade`.
  - `marco`: `data_alvo` opcional + nada mais (conclusão é toggle no card, não no form).
  - `habito`: `frequencia_alvo` + `frequencia_periodo` (só "semana" nesta v1).
  - `livre`: só `titulo`/`descricao`.
- RHF + zod, no mesmo padrão dos outros `Dialog*` do app (ex: `DialogProjeto`, `DialogCategoria`).

## Navegação

Nenhuma rota nova. Nenhuma mudança em `BottomNav.tsx` ou `Sidebar.tsx`. Metas é inteiramente
acessível a partir da Home.

## Testes

- `calculos.ts` (streak, progresso de hábito) testado como as demais funções puras do projeto
  (`sono/calculos.test.ts`, `treino/calculos.test.ts` como referência).
- `progresso_meta()` (Postgres) validado manualmente/via seed, seguindo o padrão das outras
  funções de cálculo do schema (não há suíte de teste SQL no projeto hoje).

## Fora de escopo (deste spec)

- Editor de blocos (bloco de anotações livres, mentions, etc.) — próximo passo depois de Metas,
  spec separado.
- Notificações/lembretes de metas — explicitamente não necessário agora.
- Checklist de sub-etapas dentro de uma meta de marco.
- Períodos fixos (mensal/anual) — prazo é sempre uma data livre e opcional.
- Views salvas/filtros avançados no diálogo de lista (grid/board/calendário como no AppFlowy) —
  fica com o filtro simples por pilar/status nesta v1.
