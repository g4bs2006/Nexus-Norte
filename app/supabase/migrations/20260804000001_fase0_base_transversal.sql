-- =============================================================================
-- Fase 0 — Schema base transversal (plano, seção 1.3)
--
-- Nota de ordenação: `fluxograma_semanal` e `excecoes_fluxograma` NÃO entram
-- aqui. A resolução 10.6 trocou a referência polimórfica por FKs reais para
-- `materias` e `treinos`, que só existem nas Fases 2 e 3. Essas tabelas são
-- criadas na migration da Fase 2 (com materia_id) e estendidas na Fase 3
-- (adicionando treino_id).
--
-- RLS: deliberadamente desabilitado — sistema single-user sem autenticação
-- (resoluções 10.0 e 10.8). Dívida técnica consciente, registrada no plano.
-- =============================================================================

-- Checks diários (ação, não resultado)
create table public.checks_diarios (
  id uuid primary key default gen_random_uuid(),
  data date not null unique,
  financeiro_registrado boolean not null default false,
  -- só relevante aos domingos, mas armazenado sem restrição para permitir
  -- ajuste retroativo do ritual de planejamento
  planejamento_semana_feito boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.checks_diarios is
  'Um registro por dia. Checks de ação diária (plano 2.4).';

-- Planejamento de sono (padrão recorrente por dia da semana)
create table public.planejamento_sono (
  id uuid primary key default gen_random_uuid(),
  -- 0 = domingo … 6 = sábado (convenção de Date.getDay() do JS)
  dia_semana smallint not null unique check (dia_semana between 0 and 6),
  hora_dormir_alvo time not null,
  hora_acordar_alvo time not null
);

comment on column public.planejamento_sono.dia_semana is
  '0 = domingo … 6 = sábado (alinhado a Date.getDay() no cliente).';

-- Registro real de sono
create table public.registro_sono (
  id uuid primary key default gen_random_uuid(),
  data date not null unique,
  hora_dormir_real time not null,
  hora_acordar_real time not null,
  -- Coluna gerada: horas dormidas, tratando a virada de meia-noite.
  -- mod(delta + 24h, 24h) resolve o caso hora_acordar < hora_dormir.
  horas_calculadas numeric generated always as (
    mod(
      extract(epoch from (hora_acordar_real - hora_dormir_real))::numeric + 86400,
      86400
    ) / 3600
  ) stored
);

comment on column public.registro_sono.horas_calculadas is
  'Derivada, nunca escrita pelo cliente. Trata sono que cruza a meia-noite.';

create index registro_sono_data_idx on public.registro_sono (data desc);
