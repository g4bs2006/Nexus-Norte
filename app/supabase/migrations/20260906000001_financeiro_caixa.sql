-- =============================================================================
-- Financeiro Caixa: cartoes, eventos previstos e snapshot de caixa
--
-- IMPORTANTE: execute supabase/reset_lancamentos_financeiro.sql antes desta
-- migration. O historico de lancamentos foi declarado descartavel, mas o reset
-- permanece uma operacao explicita e separada para nao ser repetido em ambientes
-- que ja receberam esta estrutura.
-- =============================================================================

begin;

create table public.cartoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (btrim(nome) <> ''),
  dia_fechamento smallint not null check (dia_fechamento between 1 and 31),
  dia_vencimento smallint not null check (dia_vencimento between 1 and 31),
  created_at timestamptz not null default now(),

  constraint cartoes_nome_unico unique (nome)
);

comment on table public.cartoes is
  'Cartoes usados para calcular o snapshot data_caixa de compras em credito.';

create table public.eventos_financeiros_previstos (
  id uuid primary key default gen_random_uuid(),
  descricao text not null check (btrim(descricao) <> ''),
  categoria_id uuid not null references public.categorias (id) on delete restrict,
  data_inicio date not null,
  dia_mes smallint not null check (dia_mes between 1 and 31),
  termino_tipo text not null
    check (termino_tipo in ('indefinido', 'data', 'parcelas')),
  data_fim date,
  valor numeric(14, 2),
  valor_total numeric(14, 2),
  numero_parcelas integer,
  juros_mensal numeric,
  created_at timestamptz not null default now(),

  constraint eventos_financeiros_periodo_valido check (
    data_fim is null or data_fim >= data_inicio
  ),
  constraint eventos_financeiros_termino_coerente check (
    (
      termino_tipo = 'indefinido'
      and data_fim is null
      and valor is not null
      and valor > 0
      and valor_total is null
      and numero_parcelas is null
      and juros_mensal is null
    )
    or
    (
      termino_tipo = 'data'
      and data_fim is not null
      and valor is not null
      and valor > 0
      and valor_total is null
      and numero_parcelas is null
      and juros_mensal is null
    )
    or
    (
      termino_tipo = 'parcelas'
      and data_fim is null
      and valor is null
      and valor_total is not null
      and valor_total > 0
      and numero_parcelas is not null
      and numero_parcelas >= 1
      and juros_mensal is not null
      and juros_mensal >= 0
    )
  )
);

create index eventos_financeiros_categoria_idx
  on public.eventos_financeiros_previstos (categoria_id);
create index eventos_financeiros_inicio_idx
  on public.eventos_financeiros_previstos (data_inicio);

comment on table public.eventos_financeiros_previstos is
  'Padroes mensais previstos. Ocorrencias sao expandidas na leitura; parcelas usam valor_total, quantidade e juros.';

-- Converte os dois modelos anteriores antes de remove-los. IDs e created_at sao
-- preservados para manter identidade estavel durante a substituicao direta.
insert into public.eventos_financeiros_previstos (
  id,
  descricao,
  categoria_id,
  data_inicio,
  dia_mes,
  termino_tipo,
  data_fim,
  valor,
  created_at
)
select
  id,
  descricao,
  categoria_id,
  data_inicio,
  dia_mes,
  case when data_fim is null then 'indefinido' else 'data' end,
  data_fim,
  valor,
  created_at
from public.compromissos_recorrentes;

insert into public.eventos_financeiros_previstos (
  id,
  descricao,
  categoria_id,
  data_inicio,
  dia_mes,
  termino_tipo,
  valor_total,
  numero_parcelas,
  juros_mensal,
  created_at
)
select
  id,
  descricao,
  categoria_id,
  data_primeira_parcela,
  extract(day from data_primeira_parcela)::smallint,
  'parcelas',
  valor_total,
  numero_parcelas,
  juros_mensal,
  created_at
from public.compras_parceladas;

drop table public.compromissos_recorrentes;
drop table public.compras_parceladas;

create table public.saldo_referencia_conta (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  valor numeric(14, 2) not null,
  observacao text,
  created_at timestamptz not null default now()
);

create index saldo_referencia_conta_ordem_idx
  on public.saldo_referencia_conta (data desc, created_at desc, id desc);

comment on table public.saldo_referencia_conta is
  'Saldo no inicio do dia informado. A ordem de desempate e data, created_at e id.';

