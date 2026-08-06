-- =============================================================================
-- Metas — meta unificada entre pilares (spec: docs/superpowers/specs/2026-08-05-metas-design.md)
--
-- Hoje "meta" existia fragmentada: categorias.meta_mensal (Financeiro),
-- marcos_projeto (Projetos), personal_records (Treino), nada em Estudos/Sono.
-- `metas` é um dado único com 4 formas (tipo), e vínculo opcional com um pilar
-- via uma FK nula por linha — no máximo uma preenchida, checado na aplicação.
--
-- `valor_alvo` é independente de `categorias.meta_mensal`: o vínculo serve só
-- para saber de onde tirar o progresso real, nunca para herdar o alvo.
-- =============================================================================

create table public.metas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('numerica', 'marco', 'habito', 'livre')),
  titulo text not null,
  descricao text,
  criada_em timestamptz not null default now(),
  data_alvo date,
  concluida boolean not null default false,

  categoria_id uuid references public.categorias(id),
  materia_id uuid references public.materias(id),
  tipo_treino_id uuid references public.tipos_treino(id),
  projeto_id uuid references public.projetos(id),

  valor_alvo numeric,
  valor_atual_manual numeric,
  unidade text,

  frequencia_alvo int,
  frequencia_periodo text check (frequencia_periodo is null or frequencia_periodo = 'semana')
);

comment on table public.metas is
  'Meta unificada entre pilares. No máximo uma FK de pilar (categoria_id/materia_id/tipo_treino_id/projeto_id) preenchida por linha — checado na aplicação, não aqui. valor_alvo é independente de categorias.meta_mensal.';

create table public.metas_checkins (
  id uuid primary key default gen_random_uuid(),
  meta_id uuid not null references public.metas(id) on delete cascade,
  data date not null,
  feito boolean not null default true,
  unique (meta_id, data)
);

comment on table public.metas_checkins is
  'Um check-in por dia por meta de hábito. feito=false representa um dia explicitamente marcado como não feito (distinto de nenhum registro).';

create index metas_categoria_id_idx on public.metas(categoria_id) where categoria_id is not null;
create index metas_materia_id_idx on public.metas(materia_id) where materia_id is not null;
create index metas_tipo_treino_id_idx on public.metas(tipo_treino_id) where tipo_treino_id is not null;
create index metas_projeto_id_idx on public.metas(projeto_id) where projeto_id is not null;
create index metas_checkins_meta_id_idx on public.metas_checkins(meta_id);

-- -----------------------------------------------------------------------------
-- progresso_meta: agrega o dado real do pilar linkado, no período da meta
-- (entre criada_em e data_alvo, ou até hoje se data_alvo for nulo). Espelha a
-- convenção já usada por progresso_categoria/calcular_media_materia.
-- -----------------------------------------------------------------------------

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
      and l.data >= m.criada_em::date
      and (m.data_alvo is null or l.data <= m.data_alvo);

  elsif m.materia_id is not null then
    select coalesce(sum(s.duracao_minutos), 0) into resultado
    from public.sessoes_estudo s
    where s.materia_id = m.materia_id
      and s.data >= m.criada_em::date
      and (m.data_alvo is null or s.data <= m.data_alvo);

  elsif m.tipo_treino_id is not null then
    select count(*) into resultado
    from public.execucoes_treino e
    join public.treinos t on t.id = e.treino_id
    where t.tipo_id = m.tipo_treino_id
      and e.data >= m.criada_em::date
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

comment on function public.progresso_meta(uuid) is
  'Progresso real de uma meta numérica linkada a um pilar. Retorna null se a meta não existe ou não tem link (nesse caso o cliente usa valor_atual_manual).';
