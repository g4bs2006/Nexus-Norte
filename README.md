# Nexus

Sistema de gestão pessoal com 4 pilares (Financeiro, Estudos, Treino, Projetos),
um hub central (Home) e uma camada transversal de Calendário.

O plano de execução completo está em [`plano.md`](./plano.md). A seção 10 do
plano registra as resoluções de lacunas decididas antes da implementação — ela
**sobrescreve** as seções anteriores onde houver conflito.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Build | Vite 8 + React 19 + TypeScript (estrito) |
| Estilo | Tailwind CSS v4 + shadcn/ui |
| Estado servidor | TanStack React Query |
| Estado UI | Zustand (tema, sidebar) |
| Gráficos | Recharts |
| Calendário | FullCalendar |
| Formulários | React Hook Form + Zod |
| Backend | Supabase (Postgres + Storage + Triggers) |
| Deploy | Vercel |

## Progresso das fases

| Fase | Escopo | Status |
| --- | --- | --- |
| 0 | Fundação — setup, design system, schema base, shell de layout | ✅ Concluída |
| 1 | Financeiro | ✅ Concluída |
| 2 | Estudos | ✅ Concluída |
| 3 | Treino | ⬜ Pendente |
| 4 | Projetos | ⬜ Pendente |
| 5 | Calendário unificado | ⬜ Pendente |
| 6 | Home | ⬜ Pendente |
| 7 | Polimento | ⬜ Pendente |

### Fase 0 — Fundação

- Projeto Vite + React + TypeScript com `strict` e `noUncheckedIndexedAccess`
- Tailwind v4 com paleta Notion e cores por pilar (plano 1.2)
- shadcn/ui com 16 componentes base
- React Router com as 10 rotas do plano (1.1)
- React Query com cache configurado para evitar refetch entre pilares (7.2)
- Zustand para tema (claro/escuro/sistema) e estado da sidebar
- Client Supabase tipado a partir do schema
- Shell de layout: sidebar colapsável com destaque do item ativo
- Schema base transversal: `checks_diarios`, `planejamento_sono`, `registro_sono`

### Fase 1 — Financeiro

- Schema: `categorias`, `lancamentos`, `investimentos`,
  `planejamento_semanal_financeiro`
- Views de agregação: `resumo_mensal_categoria`, `receita_mensal`
- Trigger de campo-resumo `categorias.total_gasto_mes` (mês corrente)
- Função `candidatos_corte()`, calculada na leitura
- Cálculos como funções puras com **26 testes** (`calculos.test.ts`)
- Card receita vs. despesa com projeção de saldo no fim do mês
- Card "disponível hoje": geral e planejado lado a lado, com 🟢/🔴 do dia
- Grade de planejamento semanal dia × categoria (ritual de domingo)
- Grid de cards de categoria com anel de progresso
- Gráfico de tendência de 6 meses (Recharts) com seletor de categoria
- Seção de atenção com candidatos a corte
- Seção de investimentos: aporte e rendimento do mês
- Checks diário e semanal
- Formulários de categoria, lançamento e investimento (RHF + Zod)
- Sub-página da categoria com histórico e progresso da meta

**Decisão desta fase:** o plano pedia card "Receita vs. Despesa" e
`meta_tipo = 'percentual_renda'`, mas não modelava receita. Resolvido com a
coluna `natureza` em `categorias` — ver resolução 10.12 no plano.

### Fase 2 — Estudos

- Schema: `materias`, `documentos`, `faltas`, `avaliacoes`,
  `config_calculo_media`, `registro_listas`, `sessoes_estudo`
- `fluxograma_semanal` + `excecoes_fluxograma` com FK real (resoluções 10.5/10.6)
- `conclusoes_fluxograma` para persistir o check derivado (resolução 10.15)
- Trigger de campo-resumo `materias.media_atual`, nos dois modos de cálculo
- Cálculos como funções puras: média, média projetada, risco de reprovação,
  frequência de estudo, próxima avaliação, percentual de acerto
- Expansão de recorrência no cliente (`lib/recorrencia.ts`), com testes
- Grid de cards de matéria com semáforo e contagem regressiva
- Sub-página com 5 abas: Avaliações, Faltas, Sessões, Documentos, Listas
- Upload de documentos no bucket privado, acesso por URL assinada
- Grade de fluxograma semanal (componente compartilhado com Treino)
- Checks diários derivados do fluxograma

**Decisões desta fase:** `avaliacoes` ganhou coluna `data` (resolução 10.14) e
foi criada `conclusoes_fluxograma` (resolução 10.15) — o plano pedia o toggle de
concluído sem definir onde guardá-lo.

## Estrutura

```
.
├── plano.md              # Plano de execução (fonte de verdade do escopo)
└── app/
    ├── src/
    │   ├── components/
    │   │   ├── layout/   # AppShell, Sidebar, ThemeToggle
    │   │   └── ui/       # shadcn/ui (vendored)
    │   ├── features/     # um módulo por pilar: api, hooks, calculos, componentes
    │   │   └── financeiro/
    │   ├── hooks/
    │   ├── lib/          # supabase, queryClient, pilares, constants, datas
    │   ├── pages/        # uma pasta por pilar (rotas)
    │   ├── stores/       # Zustand
    │   └── types/        # database.ts (gerado)
    └── supabase/
        └── migrations/   # schema versionado (resolução 10.11)
```

## Rodando localmente

```bash
cd app
npm install
cp .env.example .env.local   # preencha com as credenciais do Supabase
npm run dev
```

### Scripts

| Comando | Ação |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Typecheck + build de produção |
| `npm run lint` | oxlint |
| `npm run test` | Vitest (funções puras de cálculo) |
| `npm run typecheck` | Apenas verificação de tipos |
| `npm run types:gen` | Regenera `src/types/database.ts` do schema remoto |

## Convenções

- **Cálculos de fórmula são funções puras testáveis** (média ponderada, 1RM
  estimado, gasto disponível), nunca lógica espalhada em componentes (plano 9).
- **Agregação pesada vem de campo-resumo via trigger**; agregação leve e dados
  que dependem da passagem do tempo são calculados na leitura (resolução 10.9).
- **Constantes de domínio** ficam em `src/lib/constants.ts`, declaradas uma
  única vez (resolução 10.3).
- **Recorrência não é expandida no banco** — `fluxograma_semanal` guarda o
  padrão semanal e o cliente expande em ocorrências datadas (resolução 10.5).
- **`dia_semana` segue `Date.getDay()`**: 0 = domingo … 6 = sábado.

## Segurança

Sistema single-user **sem autenticação** (resolução 10.0). RLS está
deliberadamente desabilitado e o acesso é feito com a publishable key.

> **Dívida técnica consciente:** RLS fica condicionado à futura adição de
> autenticação. Deve ser revisto antes de qualquer exposição multi-usuário.