-- Helpers com clamp evitam que dia 31 transborde em meses curtos.
create or replace function public.data_com_dia_clamp(
  p_mes date,
  p_dia integer
)
returns date
language sql
immutable
strict
as $$
  select (
    date_trunc('month', p_mes)::date
    + (least(
        p_dia,
        extract(day from (date_trunc('month', p_mes) + interval '1 month - 1 day'))::integer
      ) - 1)
  )::date;
$$;

create or replace function public.calcular_data_caixa_cartao(
  p_data date,
  p_dia_fechamento integer,
  p_dia_vencimento integer
)
returns date
language plpgsql
immutable
strict
as $$
declare
  v_fechamento date;
  v_mes_vencimento date;
begin
  v_fechamento := public.data_com_dia_clamp(p_data, p_dia_fechamento);

  -- O fechamento e inclusivo: compras no proprio dia ainda pertencem ao ciclo
  -- que fecha naquele dia; depois dele, ao fechamento do mes seguinte.
  if p_data > v_fechamento then
    v_fechamento := public.data_com_dia_clamp(
      (date_trunc('month', p_data) + interval '1 month')::date,
      p_dia_fechamento
    );
  end if;

  v_mes_vencimento := date_trunc('month', v_fechamento)::date;
  if p_dia_vencimento <= p_dia_fechamento then
    v_mes_vencimento := (v_mes_vencimento + interval '1 month')::date;
  end if;

  return public.data_com_dia_clamp(v_mes_vencimento, p_dia_vencimento);
end;
$$;

alter table public.lancamentos
  add column cartao_id uuid references public.cartoes (id) on delete restrict,
  add column data_caixa date not null default current_date,
  add column evento_id uuid references public.eventos_financeiros_previstos (id) on delete restrict,
  add column competencia_evento date;

-- Nao inventamos cartao para credito historico. O reset e deliberadamente
-- anterior e separado; esta falha deixa a ordem operacional inequivoca.
do $$
begin
  if exists (
    select 1
    from public.lancamentos
    where forma_pagamento = 'credito'
  ) then
    raise exception using
      errcode = 'check_violation',
      message = 'Financeiro Caixa exige reset explicito antes da migration: execute supabase/reset_lancamentos_financeiro.sql; ainda existem lancamentos em credito sem cartao.';
  end if;
end;
$$;

-- Lancamentos nao-credito preservados recebem caixa igual a competencia.
update public.lancamentos
set data_caixa = data
where forma_pagamento is distinct from 'credito';

alter table public.lancamentos
  add constraint lancamentos_cartao_por_forma check (
    (forma_pagamento = 'credito' and cartao_id is not null)
    or (forma_pagamento is distinct from 'credito' and cartao_id is null)
  ),
  add constraint lancamentos_evento_competencia_par check (
    (evento_id is null and competencia_evento is null)
    or (evento_id is not null and competencia_evento is not null)
  );

create index lancamentos_data_caixa_idx
  on public.lancamentos (data_caixa desc);
create index lancamentos_cartao_data_caixa_idx
  on public.lancamentos (cartao_id, data_caixa)
  where cartao_id is not null;
create index lancamentos_evento_competencia_idx
  on public.lancamentos (evento_id, competencia_evento)
  where evento_id is not null;

create or replace function public.trg_definir_data_caixa_lancamento()
returns trigger
language plpgsql
as $$
declare
  v_dia_fechamento smallint;
  v_dia_vencimento smallint;
begin
  if tg_op = 'UPDATE'
     and new.data is not distinct from old.data
     and new.forma_pagamento is not distinct from old.forma_pagamento
     and new.cartao_id is not distinct from old.cartao_id then
    new.data_caixa := old.data_caixa;
    return new;
  end if;

  if new.forma_pagamento = 'credito' then
    if new.cartao_id is null then
      raise exception using
        errcode = 'check_violation',
        message = 'cartao_id e obrigatorio para lancamento em credito';
    end if;

    select dia_fechamento, dia_vencimento
      into v_dia_fechamento, v_dia_vencimento
      from public.cartoes
     where id = new.cartao_id;

    if not found then
      raise exception using
        errcode = 'foreign_key_violation',
        message = 'cartao_id nao referencia um cartao existente';
    end if;

    new.data_caixa := public.calcular_data_caixa_cartao(
      new.data,
      v_dia_fechamento,
      v_dia_vencimento
    );
  else
    if new.cartao_id is not null then
      raise exception using
        errcode = 'check_violation',
        message = 'cartao_id so pode ser informado para lancamento em credito';
    end if;

    new.data_caixa := new.data;
  end if;

  return new;
