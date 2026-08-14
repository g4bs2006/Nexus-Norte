-- =============================================================================
-- Treino ganha data própria (chat 2026-08-14)
--
-- Até aqui, agendar um treino gravava uma linha em `fluxograma_semanal` com
-- `dia_semana` — e por ser recorrência expandida no cliente
-- (`expandirRecorrencia`), o treino aparecia em TODA semana, passada e
-- futura, sem jeito de marcar "só nesta data". `treinos_agendados` corrige
-- isso: cada linha é uma data concreta, sem repetição implícita.
--
-- `fluxograma_semanal` continua intacta — Estudos (materia_id) e os blocos
-- de trabalho/rótulo livre seguem usando o padrão semanal normalmente. Só o
-- pilar Treino para de escrever ali.
--
-- As linhas de treino que já existiam no fluxograma são convertidas para a
-- próxima ocorrência daquele dia da semana a partir de hoje — perde-se a
-- repetição, mas não a marcação em si — e então removidas; o
-- `on delete cascade` de `excecoes_fluxograma` limpa qualquer exceção
-- pendente ligada a elas.
-- =============================================================================

create table public.treinos_agendados (
  id uuid primary key default gen_random_uuid(),
  treino_id uuid not null references public.treinos (id) on delete cascade,
  data date not null,
  horario_inicio time not null,
  horario_fim time not null,
  created_at timestamptz not null default now(),
  constraint treinos_agendados_horario_valido check (horario_fim > horario_inicio)
);

create index treinos_agendados_data_idx on public.treinos_agendados (data);
create index treinos_agendados_treino_idx on public.treinos_agendados (treino_id);

comment on table public.treinos_agendados is
  'Treino marcado numa data concreta — substitui o uso de fluxograma_semanal (dia_semana) para o pilar Treino. Sem repetição implícita: cada linha é um dia.';

-- Migra o padrão semanal existente para a próxima ocorrência de cada dia
-- (0 = domingo, igual ao dia_semana e ao Date.getDay() do cliente)
insert into public.treinos_agendados (treino_id, data, horario_inicio, horario_fim)
select
  f.treino_id,
  current_date
    + (((f.dia_semana - extract(dow from current_date)::int) + 7) % 7),
  f.horario_inicio,
  f.horario_fim
from public.fluxograma_semanal f
where f.treino_id is not null;

delete from public.fluxograma_semanal where treino_id is not null;
