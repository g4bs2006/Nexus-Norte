-- =============================================================================
-- Notas como espaço de conhecimento (spec 14/08, fase 1 — schema)
--
-- A migration de 13/08 (`notas_estudo`) corrigiu o fluxo de escrever, mas
-- deixou a nota isolada: presa a uma matéria, sem vocabulário comum com o
-- resto do pilar, e sem lugar para diagrama ou fórmula. Esta migration cria a
-- base do grafo de conhecimento — sem tocar em UI, sem editor novo.
--
-- Decisões (ver docs/superpowers/plans/2026-08-14-notas-conhecimento-design.md):
--   - Nota continua ancorada em matéria (`materia_id` permanece not null).
--   - `semestre` e `topico` são normalizados em tabela própria — precisam ser
--     renomeáveis e mescláveis, o que `text`/`text[]` não permite sem varrer
--     conteúdo.
--   - Semestre nunca se liga direto à nota: a cadeia é nota → matéria →
--     semestre. Dois caminhos para o mesmo dado é como se produz inconsistência.
--   - `links_nota` guarda o slug do alvo mesmo quando a nota ainda não existe
--     (`destino_id` nulo) — é onde a próxima nota nasce, não um erro.
-- =============================================================================

create table public.semestres (
  id uuid primary key default gen_random_uuid(),
  -- Rótulo canônico: '2026.1'. Único, e é o que substitui o texto livre de
  -- `materias.semestre`.
  rotulo text not null unique check (btrim(rotulo) <> ''),
  data_inicio date,
  data_fim date,
  -- Declarado, não inferido. Hoje "semestre atual" seria derivado de data em
  -- cada consumidor; um booleano dá fonte de verdade única.
  atual boolean not null default false
);

-- No máximo um semestre atual. Sem isto, dois `true` fazem cada tela escolher
-- um diferente.
create unique index semestres_atual_unico
  on public.semestres (atual)
  where atual;

comment on table public.semestres is
  'Semestre normalizado. Substitui materias.semestre (texto livre), mantida por ora para o backfill abaixo.';
comment on column public.semestres.atual is
  'No máximo um true (semestres_atual_unico). Fonte de verdade declarada, não inferida por data.';

create table public.topicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (btrim(nome) <> ''),
  slug text not null unique
);

comment on table public.topicos is
  'Vocabulário durável de assunto (ex: "Séries de Taylor"), compartilhado entre matérias e semestres.';

create table public.notas_topicos (
  nota_id uuid not null references public.notas_estudo (id) on delete cascade,
  topico_id uuid not null references public.topicos (id) on delete cascade,
  primary key (nota_id, topico_id)
);

create table public.links_nota (
  origem_id uuid not null references public.notas_estudo (id) on delete cascade,
  -- Nulo = link para nota que ainda não existe. É feature, não erro: é onde a
  -- próxima nota nasce. Por isso o alvo textual é guardado sempre.
  destino_id uuid references public.notas_estudo (id) on delete set null,
  destino_slug text not null,
  primary key (origem_id, destino_slug)
);

create index links_nota_destino_idx on public.links_nota (destino_id)
  where destino_id is not null;

comment on table public.links_nota is
  'Arestas do grafo de notas (wikilink [[slug]]), derivadas do conteúdo — nunca escritas à mão. Ver features/notas/api.ts (salvarNota).';
comment on column public.links_nota.destino_id is
  'Nulo = link quebrado: aponta para um slug sem nota ainda. Backlink pendente vira sugestão de nota a criar.';

create table public.desenhos (
  id uuid primary key default gen_random_uuid(),
  nota_id uuid not null references public.notas_estudo (id) on delete cascade,
  titulo text,
  -- Fonte de verdade, editável pelo Excalidraw.
  cena jsonb not null,
  -- Render exportado. Existe para ler sem instanciar o editor, e para o
  -- desenho sobreviver a uma troca de biblioteca.
  svg text,
  atualizado_em timestamptz not null default now()
);

create index desenhos_nota_idx on public.desenhos (nota_id);

