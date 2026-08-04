-- =============================================================================
-- Apaga TODOS os dados do Nexus, preservando o schema.
--
-- Use para remover os dados de exemplo (seed.sql) antes de começar a usar o
-- sistema de verdade. Isto apaga dados reais também — não há distinção entre
-- exemplo e real no banco.
--
-- A ordem é irrelevante: `cascade` no truncate resolve as dependências.
-- =============================================================================

truncate table
  lancamentos,
  planejamento_semanal_financeiro,
  investimentos,
  categorias,
  avaliacoes,
  config_calculo_media,
  faltas,
  sessoes_estudo,
  registro_listas,
  documentos,
  conclusoes_fluxograma,
  excecoes_fluxograma,
  fluxograma_semanal,
  materias,
  execucoes_exercicio,
  execucoes_treino,
  personal_records,
  exercicios_treino,
  treinos,
  registro_corporal,
  registro_lesoes,
  marcos_projeto,
  log_progresso,
  projetos,
  checks_diarios,
  registro_sono,
  planejamento_sono
cascade;
