# Notas como espaço de conhecimento — design

**Data:** 2026-08-14
**Status:** aprovado para planejamento
**Contexto:** a migration de 13/08 (`20260813000001_notas_estudo.sql`) promoveu nota
de coluna de `materias` para entidade própria. Aquela correção resolveu o fluxo de
escrever — mas deixou a nota isolada: presa a uma matéria, sem vocabulário comum com
o resto do pilar, invisível na busca global, e com um editor de texto simples num
curso que é feito de fórmula e diagrama. Este spec transforma o conjunto de notas em
base de conhecimento de cinco anos.

## Problema

Quatro limitações, todas consequência de nota ter nascido como campo de ficha:

- **Não há ligação entre notas.** Séries de Taylor aparece em Cálculo 2, Sinais e
  Numérico. Hoje cada matéria tem sua nota, sem nenhuma aresta entre elas. Ao fim do
  curso o conteúdo existe, o conhecimento não.
- **Não há vocabulário durável.** `registro_listas.topico`
  (`20260804000003_fase2_estudos.sql:86`) já guarda tópico como texto livre, e a nota
  não tem nem isso. Matéria é entidade semestral: quando 2026.1 termina, o que se
  escreveu fica sepultado num período encerrado.
- **`materias.semestre` é texto livre** (`20260804000003_fase2_estudos.sql:15`).
  `"2026.1"` e `"2026/1"` viram dois semestres e nenhum filtro percebe. Não há onde
  pendurar início, fim ou "é o semestre atual" — hoje isso é inferido por data em
  `dentroDoPeriodoMateria`, e cada consumidor reimplementa a inferência.
- **O conteúdo é texto puro.** Nota de Engenharia sem fórmula renderizada, sem
  gráfico de função e sem diagrama é nota que perde para o caderno de papel — e o
  app deixa de ser usado para isso.

E `useIndiceBusca.ts:24-35` indexa categorias, matérias, treinos, exercícios e
projetos. Nota, que é o texto mais volumoso do sistema, está fora.

## Decisão de escopo

**Nota continua ancorada em matéria.** `materia_id` permanece `not null`. A
durabilidade vem dos wikilinks e dos tópicos, não de desacoplar o dono — é o modelo
do Obsidian, onde a nota mora numa pasta e linka para qualquer lugar. Desacoplar
criaria nota órfã sem ganho: a hierarquia matéria → semestre é justamente o que
responde "de onde isso veio".

**Semestre é normalizado, tópico também.** Os dois viram tabela pelo mesmo motivo —
precisam ser renomeáveis e mescláveis. Em cinco anos vão existir "regra da cadeia",
"Regra da Cadeia" e "cadeia"; com `text[]` isso não se conserta sem varrer conteúdo.

**Semestre nunca se liga direto à nota.** A cadeia é `nota → materia → semestre`.
Dois caminhos para a mesma informação é como se produz dado inconsistente.

**Markdown é a fonte de verdade.** Não JSON, não HTML. O sistema não tem
autenticação nem backup (resolução 10.0): um `.md` legível sobrevive ao Nexus, ao
Supabase e a uma troca de editor. É também o que torna `tsvector` e o RAG futuro
triviais.

**Fora deste spec:** RAG, busca semântica e reuniões da camada de fé. O editor nasce
no kernel para servi-las depois, mas nada delas é construído aqui.

## Consequência aceita: o Markdown deixa de ser padrão

O conteúdo passa a ter quatro construções que um editor externo não renderiza:
`$math$`, ```` ```plot ````, ```` ```mermaid ```` e `![[desenho:uuid]]`.

Aberto no VS Code, os três primeiros aparecem como texto — e LaTeX e Mermaid são
legíveis assim, o que preserva o argumento de portabilidade. O quarto não: é uma
referência opaca. Por isso `desenhos` guarda **SVG além do JSONB** (seção 7), e a
exportação (seção 10) troca a referência pelo arquivo.

Não há mitigação além disso, e é uma troca consciente: Markdown estrito não comporta
diagrama nem gráfico, e a alternativa seria não ter a feature.

## Restrição transversal: mobile

**Esta é a primeira feature do sistema desenhada como desktop-first, por decisão
explícita.** Escrever fórmula, desenhar diagrama e construir geometria interativa não
são tarefas de tela de 6 polegadas, e forçar paridade encareceria tudo sem uso real.

O que isso significa concretamente, para não virar desculpa:

- **Leitura funciona no celular, sempre.** Nota renderizada — fórmula, gráfico,
  diagrama, SVG do desenho — é responsiva e legível. É o caso de uso real no mobile:
  consultar antes da aula.
