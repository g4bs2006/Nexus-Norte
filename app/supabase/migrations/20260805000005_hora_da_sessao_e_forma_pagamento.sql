-- =============================================================================
-- Horário da sessão de treino e forma de pagamento fechada (resolução 10.23)
-- =============================================================================

-- --- Horário real do treino -------------------------------------------------
--
-- O fluxograma diz que o treino é às 18h; o treino aconteceu às 11h. São dois
-- fatos diferentes e o segundo não tinha onde morar: `data` guarda só o dia, e
-- `created_at` é quando a primeira série foi gravada — não é editável e, nas
-- sessões registradas antes da 10.21, era o instante do envio do formulário e não
-- do treino.
--
-- Remarcar a ocorrência (10.19) muda o PLANO daquela data; isto registra a
-- REALIDADE da sessão. Anulável porque a maioria dos registros não vai informar,
-- e inventar um horário seria pior que não ter.
alter table public.execucoes_treino
  add column hora_inicio time;

comment on column public.execucoes_treino.hora_inicio is
  'Horário real em que a sessão aconteceu. Nulo = não informado. Independe do horário planejado no fluxograma.';

-- --- Forma de pagamento -----------------------------------------------------
--
-- Era texto livre digitado a cada lançamento, o que produz o mesmo problema que
-- a biblioteca de exercícios resolveu (10.18): "Débito", "debito" e "Débito "
-- viram três formas de pagamento distintas e nenhum filtro agrupa direito.
--
-- Conjunto fechado num CHECK em vez de tabela de referência: são quatro valores
-- que não mudam, não têm atributo nenhum além do nome, e ninguém precisa
-- cadastrar uma quinta forma de pagamento. Tabela aqui seria cerimônia sem ganho.
update public.lancamentos
set forma_pagamento = lower(
  translate(trim(forma_pagamento), 'áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ', 'aaaaeeioooucAAAAEEIOOOUC')
)
where forma_pagamento is not null;

-- Vazio virou nulo: string em branco não é uma forma de pagamento
update public.lancamentos
set forma_pagamento = null
where forma_pagamento = '';

alter table public.lancamentos
  add constraint lancamentos_forma_pagamento_valida check (
    forma_pagamento is null
    or forma_pagamento in ('debito', 'credito', 'dinheiro', 'pix')
  );

-- Alimenta o filtro por forma de pagamento na lista de lançamentos
create index if not exists lancamentos_forma_pagamento_idx
  on public.lancamentos (forma_pagamento)
  where forma_pagamento is not null;
