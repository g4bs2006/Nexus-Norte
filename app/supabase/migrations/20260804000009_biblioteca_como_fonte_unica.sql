-- =============================================================================
-- Biblioteca como fonte única (resolução 10.18, segunda parte)
--
-- Remove nome e grupo_muscular de exercicios_treino, e tipo de treinos. A
-- biblioteca passa a ser a única fonte de verdade: corrigir um grupo muscular em
-- um lugar corrige em todos os treinos.
--
-- Separada da migration anterior de propósito. A primeira é aditiva e
-- reversível; esta apaga colunas com dado dentro. O bloco `do` abaixo aborta se
-- a premissa (todo exercício vinculado) deixou de valer entre as duas.
-- =============================================================================

do $$
declare
  v_orfaos int;
begin
  select count(*) into v_orfaos
    from public.exercicios_treino
   where exercicio_base_id is null;

  if v_orfaos > 0 then
    raise exception
      'Abortado: % exercicios_treino sem exercicio_base_id. Remover nome agora perderia dado.',
      v_orfaos;
  end if;
end $$;

-- Agora que todo vínculo existe, a FK pode ser obrigatória
alter table public.exercicios_treino
  alter column exercicio_base_id set not null;

alter table public.exercicios_treino drop column nome;
alter table public.exercicios_treino drop column grupo_muscular;

-- `treinos.tipo` era texto livre; tipo_id o substitui. Diferente do exercício,
-- tipo é opcional — um treino pode não ter classificação.
alter table public.treinos drop column tipo;

comment on column public.exercicios_treino.exercicio_base_id is
  'Fonte única do nome e grupo muscular. Ler sempre via join na biblioteca.';
