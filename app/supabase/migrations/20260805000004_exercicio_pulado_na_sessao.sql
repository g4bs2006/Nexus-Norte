-- =============================================================================
-- Exercício pulado numa sessão (resolução 10.22)
--
-- Pular acontece: a máquina está ocupada, o ombro doeu, o tempo acabou. Sem
-- registro disso, as séries do exercício ficavam em branco no diálogo parecendo
-- pendência, e o contador de progresso mentia — "9 de 12" lê como trabalho
-- deixado pela metade quando na verdade o treino terminou.
--
-- Tabela em vez de estado local porque a sessão foi feita para ser abandonada e
-- retomada (10.21): um pulo que evapora ao fechar o app contradiz isso. E como
-- fato registrado ele passa a ser informação — "pulei este exercício nas últimas
-- três sessões" é sinal de que ele não está funcionando no treino.
--
-- Presença = pulado, como em `conclusoes_fluxograma` (10.15). Desfazer apaga a
-- linha em vez de gravar `false`: a tabela só registra o que de fato aconteceu.
-- =============================================================================

create table public.execucoes_pulados (
  id uuid primary key default gen_random_uuid(),
  execucao_treino_id uuid not null
    references public.execucoes_treino (id) on delete cascade,
  exercicio_id uuid not null
    references public.exercicios_treino (id) on delete cascade,
  created_at timestamptz not null default now(),

  -- Pular duas vezes o mesmo exercício na mesma sessão não significa nada
  unique (execucao_treino_id, exercicio_id)
);

create index execucoes_pulados_execucao_idx
  on public.execucoes_pulados (execucao_treino_id);

-- Cobre a FK para o linter do Supabase e serve à pergunta "com que frequência
-- pulo este exercício?"
create index execucoes_pulados_exercicio_idx
  on public.execucoes_pulados (exercicio_id);

comment on table public.execucoes_pulados is
  'Exercícios marcados como pulados numa sessão. Presença = pulado; só vale para exercício sem nenhuma série gravada.';

-- Pular só vale para exercício sem nenhuma série gravada naquela sessão.
--
-- Fez 2 de 4 séries não é "pulado", é "fez 2 de 4" — e o dado já diz isso sozinho.
-- As duas coisas juntas seriam incoerentes: o exercício apareceria no histórico ao
-- mesmo tempo como feito e como pulado. Fica no banco e não só no formulário
-- porque é uma regra sobre o significado do dado, não sobre a ordem de cliques.
create or replace function public.trg_pulado_so_sem_series()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.execucoes_exercicio
    where execucao_treino_id = new.execucao_treino_id
      and exercicio_id = new.exercicio_id
  ) then
    raise exception
      'exercício com série registrada não pode ser marcado como pulado';
  end if;
  return new;
end;
$$;

create trigger pulado_so_sem_series
  before insert or update on public.execucoes_pulados
  for each row execute function public.trg_pulado_so_sem_series();
