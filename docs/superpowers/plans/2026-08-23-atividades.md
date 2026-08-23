# Atividades — entregas com prazo (feature Estudos)

**Data:** 2026-08-23
**Status:** proposto, aguardando aprovação para implementar
**Contexto:** conversa de planejamento com duas frentes: (1) trazer emails
recebidos para dentro do sistema e (2) uma feature nova de **atividades**,
semelhante à parte de avaliações, com **data de entrega** vinculada. Decisões
fechadas na conversa:

- **Atividades é a frente principal.** Email fica **para depois** — mas o
  schema já nasce preparado (`origem`, `fonte_url`) para a coleta futura não
  exigir migração de retrabalho.
- **Vínculo opcional com avaliação:** uma atividade entregue pode criar ou
  vincular uma avaliação existente. A nota **nunca mora na atividade** — a
  média continua território exclusivo de `avaliacoes`.
- **MVP completo:** aba na matéria + seção no hub `/estudos`, Calendário
  (prazo), Home (próxima entrega / atrasadas) e push 1 dia antes.

**Design técnico** (contratos exatos — tipos, assinaturas, eventos de
calendário, push, testes e a resolução 10.XX):
[`2026-08-23-atividades-design.md`](./2026-08-23-atividades-design.md).

## O que existe hoje (levantado no código, não é opinião)

- `avaliacoes` (`20260804000003_fase2_estudos.sql:48-62`) — prova com
  `nome`, `peso`, `nota` e `data` (resolução 10.14). Entra na média via
  trigger (`materias.media_atual`). É o parente mais próximo, mas é evento de
  **nota**, não de **entrega**.
- `registro_listas` — registro pós-lista de exercícios (total de questões,
  erradas, tópico). Não é entrega com prazo.
- Grep por `atividade|entrega|tarefa` em `app/src` e `app/supabase`: **não
  existe nada** com esse papel hoje.
- Os trilhos que a feature vai reusar já estão abertos pelo padrão de provas:
  `eventosAvaliacoes` (`features/calendario/eventos.ts`), `proximaAvaliacao`
  (`features/estudos/calculos.ts`), `candidatasProva`
  (`app/supabase/functions/notificar/index.ts`) e o mini-card Estudos
  (`pages/HomePage.tsx`).

## O que este plano propõe

### 1. Modelagem

- **Nota nunca mora na atividade.** `atividades.avaliacao_id` é um ponteiro
  opcional para `avaliacoes`. Concluir a atividade pode criar uma avaliação a
  partir dela (nome pré-preenchido = título, data = data de entrega,
  nota/peso em branco para lançar na aba Avaliações) ou vincular uma avaliação
  existente. Regra de média e trigger intactos.
- **Status derivado na leitura.** `concluida_em` null = pendente (padrão
  presença, como `conclusoes_fluxograma`); "atrasada" é calculada na leitura
  porque depende da passagem do tempo — a mesma regra do momentum de Projetos
  (resolução 10.9). Nenhum trigger de campo-resumo: contagem de atrasadas é
  agregação leve.
- **Email preparado, não implementado.** `origem ('manual' | 'email')` e
  `fonte_url` nascem no schema; a frente de email futura só preenche esses
  campos.
- **Período da matéria não filtra atividade.** `data_inicio`/`data_fim`
  cortam a rotina recorrente do fluxograma (10.38); atividade é **data
  colada**, como prova — entrega marcada aparece mesmo fora do semestre.
- **Atraso conta por dia, não por horário.** `hora_entrega` é informativa
  (agendamento no calendário); a virada de "atrasada" acontece no fim do dia
  da `data_entrega`.

### 2. Migration — `atividades`

`app/supabase/migrations/20260823000001_atividades_estudos.sql`:

```sql
-- =============================================================================
-- Atividades (entregas com prazo) — feature Estudos
--
-- Atividade é entrega com data, não prova: a nota continua vivendo em
-- `avaliacoes` (que alimenta `materias.media_atual` via trigger). O vínculo
-- `avaliacao_id` é opcional: entregar pode criar/vincular uma avaliação.
--
-- Status é derivado na leitura: `concluida_em` null = pendente; "atrasada" =
-- pendente com `data_entrega` no passado. Sem trigger de campo-resumo —
-- contagem de atrasadas é agregação leve (resolução 10.9).
--
-- `origem` prepara a frente futura de captura de emails (manual/email);
-- `fonte_url` guarda o link do portal/email original.
-- =============================================================================

create table public.atividades (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references public.materias (id) on delete cascade,
  titulo text not null check (btrim(titulo) <> ''),
  descricao text,
  data_entrega date not null,
  -- Nulo = dia inteiro (mesma convenção de sessoes_estudo.hora_inicio).
  hora_entrega time,
  -- Presença, não flag: null = pendente; preencher = concluída; apagar = reabrir.
  concluida_em timestamptz,
  avaliacao_id uuid references public.avaliacoes (id) on delete set null,
  origem text not null default 'manual' check (origem in ('manual', 'email')),
  fonte_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index atividades_materia_idx
  on public.atividades (materia_id, data_entrega desc);
create index atividades_data_idx
  on public.atividades (data_entrega desc);

comment on table public.atividades is
  'Entregas com prazo por matéria. Nota vive em avaliacoes (vinculo opcional); status derivado na leitura.';
```

