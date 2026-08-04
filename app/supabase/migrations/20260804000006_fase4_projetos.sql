-- =============================================================================
-- Fase 4 — Projetos (plano, seção 5.1 / 5.2)
--
-- Sem campo-resumo por trigger: as duas métricas do pilar são calculadas na
-- leitura (resolução 10.9). `percentual_concluido` é uma contagem sobre poucas
-- linhas, e `dias_desde_ultima_atualizacao` depende da passagem do tempo — um
-- campo-resumo ficaria velho sozinho, sem nenhuma escrita acontecer.
-- =============================================================================

create table public.projetos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  status text not null default 'planejamento' check (
    status in ('planejamento', 'em_andamento', 'pausado', 'concluido')
  ),
  data_inicio date not null default current_date,
  prazo_alvo date,
  created_at timestamptz not null default now(),

  constraint projetos_prazo_apos_inicio check (
    prazo_alvo is null or prazo_alvo >= data_inicio
  )
);

create index projetos_status_idx on public.projetos (status);

create table public.marcos_projeto (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  nome text not null,
  status text not null default 'a_fazer' check (
    status in ('a_fazer', 'fazendo', 'feito')
  ),
  data_prevista date,
  created_at timestamptz not null default now()
);

create index marcos_projeto_projeto_idx
  on public.marcos_projeto (projeto_id, status);
-- Usado pelo Calendário (6.1): marcos com data prevista
create index marcos_projeto_data_idx on public.marcos_projeto (data_prevista)
  where data_prevista is not null;

create table public.log_progresso (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  data date not null default current_date,
  conteudo text not null,
  created_at timestamptz not null default now()
);

create index log_progresso_projeto_idx
  on public.log_progresso (projeto_id, data desc);

comment on table public.log_progresso is
  'A ação diária do pilar Projetos é justamente adicionar um log (plano 5.4).';
