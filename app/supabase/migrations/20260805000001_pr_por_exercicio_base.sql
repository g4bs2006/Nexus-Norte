-- =============================================================================
-- PR por exercício base (resolução 10.18, terceira parte)
--
-- `personal_records.exercicio_id` apontava para `exercicios_treino`, que é POR
-- TREINO. Isso não era só desorganização, era erro de cálculo: o trigger
-- comparava o 1RM apenas contra os PRs da mesma linha, então com Supino
-- Inclinado no Push e no Upper, levantar 100kg no Push depois de ter feito 105kg
-- no Upper registrava um "recorde" que não era recorde.
--
-- O recorde pertence ao EXERCÍCIO, não ao exercício-dentro-de-um-treino.
-- A série continua apontando para exercicios_treino — ela acontece num treino
-- específico, e isso é correto.
--
-- Aplicada com 0 personal_records e 0 execucoes_exercicio, então sem risco de
-- perda. O bloco `do` protege o caso de haver dado numa reaplicação.
-- =============================================================================

alter table public.personal_records
  add column exercicio_base_id uuid references public.biblioteca_exercicios (id) on delete cascade;

update public.personal_records p
   set exercicio_base_id = e.exercicio_base_id
  from public.exercicios_treino e
 where e.id = p.exercicio_id;

do $$
declare
  v_orfaos int;
begin
  select count(*) into v_orfaos
    from public.personal_records
   where exercicio_base_id is null;

  if v_orfaos > 0 then
    raise exception 'Abortado: % personal_records sem exercicio_base_id.', v_orfaos;
  end if;
end $$;

alter table public.personal_records
  alter column exercicio_base_id set not null;

drop index if exists personal_records_exercicio_idx;
alter table public.personal_records drop column exercicio_id;

create index personal_records_base_idx
  on public.personal_records (exercicio_base_id, um_rm_estimado desc);

-- --- Trigger reescrito ------------------------------------------------------

create or replace function public.trg_registrar_pr()
returns trigger
language plpgsql
as $$
declare
  v_1rm numeric;
  v_melhor numeric;
  v_data date;
  v_base uuid;
begin
  -- Epley
  v_1rm := new.carga_real * (1 + new.reps_reais / 30.0);

  select data into v_data
    from public.execucoes_treino
   where id = new.execucao_treino_id;

  -- A série aponta para o exercício DO TREINO; o PR é do exercício base
  select exercicio_base_id into v_base
    from public.exercicios_treino
   where id = new.exercicio_id;

  -- Comparação agora atravessa todos os treinos que usam este exercício
  select max(um_rm_estimado) into v_melhor
    from public.personal_records
   where exercicio_base_id = v_base;

  if v_melhor is null or v_1rm > v_melhor then
    insert into public.personal_records
      (exercicio_base_id, data, carga, reps, um_rm_estimado)
    values
      (v_base, v_data, new.carga_real, new.reps_reais, v_1rm);
  end if;

  return null;
end;
$$;

comment on column public.personal_records.exercicio_base_id is
  'O recorde é do exercício, não do exercício-dentro-de-um-treino (10.18).';
