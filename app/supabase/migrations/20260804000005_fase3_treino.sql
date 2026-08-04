-- =============================================================================
-- Fase 3 — Treino (plano, seção 4.1 / 4.2 + resoluções 10.1, 10.6)
--
-- Resolução 10.17 (nova): o plano definia `treinos.dias_semana int[]` (4.1) E
-- usava o fluxograma para o "treino de hoje" (4.3) — duas fontes de verdade
-- para o mesmo fato, que sairiam de sincronia. `dias_semana` foi descartada; o
-- fluxograma é a fonte única, e `frequencia_semana` compara execuções reais com
-- as ocorrências previstas nele.
--
-- Convenção: cada linha de `execucoes_exercicio` representa UMA SÉRIE. É o que
-- permite o volume ser Σ(reps × carga) sem depender do número de séries
-- planejado.
-- =============================================================================

create table public.treinos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text,
  created_at timestamptz not null default now()
);

create table public.exercicios_treino (
  id uuid primary key default gen_random_uuid(),
  treino_id uuid not null references public.treinos (id) on delete cascade,
  nome text not null,
  -- Resolução 10.1: exigido por volume_grupo_muscular (4.2), ausente no plano
  grupo_muscular text,
  series int not null default 3 check (series > 0),
  reps_alvo int check (reps_alvo > 0),
  carga_alvo numeric check (carga_alvo >= 0),
  descanso_segundos int check (descanso_segundos >= 0),
  created_at timestamptz not null default now()
);

create index exercicios_treino_treino_idx on public.exercicios_treino (treino_id);

create table public.execucoes_treino (
  id uuid primary key default gen_random_uuid(),
  treino_id uuid not null references public.treinos (id) on delete cascade,
  data date not null,
  created_at timestamptz not null default now()
);

create index execucoes_treino_data_idx on public.execucoes_treino (data desc);
create index execucoes_treino_treino_idx
  on public.execucoes_treino (treino_id, data desc);

create table public.execucoes_exercicio (
  id uuid primary key default gen_random_uuid(),
  execucao_treino_id uuid not null
    references public.execucoes_treino (id) on delete cascade,
  exercicio_id uuid not null
    references public.exercicios_treino (id) on delete cascade,
  carga_real numeric not null check (carga_real >= 0),
  reps_reais int not null check (reps_reais > 0),
  -- Escala de esforço percebido, 1-10
  rpe int check (rpe between 1 and 10)
);

create index execucoes_exercicio_execucao_idx
  on public.execucoes_exercicio (execucao_treino_id);
create index execucoes_exercicio_exercicio_idx
  on public.execucoes_exercicio (exercicio_id);

create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  exercicio_id uuid not null
    references public.exercicios_treino (id) on delete cascade,
  data date not null,
  carga numeric not null,
  reps int not null,
  -- Epley: carga * (1 + reps/30)
  um_rm_estimado numeric not null,
  created_at timestamptz not null default now()
);

create index personal_records_exercicio_idx
  on public.personal_records (exercicio_id, um_rm_estimado desc);

create table public.registro_corporal (
  id uuid primary key default gen_random_uuid(),
  data date not null unique,
  peso numeric check (peso > 0),
  medidas jsonb,
  -- Bucket progresso-treino (resolução 10.10)
  foto_storage_path text,
  created_at timestamptz not null default now()
);

create index registro_corporal_data_idx on public.registro_corporal (data desc);

create table public.registro_lesoes (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  regiao text not null,
  intensidade int not null check (intensidade between 1 and 10),
  observacao text,
  created_at timestamptz not null default now()
);

create index registro_lesoes_data_idx on public.registro_lesoes (data desc);

-- =============================================================================
-- Fluxograma: adiciona treino_id (resolução 10.6, prevista na nota 10.13)
--
-- materia_id passa a ser nullable e o check constraint garante que exatamente
-- uma das duas FKs esteja preenchida — é o que substitui a referência
-- polimórfica original sem perder integridade.
-- =============================================================================

alter table public.fluxograma_semanal
  alter column materia_id drop not null;

alter table public.fluxograma_semanal
  add column treino_id uuid references public.treinos (id) on delete cascade;

alter table public.fluxograma_semanal
  add constraint fluxograma_um_pilar check (
    (materia_id is not null and treino_id is null)
    or (materia_id is null and treino_id is not null)
  );

create index fluxograma_treino_idx on public.fluxograma_semanal (treino_id)
  where treino_id is not null;

-- =============================================================================
-- PR automático (plano 4.2)
--
-- A cada execução de exercício, calcula o 1RM estimado por Epley e grava um
-- novo PR se superar o melhor já registrado. Feito em trigger, não no cliente:
-- garante que nenhuma execução escape do cálculo, mesmo se inserida por outro
-- caminho.
-- =============================================================================

create or replace function public.trg_registrar_pr()
returns trigger
language plpgsql
as $$
declare
  v_1rm numeric;
  v_melhor numeric;
  v_data date;
begin
  -- Epley
  v_1rm := new.carga_real * (1 + new.reps_reais / 30.0);

  select data into v_data
    from public.execucoes_treino
   where id = new.execucao_treino_id;

  select max(um_rm_estimado) into v_melhor
    from public.personal_records
   where exercicio_id = new.exercicio_id;

  if v_melhor is null or v_1rm > v_melhor then
    insert into public.personal_records
      (exercicio_id, data, carga, reps, um_rm_estimado)
    values
      (new.exercicio_id, v_data, new.carga_real, new.reps_reais, v_1rm);
  end if;

  return null;
end;
$$;

create trigger execucoes_exercicio_pr
after insert on public.execucoes_exercicio
for each row execute function public.trg_registrar_pr();

-- =============================================================================
-- Storage: bucket de fotos de progresso (resolução 10.10)
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('progresso-treino', 'progresso-treino', false)
on conflict (id) do nothing;

create policy "anon acessa progresso-treino"
  on storage.objects
  for all
  to anon
  using (bucket_id = 'progresso-treino')
  with check (bucket_id = 'progresso-treino');
