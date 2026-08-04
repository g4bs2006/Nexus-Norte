-- =============================================================================
-- Fase 1 — Financeiro (plano, seção 2.1 / 2.2 + resoluções 10.2, 10.4, 10.9)
--
-- Resolução 10.12 (nova): o plano pede card "Receita vs. Despesa" (2.3) e
-- meta_tipo = 'percentual_renda' (2.1), mas não modelava receita —
-- `categorias.tipo` só distinguia fixo/variavel, ambos despesa. Adicionada a
-- coluna `natureza` ('receita'|'despesa'); `tipo` passa a ser exclusivo de
-- despesas.
-- =============================================================================

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  natureza text not null check (natureza in ('receita', 'despesa')),
  -- fixo/variavel só faz sentido para despesa (resolução 10.12)
  tipo text check (tipo in ('fixo', 'variavel')),
  meta_mensal numeric,
  -- 'valor' = reais; 'percentual_renda' = % da receita do mês
  meta_tipo text check (meta_tipo in ('valor', 'percentual_renda')),
  cor text,
  subcategoria_pai_id uuid references public.categorias (id) on delete set null,
  -- Campo-resumo mantido por trigger (plano 2.2 + resolução 10.9).
  -- Sempre referente ao MÊS CORRENTE. Histórico vem da view
  -- resumo_mensal_categoria.
  total_gasto_mes numeric not null default 0,
  created_at timestamptz not null default now(),

  constraint categorias_tipo_por_natureza check (
    (natureza = 'despesa' and tipo is not null)
    or (natureza = 'receita' and tipo is null)
  ),
  -- meta exige meta_tipo e vice-versa
  constraint categorias_meta_coerente check (
    (meta_mensal is null and meta_tipo is null)
    or (meta_mensal is not null and meta_tipo is not null)
  ),
  constraint categorias_nao_pai_de_si check (id <> subcategoria_pai_id)
);

comment on column public.categorias.total_gasto_mes is
  'Campo-resumo do MÊS CORRENTE, mantido por trigger. Não usar para histórico.';

create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  valor numeric not null check (valor >= 0),
  categoria_id uuid not null references public.categorias (id) on delete restrict,
  data date not null,
  descricao text,
  forma_pagamento text,
  -- Resolução 10.2: usado pelo Calendário para contas fixas.
  -- Null → o calendário usa `data` como fallback.
  data_vencimento date,
  created_at timestamptz not null default now()
);

create index lancamentos_categoria_data_idx
  on public.lancamentos (categoria_id, data desc);
create index lancamentos_data_idx on public.lancamentos (data desc);
create index lancamentos_vencimento_idx
  on public.lancamentos (data_vencimento)
  where data_vencimento is not null;

-- Resolução 10.4: uma linha por evento (aporte OU rendimento)
create table public.investimentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('aporte', 'rendimento')),
  valor numeric not null,
  data date not null,
  descricao text,
  created_at timestamptz not null default now()
);

create index investimentos_data_idx on public.investimentos (data desc);

-- Ritual de domingo: grade dia × categoria com valores planejados
create table public.planejamento_semanal_financeiro (
  id uuid primary key default gen_random_uuid(),
  -- segunda-feira da semana planejada
  semana_inicio date not null,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  categoria_id uuid not null references public.categorias (id) on delete cascade,
  valor_planejado numeric not null check (valor_planejado >= 0),

  unique (semana_inicio, dia_semana, categoria_id)
);

create index planejamento_semanal_idx
  on public.planejamento_semanal_financeiro (semana_inicio, dia_semana);

-- =============================================================================
-- Views de agregação — leves o suficiente para leitura direta (resolução 10.9)
-- =============================================================================

-- Total por categoria por mês. Base para ranking, tendência de 6 meses e
-- candidatos a corte.
create view public.resumo_mensal_categoria as
select
  l.categoria_id,
  date_trunc('month', l.data)::date as mes,
  sum(l.valor) as total,
  count(*)::int as qtd_lancamentos
from public.lancamentos l
group by l.categoria_id, date_trunc('month', l.data);

-- Receita total por mês. Necessária para resolver meta_tipo =
-- 'percentual_renda' (resolução 10.12).
create view public.receita_mensal as
select
  date_trunc('month', l.data)::date as mes,
  sum(l.valor) as total
from public.lancamentos l
join public.categorias c on c.id = l.categoria_id
where c.natureza = 'receita'
group by date_trunc('month', l.data);

-- =============================================================================
-- Campo-resumo via trigger (plano 2.2)
-- =============================================================================

create or replace function public.recalcular_total_gasto_mes(p_categoria_id uuid)
returns void
language sql
as $$
  update public.categorias c
     set total_gasto_mes = coalesce((
           select sum(l.valor)
             from public.lancamentos l
            where l.categoria_id = p_categoria_id
              and date_trunc('month', l.data) = date_trunc('month', current_date)
         ), 0)
   where c.id = p_categoria_id;
$$;

create or replace function public.trg_lancamentos_resumo()
returns trigger
language plpgsql
as $$
begin
  -- Recalcula a categoria nova (insert/update)
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.recalcular_total_gasto_mes(new.categoria_id);
  end if;

  -- Recalcula a categoria antiga quando o lançamento saiu dela
  if tg_op = 'DELETE' then
    perform public.recalcular_total_gasto_mes(old.categoria_id);
  elsif tg_op = 'UPDATE' and old.categoria_id is distinct from new.categoria_id then
    perform public.recalcular_total_gasto_mes(old.categoria_id);
  end if;

  return null;
end;
$$;

create trigger lancamentos_resumo
after insert or update or delete on public.lancamentos
for each row execute function public.trg_lancamentos_resumo();

-- =============================================================================
-- Candidatos a corte (plano 2.2)
--
-- Calculado na LEITURA, não por trigger: depende de quais são os 2 meses
-- anteriores, que muda na virada do mês sem nenhuma escrita acontecer — a
-- mesma dependência temporal que a resolução 10.9 reconhece no momentum de
-- projetos. Um campo-resumo ficaria silenciosamente velho.
-- =============================================================================

create or replace function public.candidatos_corte()
returns table (
  categoria_id uuid,
  nome text,
  meta_efetiva numeric,
  meses_estourados int
)
language sql
stable
as $$
  with meses as (
    select (date_trunc('month', current_date) - interval '1 month')::date as mes
    union all
    select (date_trunc('month', current_date) - interval '2 months')::date
  ),
  estouros as (
    select
      c.id,
      c.nome,
      -- Resolve a meta em reais, seja ela absoluta ou % da renda do mês
      case
        when c.meta_tipo = 'valor' then c.meta_mensal
        else c.meta_mensal / 100.0 * coalesce(rm.total, 0)
      end as meta_efetiva,
      r.total
    from public.categorias c
    cross join meses m
    join public.resumo_mensal_categoria r
      on r.categoria_id = c.id and r.mes = m.mes
    left join public.receita_mensal rm on rm.mes = m.mes
    where c.natureza = 'despesa'
      and c.tipo = 'variavel'
      and c.meta_mensal is not null
  )
  select
    e.id,
    e.nome,
    max(e.meta_efetiva) as meta_efetiva,
    count(*)::int as meses_estourados
  from estouros e
  where e.meta_efetiva > 0
    and e.total > e.meta_efetiva
  group by e.id, e.nome
  -- 2 meses seguidos (MESES_CANDIDATO_CORTE em src/lib/constants.ts)
  having count(*) >= 2;
$$;
