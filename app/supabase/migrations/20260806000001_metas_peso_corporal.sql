-- =============================================================================
-- Vínculo de meta numérica com peso corporal (resolução 10.34)
--
-- `registro_corporal` não é uma entidade escolhível como categoria/matéria/tipo
-- de treino/projeto — é peso ao longo do tempo, uma linha por dia, sem FK para
-- nada. Por isso o vínculo aqui é um booleano (`usa_peso_corporal`), não mais um
-- `uuid references`: não existe "qual registro corporal" escolher, só "usar o
-- histórico de peso ou não".
--
-- Semântica de `valor_alvo` para este vínculo: quilos a perder (ou ganhar, se
-- negativo o resultado), não peso final absoluto — decisão confirmada com o
-- usuário, bate com a meta "Perder 12kg" já criada com alvo=12.
-- =============================================================================

alter table public.metas
  add column if not exists usa_peso_corporal boolean not null default false;

comment on column public.metas.usa_peso_corporal is
  'Vínculo com peso corporal (registro_corporal) — alternativa aos FKs de pilar. No máximo um vínculo por meta (checado na aplicação, incluindo este). valor_alvo representa quilos a perder desde o início da meta, não peso final absoluto.';

create or replace function public.progresso_meta(p_meta_id uuid)
returns numeric
language plpgsql
as $$
declare
  m record;
  resultado numeric;
  peso_inicial numeric;
  peso_atual numeric;
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

  elsif m.usa_peso_corporal then
    -- Peso mais recente conhecido até o início da meta (a "linha de base") e até
    -- o prazo (ou hoje, sem prazo). Sem registro em algum dos dois pontos, não
    -- dá para calcular — null, não um número inventado.
    select peso into peso_inicial
    from public.registro_corporal
    where data <= m.data_inicio
    order by data desc
    limit 1;

    select peso into peso_atual
    from public.registro_corporal
    where data <= coalesce(m.data_alvo, current_date)
    order by data desc
    limit 1;

    if peso_inicial is null or peso_atual is null then
      resultado := null;
    else
      resultado := peso_inicial - peso_atual;
    end if;

  else
    resultado := null;
  end if;

  return resultado;
end;
$$;

comment on function public.progresso_meta(uuid) is
  'Progresso real de uma meta numérica linkada a um pilar (ou a peso corporal). Retorna null se a meta não existe, não tem link, ou faltam dados no período (nesse caso o cliente usa valor_atual_manual).';
