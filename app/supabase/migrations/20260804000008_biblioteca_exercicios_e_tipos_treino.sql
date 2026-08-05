-- =============================================================================
-- Biblioteca de exercícios e tipos de treino — parte ADITIVA
--
-- Resolução 10.18 (nova): `exercicios_treino` guardava nome e grupo muscular por
-- treino, então o mesmo exercício em dois treinos eram duas entradas
-- independentes. Consequências práticas encontradas nos dados reais:
--   - PR e progressão não se unificavam (Supino Inclinado no Push e no Upper
--     eram exercícios distintos para o cálculo)
--   - corrigir um grupo muscular exigia editar cada cópia, e as cópias
--     divergiram: "ombos"/"ombros" e "bíceps"/"costas" na mesma Rosca Scott
--
-- Esta migration só CRIA e POPULA. A remoção das colunas redundantes fica numa
-- segunda migration, depois de verificar que todas as FKs foram preenchidas —
-- 27 vínculos, 0 órfãos.
-- =============================================================================

create table public.biblioteca_exercicios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  grupo_muscular text,
  created_at timestamptz not null default now()
);

-- Unicidade case-insensitive: `unique` na coluna deixaria passar "Supino" e
-- "supino" como entradas distintas, que é o problema que a biblioteca resolve.
create unique index biblioteca_exercicios_nome_idx
  on public.biblioteca_exercicios (lower(trim(nome)));

create table public.tipos_treino (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz not null default now()
);

create unique index tipos_treino_nome_idx
  on public.tipos_treino (lower(trim(nome)));

-- --- População: um registro por nome normalizado ----------------------------

insert into public.biblioteca_exercicios (nome, grupo_muscular)
select
  -- Grafia mais longa entre as variantes: preserva acento e capitalização em
  -- vez de escolher arbitrariamente
  (array_agg(nome order by length(nome) desc, nome))[1],
  case lower(trim((array_agg(nome order by length(nome) desc, nome))[1]))
    -- Correções explícitas onde as variantes empatam 1 a 1 e "mais frequente"
    -- não decide. Ambas são erro de digitação/classificação, não preferência.
    when 'elevação lateral' then 'ombros'   -- havia "ombos"
    when 'rosca scott'      then 'bíceps'   -- havia "costas"
    else (array_agg(grupo_muscular order by grupo_muscular nulls last))[1]
  end
from public.exercicios_treino
group by lower(trim(nome));

insert into public.tipos_treino (nome)
select (array_agg(tipo order by length(tipo) desc, tipo))[1]
from public.treinos
where tipo is not null and trim(tipo) <> ''
group by lower(trim(tipo));

-- --- Vínculos ---------------------------------------------------------------

-- `on delete restrict`: apagar um exercício da biblioteca que está em uso
-- deve falhar, não esvaziar silenciosamente o vínculo do treino.
alter table public.exercicios_treino
  add column exercicio_base_id uuid references public.biblioteca_exercicios (id) on delete restrict;

alter table public.treinos
  add column tipo_id uuid references public.tipos_treino (id) on delete set null;

update public.exercicios_treino e
   set exercicio_base_id = b.id
  from public.biblioteca_exercicios b
 where lower(trim(e.nome)) = lower(trim(b.nome));

update public.treinos t
   set tipo_id = tt.id
  from public.tipos_treino tt
 where lower(trim(t.tipo)) = lower(trim(tt.nome));

create index exercicios_treino_base_idx
  on public.exercicios_treino (exercicio_base_id);
create index treinos_tipo_idx on public.treinos (tipo_id);

comment on table public.biblioteca_exercicios is
  'Exercício canônico. PR e progressão agrupam por aqui (resolução 10.18).';
