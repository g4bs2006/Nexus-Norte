-- Reset explicito do historico financeiro para a migracao Financeiro Caixa.
--
-- Execute este script conscientemente, antes de
-- migrations/20260906000001_financeiro_caixa.sql. DELETE (e nao TRUNCATE)
-- preserva o disparo do trigger lancamentos_resumo e recalcula os campos-resumo
-- das categorias afetadas. Nenhuma outra tabela e apagada.

begin;

delete from public.lancamentos;

commit;