end;
$$;

create trigger lancamentos_definir_data_caixa
before insert or update of data, forma_pagamento, cartao_id
on public.lancamentos
for each row execute function public.trg_definir_data_caixa_lancamento();

create or replace function public.trg_preservar_data_caixa_lancamento()
returns trigger
language plpgsql
as $$
begin
  if new.data is not distinct from old.data
     and new.forma_pagamento is not distinct from old.forma_pagamento
     and new.cartao_id is not distinct from old.cartao_id
     and new.data_caixa is distinct from old.data_caixa then
    raise exception using
      errcode = 'check_violation',
      message = 'data_caixa e snapshot calculado e nao pode ser editado diretamente';
  end if;

  return new;
end;
$$;

create trigger lancamentos_preservar_data_caixa
before update of data_caixa on public.lancamentos
for each row execute function public.trg_preservar_data_caixa_lancamento();

create or replace function public.competencia_evento_valida(
  p_competencia date,
  p_data_inicio date,
  p_dia_mes integer,
  p_termino_tipo text,
  p_data_fim date,
  p_numero_parcelas integer
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_indice integer;
  v_ocorrencia date;
begin
  if p_competencia is null
     or p_data_inicio is null
     or p_dia_mes is null
     or p_termino_tipo is null then
    return false;
  end if;

  v_indice :=
    (extract(year from p_competencia)::integer - extract(year from p_data_inicio)::integer) * 12
    + extract(month from p_competencia)::integer
    - extract(month from p_data_inicio)::integer;

  if v_indice < 0 then
    return false;
  end if;

  v_ocorrencia := public.data_com_dia_clamp(p_competencia, p_dia_mes);
  if p_competencia <> v_ocorrencia or p_competencia < p_data_inicio then
    return false;
  end if;

  if p_termino_tipo = 'data' then
    return p_data_fim is not null and p_competencia <= p_data_fim;
  elsif p_termino_tipo = 'parcelas' then
    return p_numero_parcelas is not null and v_indice < p_numero_parcelas;
  end if;

  return p_termino_tipo = 'indefinido';
end;
$$;

create or replace function public.trg_validar_evento_lancamento()
returns trigger
language plpgsql
as $$
declare
  v_evento public.eventos_financeiros_previstos%rowtype;
begin
  if new.evento_id is null and new.competencia_evento is null then
    return new;
  end if;

  if new.evento_id is null or new.competencia_evento is null then
    raise exception using
      errcode = 'check_violation',
      message = 'evento_id e competencia_evento devem ser informados juntos';
  end if;

  select * into v_evento
  from public.eventos_financeiros_previstos
  where id = new.evento_id;

  if not found then
    raise exception using
      errcode = 'foreign_key_violation',
      message = 'evento_id nao referencia um evento financeiro existente';
  end if;

  if new.categoria_id <> v_evento.categoria_id then
    raise exception using
      errcode = 'check_violation',
      message = 'a categoria do lancamento deve ser a mesma do evento';
  end if;

  if not public.competencia_evento_valida(
    new.competencia_evento,
    v_evento.data_inicio,
    v_evento.dia_mes,
    v_evento.termino_tipo,
    v_evento.data_fim,
    v_evento.numero_parcelas
  ) then
    raise exception using
      errcode = 'check_violation',
      message = 'competencia_evento nao corresponde a uma ocorrencia valida do evento';
  end if;

  return new;
end;
$$;

create trigger lancamentos_validar_evento
before insert or update of evento_id, competencia_evento, categoria_id
on public.lancamentos
for each row execute function public.trg_validar_evento_lancamento();

-- Alterar um evento nao pode invalidar pagamentos que ja o referenciam.
create or replace function public.trg_preservar_vinculos_evento()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.lancamentos l
    where l.evento_id = new.id
      and (
        l.categoria_id <> new.categoria_id
        or not public.competencia_evento_valida(
          l.competencia_evento,
          new.data_inicio,
          new.dia_mes,
          new.termino_tipo,
          new.data_fim,
          new.numero_parcelas
        )
      )
  ) then
    raise exception using
      errcode = 'check_violation',
      message = 'a alteracao invalidaria um lancamento vinculado a este evento';
  end if;

  return new;
end;
$$;

create trigger eventos_preservar_vinculos
before update of categoria_id, data_inicio, dia_mes, termino_tipo, data_fim, numero_parcelas
on public.eventos_financeiros_previstos
for each row execute function public.trg_preservar_vinculos_evento();

commit;