comment on table public.desenhos is
  'Diagrama Excalidraw referenciado por ![[desenho:uuid]] no conteúdo da nota. cena é a fonte editável; svg é o render exportado.';
comment on column public.desenhos.svg is
  'Render exportado do Excalidraw. Permite ler o desenho sem instanciar o editor, e é o que a exportação (.zip) grava no lugar da referência.';

-- =============================================================================
-- atualizado_em de desenhos via trigger (mesmo padrão de trg_nota_atualizada_em,
-- 13/08 — função própria porque a coluna tem outro nome: atualizado_em, não
-- atualizada_em)
-- =============================================================================

create or replace function public.trg_desenho_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists desenhos_atualizado_em on public.desenhos;

create trigger desenhos_atualizado_em
  before update on public.desenhos
  for each row
  execute function public.trg_desenho_atualizado_em();

-- =============================================================================
-- materias.semestre_id — normalização do texto livre
--
-- `semestre text` NÃO é apagada nesta migration: fica lida para popular
-- `semestres` (insert ... select distinct) e depois marcada obsoleta em
-- comentário. Sai numa migration seguinte, depois de a UI já escrever no
-- campo novo — mesmo cuidado que 13/08 tomou com notas_estudo.
-- =============================================================================

alter table public.materias
  add column semestre_id uuid references public.semestres (id);

insert into public.semestres (rotulo)
select distinct btrim(m.semestre)
from public.materias m
where m.semestre is not null
  and btrim(m.semestre) <> ''
on conflict (rotulo) do nothing;

update public.materias m
set semestre_id = s.id
from public.semestres s
where btrim(m.semestre) = s.rotulo
  and m.semestre_id is null;

comment on column public.materias.semestre is
  'OBSOLETA — substituída por semestre_id (semestres.rotulo). Mantida só até a UI migrar para o campo novo; sai em migration futura.';

-- =============================================================================
-- notas_estudo.slug — identidade estável do wikilink
--
-- Slug é único GLOBAL, não por matéria: wikilink resolve por slug e é escrito
-- à mão, e o mesmo slug em duas matérias tornaria [[series-de-taylor]]
-- ambíguo. Ambiguidade em link é pior que colisão de nome.
-- =============================================================================

alter table public.notas_estudo
  add column slug text;

-- Slugificação one-shot para o backfill: minúsculas, sem acento (tabela de
-- tradução cobre o alfabeto português), tudo que não é [a-z0-9] vira hífen.
-- A camada de aplicação (features/notas/markdown.ts, gerarSlug) reimplementa
-- a mesma regra em TypeScript para slugs novos — esta função só existe para
-- este backfill e para health-check manual, não é chamada pelo app.
create or replace function public.slugificar_backfill(txt text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(both '-' from
      regexp_replace(
        lower(
          translate(
            txt,
            'áàãâäéèêëíìîïóòõôöúùûüçñÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ',
            'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
          )
        ),
        '[^a-z0-9]+', '-', 'g'
      )
    ),
    ''
  )
$$;

with base as (
  select
    id,
    coalesce(public.slugificar_backfill(titulo), 'nota') as raiz
  from public.notas_estudo
  where slug is null
),
numerado as (
  select
    id,
    raiz,
    row_number() over (partition by raiz order by id) as posicao
  from base
)
update public.notas_estudo n
set slug = case
  when numerado.posicao = 1 then numerado.raiz
  else numerado.raiz || '-' || numerado.posicao
end
from numerado
where n.id = numerado.id;

drop function public.slugificar_backfill (text);

alter table public.notas_estudo
  alter column slug set not null,
  add constraint notas_estudo_slug_nao_vazio check (btrim(slug) <> '');

create unique index notas_estudo_slug_unico on public.notas_estudo (slug);

comment on column public.notas_estudo.slug is
  'Identidade do wikilink [[slug]]. Único globalmente, não por matéria — ambiguidade em link é pior que colisão de nome. Gerado por features/notas/markdown.ts (gerarSlug).';
