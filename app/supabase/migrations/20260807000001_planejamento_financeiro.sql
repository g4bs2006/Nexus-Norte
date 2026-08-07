-- =============================================================================
-- Planejamento financeiro de longo prazo (resoluções 10.43, 10.44, 10.45)
--
-- Três camadas novas sobre o Financeiro, nenhuma materializando por
-- mês/parcela — a expansão acontece na leitura, mesmo princípio da
-- resolução 10.5:
--   1. compromissos_recorrentes — o compromisso previsto (10.43)
--   2. compras_parceladas       — parcelamento + simulador (10.44)
--   3. regra_investimento / sugestoes_investimento — sugestão de aporte (10.45)
--
-- RLS permanece desabilitado (resoluções 10.0/10.8) — sem policy nesta migration.
-- =============================================================================

-- --- 10.43: compromissos recorrentes ----------------------------------------

create table public.compromissos_recorrentes (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  categoria_id uuid not null references public.categorias (id) on delete restrict,
  valor numeric not null check (valor > 0),
  -- dia_mes = 31 não existe em fevereiro: a expansão (features/financeiro/
  -- projecao.ts) cai no último dia do mês, nunca transborda para o próximo.
  dia_mes smallint not null check (dia_mes between 1 and 31),
  data_inicio date not null,
  data_fim date null, -- null = sem previsão de término
  created_at timestamptz not null default now(),

  constraint compromissos_periodo_coerente
    check (data_fim is null or data_fim >= data_inicio)
);

create index compromissos_categoria_idx
  on public.compromissos_recorrentes (categoria_id);

comment on table public.compromissos_recorrentes is
  'Padrão de compromisso mensal (salário, aluguel...). Natureza vem de '
  'categorias.natureza (resolução 10.12), não é repetida aqui. Não '
  'materializa por mês — expansão em features/financeiro/projecao.ts.';

-- --- 10.44: compras parceladas ----------------------------------------------

create table public.compras_parceladas (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  categoria_id uuid not null references public.categorias (id) on delete restrict,
  valor_total numeric not null check (valor_total > 0),
  numero_parcelas int not null check (numero_parcelas >= 1),
  data_primeira_parcela date not null,
  juros_mensal numeric not null default 0 check (juros_mensal >= 0),
  created_at timestamptz not null default now()
);

create index parceladas_categoria_idx on public.compras_parceladas (categoria_id);

comment on table public.compras_parceladas is
  'Não materializa parcela por parcela (36x viraria 36 linhas) — expansão em '
  'features/financeiro/projecao.ts.';

-- --- 10.45: regra de investimento --------------------------------------------

create table public.regra_investimento (
  id uuid primary key default gen_random_uuid(),
  ativa boolean not null default true,
  gatilho_tipo text not null
    check (gatilho_tipo in ('sobra_meta', 'percentual_receita')),
  -- % da sobra (sobra_meta) ou % da receita (percentual_receita)
  percentual numeric not null check (percentual > 0 and percentual <= 100),
  dia_sugestao smallint not null check (dia_sugestao between 1 and 31),
  created_at timestamptz not null default now()
);

create table public.sugestoes_investimento (
  id uuid primary key default gen_random_uuid(),
  mes_referencia date not null,
  valor_sugerido numeric not null check (valor_sugerido > 0),
  status text not null default 'pendente'
    check (status in ('pendente', 'aceita', 'recusada')),
  investimento_id uuid null references public.investimentos (id) on delete set null,
  created_at timestamptz not null default now(),

  -- Mesmo raciocínio de dedup da resolução 10.42 (notificacoes_enviadas): sem
  -- isto, cada carregamento da página geraria uma sugestão nova para o mesmo
  -- mês.
  constraint sugestoes_investimento_mes_unico unique (mes_referencia)
);

create index sugestoes_investimento_status_idx
  on public.sugestoes_investimento (status);
