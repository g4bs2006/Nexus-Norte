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
| 1 | Financeiro | ⬜ Pendente |
| 2 | Estudos | ⬜ Pendente |
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

## Estrutura

```
.
├── plano.md              # Plano de execução (fonte de verdade do escopo)
└── app/
    ├── src/
    │   ├── components/
    │   │   ├── layout/   # AppShell, Sidebar, ThemeToggle
    │   │   └── ui/       # shadcn/ui (vendored)
    │   ├── hooks/
    │   ├── lib/          # supabase, queryClient, pilares, constants
    │   ├── pages/        # uma pasta por pilar
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
