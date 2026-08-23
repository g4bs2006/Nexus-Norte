-- =============================================================================
-- Atividades (entregas com prazo) — feature Estudos
--
-- Atividade é entrega com data, não prova: a nota continua vivendo em
-- `avaliacoes` (que alimenta `materias.media_atual` via trigger). O vínculo
-- `avaliacao_id` é opcional: entregar pode criar/vincular uma avaliação.
--
-- Status é derivado na leitura: `concluida_em` null = pendente; "atrasada" =
-- pendente com `data_entrega` no passado. Sem trigger de campo-resumo —
-- contagem de atrasadas é agregação leve (resolução 10.9 do plano.md).
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

-- -----------------------------------------------------------------------------
-- Dedup de notificações push (`notificacoes_enviadas`) precisa conhecer o
-- novo tipo 'atividade' pra o push de "entrega amanhã" poder gravar sua
-- própria linha de dedup na mesma tabela dos demais avisos.
-- -----------------------------------------------------------------------------

alter table public.notificacoes_enviadas
  drop constraint notificacoes_enviadas_tipo_check;

alter table public.notificacoes_enviadas
  add constraint notificacoes_enviadas_tipo_check
  check (tipo in ('aula_treino', 'conta', 'prova', 'meta', 'atividade'));
