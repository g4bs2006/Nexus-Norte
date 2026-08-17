-- =============================================================================
-- Migration: Metas Simplificadas e Categorias de Metas
-- Data: 2026-08-16
--
-- Substitui a estrutura antiga de metas (4 tipos complexos, RPCs de progresso
-- numérico, FKs engessadas) por um modelo simples de lista agrupada por
-- categorias personalizadas (`categorias_metas`) com checkboxes booleanos,
-- prazos opcionais e suporte a checks diários (`no_check_diario`).
-- =============================================================================

-- 1. Drop da RPC antiga de progresso de meta
drop function if exists public.progresso_meta(uuid);

-- 2. Tabela de Categorias Personalizadas de Metas
create table if not exists public.categorias_metas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text not null default '#4a87c4',
  ordem int not null default 0,
  criada_em timestamptz not null default now()
);

comment on table public.categorias_metas is
  'Categorias dinâmicas para agrupamento de metas (ex: Metas Acadêmicas, Tirar CNH, Saúde & Treino).';

-- 3. Limpeza e Recriação da Tabela Simplificada de Metas
drop table if exists public.metas_checkins cascade;
drop table if exists public.metas cascade;

create table public.metas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  categoria_meta_id uuid references public.categorias_metas(id) on delete set null,
  pilar text check (pilar is null or pilar in ('financeiro', 'estudos', 'treino', 'projetos', 'pessoal')),
  concluida boolean not null default false,
  data_alvo date,
  no_check_diario boolean not null default false,
  ordem int not null default 0,
  criada_em timestamptz not null default now(),
  concluida_em timestamptz
);

comment on table public.metas is
  'Metas simplificadas com suporte a categorias dinâmicas, prazo opcional, checkbox de conclusão e flag de presença nos checks diários (no_check_diario).';

-- 4. Tabela de Check-ins Diários (Mantida para metas com no_check_diario=true)
create table public.metas_checkins (
  id uuid primary key default gen_random_uuid(),
  meta_id uuid not null references public.metas(id) on delete cascade,
  data date not null,
  feito boolean not null default true,
  unique (meta_id, data)
);

comment on table public.metas_checkins is
  'Histórico de check-ins diários para metas marcadas com no_check_diario=true.';

-- 5. Índices de Desempenho
create index if not exists metas_categoria_meta_id_idx on public.metas(categoria_meta_id);
create index if not exists metas_checkins_meta_id_data_idx on public.metas_checkins(meta_id, data);
create index if not exists metas_no_check_diario_idx on public.metas(no_check_diario) where no_check_diario = true;

-- 6. Inserção de Categorias Padrão Iniciais
insert into public.categorias_metas (nome, cor, ordem) values
  ('Estudos & Acadêmico', '#4a87c4', 1),
  ('Financeiro & Carreira', '#4f9d69', 2),
  ('Saúde & Treino', '#d0764b', 3),
  ('Projetos Pessoais', '#8b6bb5', 4)
on conflict do nothing;
