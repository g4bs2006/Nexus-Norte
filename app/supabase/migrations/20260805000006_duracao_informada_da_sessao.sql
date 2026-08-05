-- =============================================================================
-- Duração informada da sessão (corrige 10.21 / 10.23 — resolução 10.24)
--
-- A duração era DERIVADA de `finalizado_em - created_at`. Esses dois timestamps
-- medem quanto tempo o usuário passou REGISTRANDO, não quanto durou o treino, e
-- só coincidem quando a sessão é anotada série a série do começo ao fim.
--
-- Nas duas sessões reais que existiam, o número estava errado: uma marcava 0 min
-- (registro em lote, `finalizado_em = created_at` pelo backfill) e a outra 18 min
-- para um treino feito horas antes. Um número errado é pior que nenhum.
--
-- Vira coluna própria, informada pelo usuário. Nulo = não informado, e a tela
-- mostra "—" em vez de inventar. O intervalo de registro continua disponível a
-- partir dos timestamps, exibido como contexto e não como resposta.
-- =============================================================================

alter table public.execucoes_treino
  add column duracao_minutos int
    check (duracao_minutos is null or duracao_minutos > 0);

comment on column public.execucoes_treino.duracao_minutos is
  'Duração do treino em minutos, informada pelo usuário. Nulo = não informado. NÃO derivar de created_at/finalizado_em: aqueles medem o tempo de registro, não o de treino.';
