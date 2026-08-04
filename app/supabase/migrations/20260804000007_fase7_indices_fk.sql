-- =============================================================================
-- Fase 7 — Polimento: índices de cobertura para foreign keys (plano, seção 8)
--
-- Apontados pelo linter do Supabase. Sem índice na coluna da FK, o Postgres faz
-- varredura sequencial ao validar exclusões em cascata e nos joins por essa
-- coluna.
--
-- Os avisos de "índice não usado" do mesmo linter foram ignorados: o banco não
-- tem volume de uso ainda, então nenhum índice registrou leitura — remover
-- agora seria otimizar contra estatística vazia.
-- =============================================================================

-- Hierarquia de categorias (subcategoria -> categoria pai)
create index if not exists categorias_pai_idx
  on public.categorias (subcategoria_pai_id)
  where subcategoria_pai_id is not null;

-- O índice existente cobria treino_id (parcial) e dia_semana, mas não materia_id
create index if not exists fluxograma_materia_idx
  on public.fluxograma_semanal (materia_id)
  where materia_id is not null;

-- O índice existente cobria (semana_inicio, dia_semana), mas não categoria_id,
-- necessário para o ON DELETE CASCADE quando uma categoria é excluída
create index if not exists planejamento_semanal_categoria_idx
  on public.planejamento_semanal_financeiro (categoria_id);