- **Edição no celular cai para `textarea` sobre o mesmo Markdown.** Sem Milkdown, sem
  MathLive, sem Excalidraw. Corrigir uma frase continua possível; o conteúdo nunca
  fica refém do desktop.
- **O editor rico e os quatro blocos carregam por `lazy`**, então quem só lê no
  celular não baixa quatro engines de renderização.

## 1. Tabelas novas

Migration `app/supabase/migrations/20260814000001_notas_conhecimento.sql`.

```sql
create table public.semestres (
  id uuid primary key default gen_random_uuid(),
  -- Rótulo canônico: '2026.1'. Único, e é o que substitui o texto livre.
  rotulo text not null unique check (btrim(rotulo) <> ''),
  data_inicio date,
  data_fim date,
  -- Declarado, não inferido. Hoje "semestre atual" é derivado de data em cada
  -- consumidor; um booleano dá fonte de verdade única.
  atual boolean not null default false
);

-- No máximo um semestre atual. Sem isto, dois `true` fazem cada tela escolher
-- um diferente.
create unique index semestres_atual_unico
  on public.semestres (atual)
  where atual;

create table public.topicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (btrim(nome) <> ''),
  slug text not null unique
);

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

create table public.desenhos (
  id uuid primary key default gen_random_uuid(),
  nota_id uuid not null references public.notas_estudo (id) on delete cascade,
  titulo text,
  -- Fonte de verdade, editável pelo Excalidraw.
  cena jsonb not null,
  -- Render exportado. Existe para ler sem instanciar o editor, e para o desenho
  -- sobreviver a uma troca de biblioteca.
  svg text,
  atualizado_em timestamptz not null default now()
);
```

`materias` ganha `semestre_id uuid references public.semestres (id)`. A coluna
`semestre text` **não é apagada nesta migration**: é lida para popular `semestres`
(um `insert ... select distinct`) e depois marcada como obsoleta em comentário. Sai
numa migration seguinte, depois de a UI já escrever no campo novo — mesmo cuidado
que a migration de 13/08 tomou com `notas_estudo`.

`notas_estudo` ganha:

```sql
alter table public.notas_estudo add column slug text;
-- Backfill a partir do título, com sufixo numérico em colisão, antes do not null.
alter table public.notas_estudo alter column slug set not null;
create unique index notas_estudo_slug_unico on public.notas_estudo (slug);
```

**Slug é único global, não por matéria.** Wikilink resolve por slug e é escrito à
mão; se o mesmo slug existisse em duas matérias, `[[series-de-taylor]]` seria
ambíguo. Ambiguidade em link é pior que colisão de nome.

`desenhos.atualizado_em` reusa o padrão de trigger de `trg_nota_atualizada_em`
(13/08): carimbo no banco, nunca pelo cliente.

## 2. Camada pura de Markdown — a fundação

`features/notas/markdown.ts`, funções puras sobre string, sem DOM e sem ProseMirror,
no mesmo espírito de `calculos.ts`:

```ts
export function gerarSlug(titulo: string): string
export function extrairLinks(conteudo: string): string[]        // slugs citados
export function extrairReferenciasDesenho(conteudo: string): string[]
export function removerMatematica(conteudo: string): string
export function renomearLinks(conteudo: string, de: string, para: string): string
```

**Esta camada vem antes do editor, e é o seguro contra a única decisão arriscada da
stack.** Se o Milkdown virar um problema e o editor mudar, nada aqui muda uma linha.
Escrever na ordem inversa — editor primeiro — amarraria as regras de parsing à
biblioteca.

`removerMatematica` existe por causa da busca (seção 8): `\frac{\partial}{\partial x}`
gera tokens que degradam a relevância de todo o índice.

## 3. Ponto único de escrita

`links_nota` e `notas_topicos` são **derivados** do conteúdo. Se existir qualquer
caminho que grave `conteudo` sem re-derivar, o grafo passa a mentir — e backlink
errado é pior que backlink ausente, porque parece correto.

Decisão: uma função `salvarNota` em `features/notas/api.ts` por onde tudo passa —
parse, upsert da nota, apaga as arestas cuja origem é ela, insere as novas, resolve
`destino_id` por slug. Nenhum componente chama `update` em `conteudo` diretamente.

Renomear título é caso especial: além de regravar a nota, propaga `renomearLinks` nas
notas que a citam (`links_nota` por `destino_id`) e reatribui os slugs pendentes que
agora resolvem. Em base single-user é um `update` barato.

## 4. Editor no kernel

Estudos precisa dele agora; reuniões vão precisar depois. Pela regra de dependência
do README (linhas 92-106), o que duas features precisam sobe para o kernel:
`components/EditorMarkdown.tsx`.

