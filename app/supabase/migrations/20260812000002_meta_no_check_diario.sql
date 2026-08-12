-- =============================================================================
-- Meta participa do check do dia (discussão em uso — 12/08)
--
-- O bloco de checks da Home reunia só o check financeiro, o ritual de domingo
-- e as ocorrências do fluxograma (aula/treino). Metas viviam numa seção
-- separada mais abaixo — ou seja, o hábito que você quer manter todo dia não
-- estava onde você olha todo dia.
--
-- `no_check_diario` é o liga/desliga por meta: ligada, a meta entra na lista de
-- checks do dia e conta no placar X/Y junto do resto.
--
-- Não vale para meta numérica: o check do dia é binário (fez / não fez) e
-- numérica não tem estado booleano nenhum — tem valor e alvo. O CHECK abaixo
-- registra isso no banco em vez de deixar a regra só no formulário, mesma
-- técnica de `categorias_tipo_por_natureza`.
--
-- Qual booleano é alternado depende do tipo, e é decidido no cliente:
--   - habito       -> check-in do dia em `metas_checkins` (reseta todo dia)
--   - marco, livre -> a coluna `concluida` (uma vez só, não reseta)
-- =============================================================================

alter table public.metas
  add column if not exists no_check_diario boolean not null default false;

alter table public.metas
  add constraint metas_check_diario_exige_booleano check (
    no_check_diario = false or tipo <> 'numerica'
  );

comment on column public.metas.no_check_diario is
  'Liga/desliga: a meta aparece na lista de checks do dia na Home e conta no placar. Proibido para tipo numerica (sem estado booleano). Habito alterna o check-in do dia; marco e livre alternam `concluida`.';