Na mesma migration, ampliar o dedup de push para aceitar o tipo novo. O CHECK
inline de `notificacoes_enviadas.tipo`
(`20260806000004_notificacoes.sql:33`) não conhece `'atividade'`:

```sql
alter table public.notificacoes_enviadas
  drop constraint notificacoes_enviadas_tipo_check;

alter table public.notificacoes_enviadas
  add constraint notificacoes_enviadas_tipo_check
  check (tipo in ('aula_treino', 'conta', 'prova', 'meta', 'atividade'));
```

> Conferir o nome real da constraint antes de rodar (nome implícito do
> Postgres para CHECK inline de coluna: `<tabela>_<coluna>_check`).

### 3. Cálculos puros (`features/estudos/calculos.ts` + `calculos.test.ts`)

- `statusAtividade(atividade, agoraISO)` → `'pendente' | 'atrasada' | 'concluida'`.
  Atrasada: `concluida_em` null e `data_entrega` anterior a `agoraISO` (por dia).
- `proximaAtividade(atividades, hojeISO)` → `{ atividade, dias } | null` —
  menor `data_entrega` futura não concluída. Espelho exato de
  `proximaAvaliacao` (ignora concluídas e datas passadas).
- `atividadesAtrasadas(atividades, hojeISO)` → contagem para a Home.
- Testes para as três, no estilo dos casos existentes (data por parâmetro,
  sem DOM).

### 4. Dados (`api.ts` / `hooks.ts`)

- `listarAtividades(materiaId?)` — aba e hub.
- `listarAtividadesNoIntervalo(inicio, fim)` — Calendário.
- `criarAtividade`, `atualizarAtividade`, `excluirAtividade`.
- `concluirAtividade` / `reabrirAtividade` — grava/apaga `concluida_em`.
- `concluirComAvaliacao` — cria a avaliação (nome = título, data =
  `data_entrega`, nota/peso em branco) e vincula; **duas escritas
  sequenciais com rollback** se a segunda falhar (lição da resolução 10.22).
- Mutations invalidam `['estudos']` e `['calendario']` (padrão
  `useMutationEstudos`).

### 5. UI

| Onde | O quê |
| --- | --- |
| `AbaAtividades` (7ª aba, logo após Avaliações) | Lista por status — atrasadas no topo em vermelho, próximas com contagem regressiva, concluídas riscadas; formulário único criar/editar (`DialogAtividade`); concluir/reabrir; vincular avaliação; exclusão com `DialogConfirmarExclusao` e o dado na frente (título + data) |
| Hub `/estudos` | Card "Entregas" no padrão de "Aulas de hoje" — próximas entregas com check de concluir, atrasadas destacadas |
| Calendário | `eventosAtividades` como **prazo sólido** na cor de Estudos (padrão `eventosAvaliacoes`), `estado: 'feito'` quando concluída; rota `/estudos/:materiaId`; criar atividade direto do dia (`DialogCriarNoDia`) |
| Home | Mini-card Estudos ganha "N atrasadas" (aciona `atencao`/`risco`) + próxima entrega com dias |
| Push | `candidatasEntrega` na Edge Function — 1 dia antes do prazo, não concluída (padrão `candidatasProva`); tipo `'atividade'`; clique → `/estudos/:materiaId` |

### 6. Sequência de implementação

1. Migration + `npm run types:gen`
2. `types.ts` + `calculos.ts` + testes
3. `api.ts` + `hooks.ts`
4. `AbaAtividades` + `DialogAtividade` + wiring na `MateriaDetalhePage`
5. Card "Entregas" no hub (`EstudosPage`)
6. Calendário (`eventos.ts` + query em `useFontesCalendario` +
   `DialogCriarNoDia`)
7. Home (`HomePage` mini-card Estudos)
8. Push (`notificar/index.ts` + CHECK do tipo já ampliado na migration)
9. Fechamento: lint/typecheck/testes + nova resolução 10.XX no `plano.md`
   registrando as decisões (vínculo com avaliação, atrasada na leitura,
   período não filtra, origem preparada para email)

### 7. Convenções preservadas

- Funções puras com teste em `calculos.ts`; atividade é data colada (nada de
  recorrência — 10.5 não se aplica).
- Feature não importa feature: Calendário e Home só leem Estudos; o vínculo
  com avaliação é coluna, não import.
- Nenhuma mudança no kernel (`lib/`); sem trigger novo; agregação leve na
  leitura (10.9).
- Padrões de UX do projeto: formulário em folha no mobile, `CampoDecimal`
  quando houver campo decimal, alvo de toque 44px, lista em vez de tabela.

### 8. Decisões menores abertas (tomadas por padrão, reversíveis)

- Aba fica depois de Avaliações (`defaultValue` da página continua "Notas").
- `CardMateria` **não** ganha contagem de entrega no MVP — o card "Entregas"
  do hub cobre a resposta; o card da matéria segue só com a próxima
  avaliação.
- Atraso conta por dia, não por horário (`hora_entrega` é informativa).