O editor não pode conhecer notas — mas o autocomplete de `[[` precisa buscá-las. A
costura é injeção:

```ts
<EditorMarkdown
  value={string}
  onChange={(md: string) => void}
  buscarReferencias={(termo: string) => Promise<Referencia[]>}
  onSalvarDesenho={(cena, svg) => Promise<string>}   // devolve o id
/>
```

Quem passa as funções é a camada de composição (`pages/estudos/`). O kernel fica sem
import de feature, e o editor serve reuniões sem alteração.

**Biblioteca: `Milkdown/milkdown`.** Wrapper de ProseMirror cujo alvo de serialização
é Markdown, via `remark` — então `remark-math` resolve fórmula sem parser próprio, e
os outros três blocos são cercas de código, sintaxe que o Markdown já tem. TipTap tem
ecossistema maior e melhor documentação, mas serializa JSON: com pelo menos cinco nós
customizados, o custo de manter parse e serialize dos dois lados é permanente e
proporcional. A escolha é justificada pela fonte de verdade ser Markdown, e é a
decisão mais fácil de reverter graças à seção 2.

## 5. Matemática

- **`KaTeX/KaTeX`** + `remark-math` para renderizar. Síncrono e rápido; cobre o LaTeX
  de Engenharia. MathJax é mais completo em cantos exóticos e assíncrono — não vale.
- **`arnog/mathlive`** para entrada, devolvendo LaTeX. Não é enfeite: digitar
  `\int_{0}^{\infty}` às cegas é lento o suficiente para desistir de anotar no app, e
  fricção é o que matou as tentativas anteriores de manter um sistema pessoal.
- **`josdejong/mathjs`** para parse e avaliação — requisito do bloco `plot` (seção 7)
  e, de bônus, conversão de unidades, útil em quase toda matéria.

Armazenamento: LaTeX cru entre `$` e `$$`. Renderização é view; fonte é texto.

## 6. Wikilink e backlinks

Sintaxe `[[slug]]` ou `[[slug|texto exibido]]`.

**Persistido por slug, não por id.** Id sobreviveria a renomeação sem esforço, mas
tornaria o `.md` ilegível fora do app — e portabilidade é o argumento que sustenta a
escolha de Markdown. Renomeação propaga (seção 3).

Painel lateral na página da nota com: backlinks (`links_nota` por `destino_id`),
tópicos, e links quebrados (arestas com `destino_id` nulo) — estes últimos
apresentados como sugestão de nota a criar, não como erro.

Autocomplete usa `pg_trgm` sobre `titulo`, para o `[[` tolerar erro de digitação, e
o componente `command` do shadcn que a `PaletaComandos` já usa.

## 7. Blocos de visualização

Todos por `lazy` + `Suspense`, um por vez, nesta ordem de implementação:

1. **`mermaid-js/mermaid`** — cerca ```` ```mermaid ````. O mais simples; valida o
   mecanismo de bloco customizado antes dos outros. Cobre máquina de estados e fluxo
   de processo: texto, versionável, rápido de escrever.
2. **`mauriciopoppe/function-plot`** — cerca ```` ```plot ```` com uma expressão e o
   domínio. Escolhido em vez do Recharts já instalado (`recharts ^3.10.1`) por um
   motivo concreto: Recharts liga pontos consecutivos, então `1/x` e `tan(x)` ganham
   uma reta vertical falsa na assíntota. Em Cálculo isso aparece toda semana.
   **Recharts continua o padrão do resto do app** — function-plot é para função
   matemática, Recharts é para dado.
3. **`excalidraw/excalidraw`** — referência `![[desenho:uuid]]`. Renderiza o `svg`
   guardado; o editor sobe só ao clicar, porque abrir uma nota com cinco diagramas
   não deve instanciar cinco editores. Ao salvar, grava `cena` e `svg` juntos.
4. **`jsxgraph/jsxgraph`** — geometria interativa com sliders. O mais complexo e o de
   maior retorno no curso: arrastar o parâmetro e ver a reta tangente mudar, ou a
   soma de Riemann refinando, é o que transforma nota em material que ensina.

Sem `plotly.js` neste spec: 3D e superfície são relevantes em Cálculo 3, mas o peso
não se justifica antes de a necessidade aparecer.

## 8. Busca

Coluna gerada em `notas_estudo` com `to_tsvector('portuguese', ...)` sobre título mais
conteúdo **com a matemática removida** (seção 2), e índice GIN.

