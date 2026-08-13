-- =============================================================================
-- Hora de início da sessão de estudo (discussão em uso — 13/08)
--
-- `sessoes_estudo` guardava data e duração, sem hora nenhuma. Por isso
-- `eventosSessoesEstudo` sempre emitia evento de DIA INTEIRO, e a sessão
-- registrada ficava no topo do dia no calendário, sem lugar na linha do tempo —
-- ao contrário do treino, que informa `hora_inicio` desde a resolução 10.23.
--
-- Opcional, como em `execucoes_treino`: sessão sem hora continua sendo dia
-- inteiro. Preferir a ausência a inventar uma hora é a mesma regra da 10.24 —
-- `created_at` diz quando o REGISTRO foi feito, nunca quando o estudo foi.
--
-- A hora de fim não é coluna: sai de `hora_inicio + duracao_minutos`, que já é
-- obrigatória. Guardar as duas abriria espaço para elas discordarem.
-- =============================================================================

alter table public.sessoes_estudo
  add column if not exists hora_inicio time;

comment on column public.sessoes_estudo.hora_inicio is
  'Hora informada pelo usuário. Nulo = sessão sem hora, vira evento de dia inteiro no calendário. Nunca derivar de created_at (resolução 10.24).';
