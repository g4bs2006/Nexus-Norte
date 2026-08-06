-- =============================================================================
-- Linha de base do peso corporal usava data <= data_inicio (corrige 10.34)
--
-- Achado testando com um peso registrado no MESMO dia em que a meta foi criada:
-- peso_inicial e peso_atual pegavam o mesmo registro (o de hoje), e o delta
-- saía sempre 0 — mesmo tendo perdido peso de verdade desde um registro
-- anterior. `<=` deixa um pesagem do dia da meta redefinir a própria linha de
-- base em vez de contar como progresso.
--
-- peso_inicial passa a exigir `data < data_inicio` (estritamente antes): é o
-- peso conhecido no momento em que a meta nasceu, fixo dali em diante. Qualquer
-- pesagem a partir do dia de criação da meta (inclusive) é progresso, nunca
-- baseline.
-- =============================================================================

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
    select peso into peso_inicial
    from public.registro_corporal
    where data < m.data_inicio
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
