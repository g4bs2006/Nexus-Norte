-- =============================================================================
-- Autocomplete de wikilink por similaridade (spec 14/08, seção 6 — fase 6)
--
-- O `[[` precisa achar a nota mesmo com o título digitado errado ou pela
-- metade. `ilike '%termo%'` não resolve: erra "seires" por "séries", não ordena
-- por relevância e não tem índice que ajude.
--
-- `pg_trgm` compara por trigrama, então tolera troca de letra e devolve uma
-- nota de similaridade que serve para ordenar. É o mesmo mecanismo que faz a
-- busca do Obsidian parecer que "adivinha".
--
-- A busca é sobre TÍTULO, não sobre conteúdo. Conteúdo é a fase 8, com
-- `tsvector` — que responde outra pergunta ("onde eu escrevi isso?"). Aqui a
-- pergunta é "qual nota eu quero linkar?", e ninguém lembra o corpo da nota
-- que quer citar, lembra o nome.
-- =============================================================================

create extension if not exists pg_trgm;

create index notas_estudo_titulo_trgm_idx
  on public.notas_estudo
  using gin (titulo gin_trgm_ops);

-- =============================================================================
-- A função que o autocomplete chama
--
-- Existe como RPC, e não como filtro montado no cliente, porque `similarity()`
-- precisa aparecer no `order by` e no `where` — e PostgREST não expressa isso.
-- Manter a regra de relevância no banco também garante que o autocomplete do
-- editor e qualquer outro consumidor futuro ordenem igual.
-- =============================================================================

create or replace function public.buscar_notas_por_titulo(
  termo text,
  limite int default 8
)
returns table (
  id uuid,
  slug text,
  titulo text,
  materia_nome text
)
language sql
stable
as $$
  select n.id, n.slug, n.titulo, m.nome
  from public.notas_estudo n
  join public.materias m on m.id = n.materia_id
  -- `%` é o operador de similaridade do pg_trgm (respeita
  -- pg_trgm.similarity_threshold); o `ilike` cobre o prefixo curto, que o
  -- trigrama sozinho descarta -- digitar "li" tem que achar "Limites".
  where n.titulo % termo or n.titulo ilike '%' || termo || '%'
  order by similarity(n.titulo, termo) desc, n.atualizada_em desc
  limit limite
$$;

comment on function public.buscar_notas_por_titulo (text, int) is
  'Autocomplete do wikilink [[. Ordena por similaridade de trigrama e desempata pela nota mexida por ultimo.';
