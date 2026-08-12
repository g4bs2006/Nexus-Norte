-- =============================================================================
-- Cor, local e anotações da matéria (discussão em uso — 12/08)
--
-- Quatro colunas novas, todas opcionais — matéria existente continua
-- funcionando sem elas:
--
-- `cor`: mesma paleta fixa de `categorias.cor` (lib/cores.ts), não hex livre —
-- garante leitura consistente nos dois temas e reaproveita o `SeletorCor` já
-- usado em Financeiro. Alimenta o ponto do card e a grade do fluxograma
-- semanal (`GradeFluxograma` já aceita `item.cor`, só faltava alguém preencher
-- pra matéria).
--
-- `local`: onde a aula acontece (sala, bloco, link de aula remota). Solto da
-- ideia de "professor" — uma matéria pode trocar de sala no meio do período
-- sem que isso seja outro dado.
--
-- `notas_estudo` / `notas_particularidades`: dois campos de texto livre com
-- propósitos diferentes — o primeiro é o que muda (resumos, o que revisar), o
-- segundo é o que não muda (email do professor, política de faltas). Separar
-- evita que a nota do dia se perca no meio de informação de referência.
-- =============================================================================

alter table public.materias
  add column if not exists cor text,
  add column if not exists local text,
  add column if not exists notas_estudo text,
  add column if not exists notas_particularidades text;

comment on column public.materias.cor is
  'Cor de identificação visual da matéria, restrita à paleta do design system (lib/cores.ts). Nulo = cai na cor do pilar Estudos.';

comment on column public.materias.local is
  'Onde a aula acontece — sala, bloco, link de aula remota. Opcional.';

comment on column public.materias.notas_estudo is
  'Anotações de estudo: conteúdo, resumos, o que revisar. Muda com frequência.';

comment on column public.materias.notas_particularidades is
  'Particularidades da matéria: email do professor, política de faltas, etc. Estável, referência.';
