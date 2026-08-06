-- =============================================================================
-- Notificações push (discussão em uso, 06/08)
--
-- Duas tabelas novas, nenhuma reaproveitando dado de pilar — as fontes reais
-- (fluxograma_semanal, lancamentos, avaliacoes, metas) continuam sendo donas
-- do próprio dado; aqui só vive o necessário pra mandar push.
--
-- `push_subscriptions` — a "inscrição" que o navegador gera ao autorizar
-- notificação (endpoint + chaves criptográficas do protocolo Web Push).
-- Único por `endpoint`: reinstalar o app ou reautorizar gera um novo endpoint,
-- então duplicar aqui é o caso raro, não a regra.
--
-- `notificacoes_enviadas` — dedup. Sem isso, toda vez que o cron rodasse e
-- ainda visse "aula em 15 min" pra a mesma ocorrência, mandaria de novo. A
-- chave (tipo, origem_id, data_referencia) é o que torna uma notificação
-- única: a MESMA aula de fluxograma em duas terças diferentes são dois
-- avisos válidos, não um só.
-- =============================================================================

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

comment on table public.push_subscriptions is
  'Inscrições de push do navegador (Web Push: endpoint + chaves). Uma por navegador/instalação que autorizou notificação.';

create table public.notificacoes_enviadas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('aula_treino', 'conta', 'prova', 'meta')),
  -- Id da linha de origem (fluxograma_id, lancamento_id, avaliacao_id, meta_id)
  -- guardado como texto: são uuids de tabelas diferentes conforme o tipo, e
  -- não vale a pena quatro colunas nullable só pra isso.
  origem_id text not null,
  data_referencia date not null,
  enviado_em timestamptz not null default now(),
  unique (tipo, origem_id, data_referencia)
);

comment on table public.notificacoes_enviadas is
  'Dedup de notificação push. A chave única (tipo, origem_id, data_referencia) é o que impede reenviar o mesmo aviso a cada execução do cron.';
