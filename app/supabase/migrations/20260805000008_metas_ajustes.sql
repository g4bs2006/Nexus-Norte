-- Ajustes pós-revisão da feature Metas (Important #3):
-- 1) FKs de pilar sem `on delete` — excluir uma categoria/matéria/tipo de
--    treino/projeto vinculado quebrava a meta (violação de FK). Agora o
--    vínculo é limpo (`set null`) em vez de bloquear a exclusão do pilar.
-- 2) `criada_em::date` em progresso_meta() era ambíguo: criada_em é
--    timestamptz e o cast ::date resolve no timezone do servidor, não no do
--    usuário. Substituído por uma coluna própria `data_inicio` (DATE local).

alter table public.metas drop constraint metas_categoria_id_fkey;
alter table public.metas add constraint metas_categoria_id_fkey
  foreign key (categoria_id) references public.categorias(id) on delete set null;

alter table public.metas drop constraint metas_materia_id_fkey;
alter table public.metas add constraint metas_materia_id_fkey
  foreign key (materia_id) references public.materias(id) on delete set null;

alter table public.metas drop constraint metas_tipo_treino_id_fkey;
alter table public.metas add constraint metas_tipo_treino_id_fkey
  foreign key (tipo_treino_id) references public.tipos_treino(id) on delete set null;

alter table public.metas drop constraint metas_projeto_id_fkey;
alter table public.metas add constraint metas_projeto_id_fkey
  foreign key (projeto_id) references public.projetos(id) on delete set null;

alter table public.metas add column data_inicio date not null default current_date;

comment on column public.metas.data_inicio is
  'Início do período usado por progresso_meta() para agregar dados do pilar linkado. Coluna própria (não derivada de criada_em::date) porque criada_em é timestamptz e o cast ::date resolveria no timezone do servidor, não no do usuário.';

create or replace function public.progresso_meta(p_meta_id uuid)
returns numeric
language plpgsql
as $$
declare
  m record;
  resultado numeric;
begin
  select * into m from public.metas where id = p_meta_id;
  if m is null then
    return null;
  end if;

  if m.categoria_id is not null then
    select coalesce(sum(l.valor), 0) into resultado
    from public.lancamentos l
    where l.categoria_id = m.categoria_id
      and l.data >= m.data_inicio
      and (m.data_alvo is null or l.data <= m.data_alvo);

  elsif m.materia_id is not null then
    select coalesce(sum(s.duracao_minutos), 0) into resultado
    from public.sessoes_estudo s
    where s.materia_id = m.materia_id
      and s.data >= m.data_inicio
      and (m.data_alvo is null or s.data <= m.data_alvo);

  elsif m.tipo_treino_id is not null then
    select count(*) into resultado
    from public.execucoes_treino e
    join public.treinos t on t.id = e.treino_id
    where t.tipo_id = m.tipo_treino_id
      and e.data >= m.data_inicio
      and (m.data_alvo is null or e.data <= m.data_alvo);

  elsif m.projeto_id is not null then
    select case
             when count(*) = 0 then 0
             else round(100.0 * count(*) filter (where status = 'feito') / count(*), 1)
           end into resultado
    from public.marcos_projeto
    where projeto_id = m.projeto_id;

  else
    resultado := null;
  end if;

  return resultado;
end;
$$;
