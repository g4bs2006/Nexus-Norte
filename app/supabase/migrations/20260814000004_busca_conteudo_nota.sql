-- =============================================================================
-- Busca por conteúdo de nota (spec 14/08, seção 8 — fase 8)
--
-- Responde "sei que anotei isso em algum lugar", que é outra pergunta da
-- resolvida na fase 6: lá se buscava a nota a CITAR, pelo título; aqui se busca
-- a nota a REENCONTRAR, pelo que foi escrito nela.
--
-- =============================================================================
-- Por que o texto indexado é uma COLUNA e não uma expressão
--
-- O spec pede o índice sobre o conteúdo "com a matemática removida": sem isso,
-- `\frac{\partial}{\partial x}` gera tokens que degradam a relevância do índice
-- inteiro, e toda nota com uma derivada passa a casar por `partial`.
--
-- Essa regra já existe, testada, em `features/notas/markdown.ts`
-- (`removerMatematica`), e ela conhece cerca, código inline e escape — coisas
-- que uma regex de `$...$` em SQL erraria. Reimplementá-la aqui criaria duas
-- versões da mesma regra, e duas versões de uma regra divergem.
--
-- Então `conteudo_busca` é escrita pelo cliente, e `busca` é GERADA a partir
-- dela. Isso só é seguro porque `salvarNota` é o único caminho que grava
-- conteúdo (seção 3) — a mesma invariante que sustenta o grafo sustenta o
-- índice.
-- =============================================================================

alter table public.notas_estudo
  add column conteudo_busca text not null default '';

-- Backfill com o conteúdo cru. A matemática das notas já existentes continua no
-- índice até o próximo salvamento de cada uma, que re-deriva pela regra certa.
-- Preferível a uma segunda implementação em SQL só para o backfill.
update public.notas_estudo set conteudo_busca = conteudo;

comment on column public.notas_estudo.conteudo_busca is
  'Conteudo sem as formulas, escrito por salvarNota (removerMatematica). Alimenta a coluna gerada busca. Nunca editar a mao.';

alter table public.notas_estudo
  add column busca tsvector
  generated always as (
    setweight(to_tsvector('portuguese', coalesce(titulo, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(conteudo_busca, '')), 'B')
  ) stored;

-- Título com peso A e corpo com peso B: quem busca "Taylor" quer primeiro a
-- nota CHAMADA Taylor, não as dez que a mencionam de passagem.
create index notas_estudo_busca_idx on public.notas_estudo using gin (busca);

-- =============================================================================
-- A função que a busca chama
-- =============================================================================

create or replace function public.buscar_notas(
  termo text,
  limite int default 30
)
returns table (
  id uuid,
  slug text,
  titulo text,
  materia_nome text,
  -- Trecho com o termo em destaque, para a lista mostrar POR QUE casou.
  trecho text
)
language sql
stable
as $$
  select
    n.id,
    n.slug,
    n.titulo,
    m.nome,
    ts_headline(
      'portuguese',
      n.conteudo_busca,
      websearch_to_tsquery('portuguese', termo),
      'StartSel=<<,StopSel=>>,MaxWords=24,MinWords=8,MaxFragments=1'
    )
  from public.notas_estudo n
  join public.materias m on m.id = n.materia_id
  -- `websearch_to_tsquery` e nao `plainto_tsquery`: aceita aspas para frase
  -- exata e `-palavra` para excluir, que e como qualquer um ja espera digitar.
  where n.busca @@ websearch_to_tsquery('portuguese', termo)
  order by ts_rank(n.busca, websearch_to_tsquery('portuguese', termo)) desc,
           n.atualizada_em desc
  limit limite
$$;

comment on function public.buscar_notas (text, int) is
  'Busca literal no conteudo das notas. Titulo pesa mais que corpo; devolve trecho com o termo entre << >>.';
