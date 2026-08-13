-- =============================================================================
-- Notas de estudo como entidade própria (corrige a migration de 12/08)
--
-- A feature de 12/08 colocou as anotações como COLUNAS de `materias`
-- (`notas_estudo`, `notas_particularidades`). Consequência descoberta em uso:
-- anotar durante o estudo exigia abrir o diálogo de CADASTRO da matéria e
-- salvar o registro dela — a aba Notas era só leitura e dizia literalmente
-- "edite a matéria para adicionar". Era um campo de ficha, não um caderno: uma
-- nota por matéria, sem título, sem histórico, e escrever mexia na linha da
-- matéria.
--
-- Nota passa a ser entidade, dona de si, com FK para a matéria — mesmo padrão
-- de `documentos` e `sessoes_estudo`, que o pilar já usa. Várias notas por
-- matéria, cada uma com título, e escrever não toca `materias`.
--
-- `notas_particularidades` FICA como coluna: email do professor e política de
-- faltas são referência estável, pertencem à ficha da matéria, e editar pelo
-- cadastro é o comportamento certo para elas. A distinção que a migration de
-- 12/08 descreveu estava certa; o erro foi tratar os dois lados como o mesmo
-- tipo de dado.
--
-- `sessao_id` opcional: uma nota pode ser o registro do que foi estudado numa
-- sessão específica, e aí ela aparece junto da sessão. `on delete set null` e
-- não `cascade` — apagar a sessão não pode apagar o que foi anotado nela.
-- =============================================================================

-- Tudo aqui é reexecutável: esta migration foi aplicada à mão no editor SQL,
-- então não entrou no histórico da CLI e um `db push` futuro vai tentar rodá-la
-- de novo. Sem os guardas, o segundo run erraria no create e duplicaria as notas
-- migradas.

create table if not exists public.notas_estudo (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references public.materias (id) on delete cascade,
  -- Nulo = nota da matéria, sem sessão. É o caso normal.
  sessao_id uuid references public.sessoes_estudo (id) on delete set null,
  titulo text not null check (btrim(titulo) <> ''),
  -- Nasce vazio de propósito: criar a nota e escrever depois é fluxo válido.
  conteudo text not null default '',
  -- Fixar sobe a nota para o topo da lista, independente de quando mudou.
  fixada boolean not null default false,
  created_at timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);

create index if not exists notas_estudo_materia_idx
  on public.notas_estudo (materia_id, fixada desc, atualizada_em desc);

create index if not exists notas_estudo_sessao_idx
  on public.notas_estudo (sessao_id)
  where sessao_id is not null;

comment on table public.notas_estudo is
  'Notas de estudo de uma matéria. Documento vivo: título + conteúdo editados ao longo do período, não entrada datada.';
comment on column public.notas_estudo.sessao_id is
  'Sessão de estudo a que a nota se refere, quando houver. Nulo é o caso normal.';
comment on column public.notas_estudo.atualizada_em is
  'Mantido por trigger. É o que a lista mostra — "ontem", "12/08" — porque numa nota o que importa é quando ela mudou, não quando nasceu.';

-- =============================================================================
-- atualizada_em via trigger (nunca pelo cliente)
--
-- Primeira tabela do schema com carimbo de atualização. Fica no banco, e não no
-- `update` da API, pela mesma razão de todo campo-resumo aqui (resolução 10.9):
-- quem escreve não pode escolher não carimbar.
-- =============================================================================

create or replace function public.trg_nota_atualizada_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizada_em := now();
  return new;
end;
$$;

drop trigger if exists notas_estudo_atualizada_em on public.notas_estudo;

create trigger notas_estudo_atualizada_em
  before update on public.notas_estudo
  for each row
  execute function public.trg_nota_atualizada_em();

-- =============================================================================
-- Migração do conteúdo já escrito
--
-- Cada matéria com `notas_estudo` preenchido vira uma nota com esse título —
-- nada do que foi escrito se perde. Depois a coluna sai: mantê-la deixaria dois
-- lugares para anotar a mesma coisa, que é o defeito a corrigir, não a manter.
-- =============================================================================

-- Copiar e derrubar dentro do mesmo bloco condicional: na segunda execução a
-- coluna já não existe, e um `insert ... select notas_estudo` solto erraria em
-- vez de virar no-op. O drop no fim garante que o par copia-e-remove nunca
-- acontece pela metade.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'materias'
      and column_name = 'notas_estudo'
  ) then
    insert into public.notas_estudo (materia_id, titulo, conteudo)
    select id, 'Notas de estudo', notas_estudo
    from public.materias
    where notas_estudo is not null
      and btrim(notas_estudo) <> '';

    alter table public.materias drop column notas_estudo;
  end if;
end
$$;
