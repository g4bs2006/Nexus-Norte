-- =============================================================================
-- Sessão de estudo ganha estado planejado (chat 2026-08-14)
--
-- `sessoes_estudo` sempre representou só o fato consumado (é o "executado" —
-- equivalente a `execucoes_treino`). Não existia nada equivalente a
-- `treinos_agendados`: a única coisa "prevista" em Estudos era a aula
-- recorrente semanal (`fluxograma_semanal.materia_id`), que é rotina de todo
-- dia da semana marcado, não uma sessão avulsa com data própria.
--
-- Esta migration cria essa peça que faltava, na mesma forma de
-- `treinos_agendados` (data concreta, sem repetição), mas seguindo a
-- convenção que Estudos já usa: duração + hora opcional, não intervalo
-- início/fim — `sessoes_estudo` nunca teve "fim", e não é aqui que essa
-- convenção muda.
--
-- `sessoes_estudo` não é tocada: já era só o executado, então esta migration
-- é puramente aditiva. Reconciliação com o planejado é por matéria + data
-- (mesma ideia de `chaveTreinoData`), sem FK entre as duas tabelas — igual
-- ao treino, evita reescrever o executado quando o planejado muda ou some.
-- =============================================================================

create table public.sessoes_estudo_planejadas (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references public.materias (id) on delete cascade,
  data date not null,
  -- Mesma regra de sessoes_estudo.hora_inicio: nulo = sem hora, dia inteiro.
  hora_inicio time,
  duracao_minutos int not null check (duracao_minutos > 0),
  created_at timestamptz not null default now()
);

create index sessoes_estudo_planejadas_materia_idx
  on public.sessoes_estudo_planejadas (materia_id, data desc);
create index sessoes_estudo_planejadas_data_idx
  on public.sessoes_estudo_planejadas (data desc);

comment on table public.sessoes_estudo_planejadas is
  'Sessão de estudo marcada numa data concreta — o "planejado" de Estudos, irmã de treinos_agendados. sessoes_estudo continua sendo o "executado".';
