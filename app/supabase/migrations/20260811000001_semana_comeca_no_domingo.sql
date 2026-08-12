-- =============================================================================
-- Semana passa a começar no domingo (spec 2)
--
-- `semana_inicio` guarda o primeiro dia da semana, então toda linha precisa da
-- nova âncora. Esta é a única tabela chaveada por semana: o resto do sistema
-- deriva a semana de um intervalo de datas na hora.
--
-- O domingo não anda junto com o resto. Numa semana ancorada na segunda M, o
-- domingo é M+6 e FECHA a semana; com semanas em domingo, esse mesmo dia ABRE a
-- semana M+6. Um `- 1 day` cego o jogaria sete dias para trás — o planejamento
-- de um domingo apareceria no domingo da semana anterior, silenciosamente.
--
-- O unique (semana_inicio, dia_semana, categoria_id) sobrevive: a semana M+6
-- passa a conter o domingo vindo da semana antiga M e os dias 1-6 vindos da
-- semana antiga M+7 — chaves distintas.
--
-- NÃO É IDEMPOTENTE: rodar duas vezes desloca duas vezes.
--
-- RLS permanece desabilitado (resoluções 10.0/10.8).
-- =============================================================================

update public.planejamento_semanal_financeiro
set semana_inicio = case
  when dia_semana = 0 then semana_inicio + 6
  else semana_inicio - 1
end;