`useIndiceBusca.ts` passa a indexar notas junto de categorias, matérias, treinos,
exercícios e projetos (`:24-35`, com o mapeamento em `:48` como modelo). A paleta vira
o modo principal de navegar entre notas — é assim que se usa Obsidian de verdade: se
busca, não se navega.

## 9. Reorganização visual

`MateriaDetalhePage.tsx:221` tem `defaultValue="avaliacoes"`, com Notas em último
lugar entre as seis abas (`:223-228`).

- **`defaultValue` passa a `"notas"`**, e a aba move para primeira posição. A matéria
  é espaço de conhecimento; é ali que se trabalha.
- **A proeminência de prova não é removida, é realocada.** Urgência de avaliação já
  vive na Home e no Calendário, via `CardPressaoPrazos` e a contagem regressiva —
  que é onde ela é consultada antes de decidir o dia. Dentro da matéria ela competia
  pela tela com o conteúdo.
- **Rota nova `/notas/:slug`** para a nota em largura de leitura, com o painel da
  seção 6 — página, não diálogo dentro de aba. `AbaNotas.tsx` (184 linhas) continua
  como lista e ponto de entrada.
- **Índice global `/notas`**, sem escopo de semestre, filtrável por matéria, tópico e
  semestre. Sem ele, achar nota antiga exige lembrar em que semestre foi escrita —
  exatamente o que ninguém lembra.

## 10. Exportação

Dump de um `.zip`: um `.md` por nota, o SVG de cada desenho, e a referência
`![[desenho:uuid]]` substituída pelo caminho do arquivo.

Fica por último na ordem de fases, com uma ressalva registrada: **é a única rede de
segurança contra perda de dado que o sistema tem**. Se a base de notas crescer rápido,
promover para antes da seção 7.

## Fases

Cada fase deixa o sistema funcionando, e o que é irreversível vem antes do que é
reversível:

1. Migration (seção 1), com backfill de slug e de `semestres`
2. Camada pura + testes (seção 2) — nenhuma UI
3. CRUD, rotas, `salvarNota`, backlinks, índice global — **com `textarea`**, de
   propósito
4. Milkdown atrás do componente do kernel (seção 4)
5. Matemática (seção 5)
6. Autocomplete de wikilink (seção 6) — os links já funcionam desde a fase 3
7. Blocos, na ordem da seção 7
8. Busca (seção 8)
9. Reorganização visual (seção 9)
10. Exportação (seção 10)

O ganho da fase 3 usar `textarea`: ao fim dela o schema, os hooks, o grafo e as rotas
estão validados, e o editor passa a ser detalhe substituível em vez de alicerce.

## Testes

Em `features/notas/markdown.test.ts`:

- `gerarSlug` é estável, sem acento, e resolve colisão com sufixo
- `extrairLinks` acha `[[slug]]` e `[[slug|texto]]`, ignora `[[` dentro de bloco de
  código e dentro de `$$`
- `removerMatematica` não altera nada fora dos delimitadores
- `renomearLinks` troca só o alvo pedido e preserva o texto exibido

Em `features/notas/api.test.ts`:

- salvar re-deriva as arestas: link removido do texto desaparece de `links_nota`
- link para slug inexistente grava aresta com `destino_id` nulo, sem erro
- criar a nota que faltava resolve as arestas pendentes que apontavam para o slug
- renomear título propaga nos links de entrada e não deixa aresta órfã

Invariantes de schema:

- toda nota tem `slug` não vazio e único
- no máximo um `semestres.atual = true`
- apagar matéria apaga suas notas (cascade já existente) e, com elas, as arestas de
  origem — mas as arestas que **apontavam** para elas viram `destino_id` nulo, não
  desaparecem

Manual, uma vez: escrever uma nota em Cálculo com fórmula, gráfico e desenho, linkar
de outra matéria, e conferir que ela aparece na paleta e no índice global — e que a
mesma nota é legível no celular.

## Fora de escopo

- **RAG e busca semântica.** Precisam de corpus antes; a fase 8 entrega busca
  literal, que é pré-requisito e resolve a maior parte do "sei que anotei isso em
  algum lugar".
- **Reuniões da camada de fé.** O editor nasce no kernel para servi-las, mas o schema
  e a página delas são outro spec.
- **`registro_listas.topico` migrando para FK.** Deveria compartilhar vocabulário com
  `topicos`, e vai — mas depois que a tabela existir e estiver povoada, para a
  migração ter em que se ancorar.
- **Página aninhada de verdade** (nota dentro de nota, como Notion). A hierarquia
  matéria → sessão → nota mais os wikilinks cobrem o uso previsto; blocos como
  entidade quebrariam Markdown como fonte de verdade e o plano de busca.
- **`plotly.js`** e edição colaborativa.
