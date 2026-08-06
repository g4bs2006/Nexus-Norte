-- =============================================================================
-- Início e fim do período da matéria (plano 3, discussão em uso — 06/08)
--
-- `semestre` era texto livre ("2026.2"), sem data nenhuma por trás — não
-- alimentava nada. Consequência real: o fluxograma de uma matéria segue
-- gerando "aula hoje" pra sempre, mesmo depois do semestre acabar, até
-- alguém apagar o horário à mão.
--
-- Fica na MATÉRIA, não em cada linha de `fluxograma_semanal`: uma matéria
-- pode ter Segunda e Quarta na grade, e a data é a mesma para as duas — se
-- morasse em cada linha, duplicaria o mesmo dado e arriscaria divergir (fonte
-- única de verdade). `expandirRecorrencia`/`fluxograma_semanal` continuam sem
-- saber de período nenhum; quem lê a ocorrência é que cruza com o período da
-- matéria (`dentroDoPeriodo`, em calculos.ts).
--
-- As duas colunas são opcionais: matéria sem período definido continua
-- funcionando exatamente como antes (aula sempre aparece).
-- =============================================================================

alter table public.materias
  add column if not exists data_inicio date,
  add column if not exists data_fim date;

alter table public.materias
  add constraint materias_periodo_valido check (
    data_inicio is null or data_fim is null or data_fim >= data_inicio
  );

comment on column public.materias.data_inicio is
  'Início do período de aulas (ex: início do semestre). Nulo = sem limite inferior — a aula sempre apareceu em Aulas de hoje/Calendário, e sem data continua assim.';

comment on column public.materias.data_fim is
  'Fim do período de aulas. Nulo = sem limite superior. Com data, o fluxograma da matéria some de Aulas de hoje e da agenda do Calendário fora do intervalo [data_inicio, data_fim].';
