# Nota como página — design

**Data:** 2026-08-14
**Status:** aprovado para planejamento
**Contexto:** o spec de hoje cedo (`2026-08-14-notas-conhecimento-design.md`) entregou
o grafo, o editor, a matemática, os blocos, a busca e a exportação. O que ele não
tratou foi **onde** se escreve. Descoberto em uso, na mesma tarde: escrever uma
nota de Engenharia num diálogo de 384px é o que faz a feature parecer um campo de
ficha de novo — o defeito que a migration de 13/08 tinha ido corrigir.

## Problema

Três fatos, todos verificáveis no código de hoje:

- **O diálogo de escrita tem 384px.** `components/ui/dialog.tsx:80` fixa
  `sm:max-w-sm`. É mais estreito que um celular deitado, e é onde hoje se
  escreve fórmula, diagrama, gráfico e desenho.
- **A página da nota é só leitura.** `/notas/:slug` renderiza o conteúdo num
  `Card` e oferece um lápis que joga de volta no diálogo de 384px.
- **O fluxo está invertido em relação à referência.** No Notion e no AFFiNE a
  página **é** o editor: ler e escrever são a mesma superfície, separadas só
  pelo foco. Aqui são duas superfícies, e a de escrever é a menor.

O resultado é que a nota não parece um documento. Parece um formulário.

## Referências, e o que se tira de cada uma

**O design system do projeto manda.** `index.css:12` já declara "paleta estilo
Notion", e usa `#37352f` — literalmente a cor de texto do Notion. Paleta,
tipografia e movimento **não se mexem**. Este spec não propõe cor nova nem
animação nova.

**Notion** entrega o modelo de leitura: título como âncora do documento,
propriedades logo abaixo, corpo em coluna estreita, backlinks ao pé.

**AFFiNE** entrega as afordâncias do editor: menu `/`, alça de arrasto por
bloco, preview ao passar o mouse, painel de propriedades. Todas são UI sobre o
conteúdo — nenhuma exige mudar como o conteúdo é guardado.

**O que do AFFiNE fica de fora, e por quê.** O modo Edgeless dele guarda posição
por bloco num CRDT. Isso quebra "Markdown é a fonte de verdade", que é a decisão
que sustenta a exportação, a busca e a portabilidade inteira. O spec anterior já
tinha rejeitado blocos como entidade pelo mesmo motivo. Canvas livre continua
fora, e volta como spec próprio se voltar.

## O que não muda

Vale listar, porque é o que impede este spec de virar reescrita:

- `features/notas/markdown.ts`, `grafo.ts`, `plot.ts`, `geometria.ts` e
  `exportacao.ts` — a camada pura inteira, e seus 100+ testes.
- `salvarNota` como ponto único de escrita, e a invariante de que o grafo é
  derivado do conteúdo.
- O schema. Nenhuma migration.
- A paleta, as fontes e os utilitários de movimento.

## 1. Node views: o editor mostra o que a leitura mostra

**Descoberto ao planejar, e é o maior item de trabalho deste spec.**

Hoje existem dois renderizadores. `ConteudoNota.tsx` (leitura) desenha fórmula,
mermaid, plot, geometria e desenho. O Milkdown (edição) só sabe commonmark, gfm
e math.

Enquanto são duas telas, funciona. No instante em que a página vira o editor,
os blocos viram texto cru enquanto se escreve — a cerca ```` ```mermaid ````
aparece como código e o desenho some. Seria trocar o diálogo de 384px por uma
regressão de leitura.

Então a fusão das telas **exige** node views no Milkdown para os quatro blocos,
via `$view` de `@milkdown/kit/utils`. Os quatro renderizadores atuais já são
"desenhe dentro desta div", que é exatamente o contrato de um NodeView — o
trabalho é de ciclo de vida, não de reescrita.

**O risco concreto:** mermaid, function-plot e jsxgraph montam em efeito e
precisam de `destroy` quando o nó sai do documento. Vazar aqui trava o editor
depois de algumas edições, e é o tipo de erro que só aparece em uso.

`ConteudoNota.tsx` **fica**, como renderizador de leitura — é o que o celular
usa, e é o que evita baixar 458 kB de ProseMirror para ler uma nota. Ver a
seção Mobile. Não há regra duplicada entre os dois: ambos montam os mesmos
componentes de bloco, e só a estratégia de montagem difere.

## 2. A página é o editor

`pages/notas/NotaDetalhePage.tsx` passa a ser a única superfície de escrita.

`DialogNota` **encolhe para o que só ele resolve**: criar. Título e matéria, e
navega direto para `/notas/:slug` com o cursor no corpo. Os três pontos de
entrada (card da matéria, linha da sessão, aba Notas) continuam criando por ali
— o que muda é que criar leva para a página em vez de abrir um editor de 384px.

Editar deixa de existir como modo. Não há botão de editar: clicar no texto
escreve.

## 3. Escala de leitura própria

O app é `text-sm` (14px) em toda parte, e está certo: é um painel de leituras
rápidas — saldo, média, faltas restantes. Uma nota é o oposto: texto longo, lido
por vinte minutos seguidos.

A página da nota ganha escala própria, e é a única do app que ganha:

| Papel | Tamanho | Entrelinha | Peso |
| --- | --- | --- | --- |
| Título | 2.5rem | 1.15 | 700 |
| Corpo | 1rem | 1.65 | 400 |
| Propriedades | 0.75rem | 1.4 | 400 |

Medida do corpo travada em ~68 caracteres. Acima disso o olho perde a volta da
linha, e é o erro mais comum de editor em tela larga.

Fontes seguem Inter e JetBrains Mono. Nada de face nova.

## 4. Layout: documento com trilho

```
 Cálculo 2 / Séries de Taylor                    │  CONHECIMENTO
 ────────────────────────────────────────────────┤
                                                 │  Citada por · 3
   Séries de Taylor                              │   → Sinais
                                                 │   → Numérico
   Matéria      Cálculo 2                        │   → Cálculo 3
   Semestre     2026.1                           │
   Tópicos      #taylor  #convergência  +        │  Tópicos
   Editada      hoje, 14:32                      │   #taylor
   ─────────────────────────────────             │   #convergência
                                                 │
   Uma série de Taylor aproxima…                 │  A escrever · 1
                                                 │   convergência-uniforme
   $$ f(x) = \sum … $$                           │   [criar]
                                                 │
   ┌─ desenho ──────────────┐  ⤢                 │
   └────────────────────────┘                    │
```

Trilho de 280px, recolhível, estado lembrado. No mobile ele vira rodapé — a
mesma informação, depois do texto.

O trilho existe porque o grafo é a tese desta feature. O Notion puro põe
backlinks no rodapé, e ali eles só aparecem se você rolar até o fim; numa base
de conhecimento isso é esconder o que dá sentido ao resto.

**Sem `Card` em volta do texto.** Hoje o conteúdo mora num `Card` com borda e
sombra, o que o faz parecer um widget do painel. O documento é a página.

## 5. Bloco de propriedades

Sob o título, no padrão Notion/AFFiNE: rótulo apagado à esquerda, valor à
direita, sem card e sem borda. Matéria, semestre, tópicos e "editada em".

Tópico vira **editável ali** — hoje só existe escrevendo `#hashtag` no corpo, o
que é ótimo enquanto se escreve e péssimo quando se quer só classificar uma nota
pronta. Adicionar pelo bloco de propriedades escreve a hashtag no fim do
conteúdo, mantendo a regra de que tópico é derivado do texto.

## 6. Dois gatilhos: `//` para símbolo, `/` para bloco

A barra permanente com "Fórmula", "Ligar nota" e "Desenho" some. Ela ocupa
espaço fixo em toda nota para uma ação ocasional, e empurra o texto para baixo.

No lugar, dois gatilhos, divididos pelo que a coisa **é**:

| Gatilho | Insere | Onde |
| --- | --- | --- |
| `//` | símbolo matemático — integral, somatório, fração, limite | dentro da frase |
| `/` | bloco que ocupa a linha — mermaid, plot, geometria, desenho | início de linha |
| `[[` | wikilink | dentro da frase (já existe, não muda) |

### `//` — o que decide se escrever fórmula é viável

```
digita:   A área sob a curva é //int
          ┌──────────────────────────────────┐
          │ ∫   integral            \int     │  ← junto ao cursor
          │ ∫∫  integral dupla      \iint    │
          │ ∮   integral de linha   \oint    │
          └──────────────────────────────────┘
Enter →   A área sob a curva é $\int_{▮}^{}$
Tab   →   pula para o expoente
Tab   →   sai da fórmula
```

**Não é um diálogo, e essa é a exigência.** Um modal quebra a noção de escrever
no teclado: tira a mão do lugar, tira os olhos da frase, e transforma "escrever
uma integral" em "executar um comando". Aqui a lista aparece junto do cursor,
filtra conforme se digita, e `Enter` continua a frase.

Três decisões dentro disso:

- **O catálogo é dado puro**, em `features/notas/latex.ts`:
  `{ gatilho, rótulo, símbolo, latex, cursor }`. Testável sem DOM, e trocar o
  editor não o toca — mesma regra de `markdown.ts`.
- **Não duplica os `$`.** Digitando `//int` já dentro de uma fórmula, insere
  `\int` cru; fora dela, insere `$\int_{}^{}$`. Saber onde o cursor está sai de
  graça de `mapear()`, que a camada pura já tem.
- **`Tab` anda pelos buracos.** Sem isso, insere-se `\int_{}^{}` e ainda é
  preciso clicar em cada chave — o que devolve a mão ao mouse e anula o ganho.

`//` foi escolhido por não colidir com nada: `\` é como o próprio LaTeX começa
(e quem sabe de cor continua digitando `\int` direto), e `/` já é a convenção
de bloco no Notion e no AFFiNE.

### O MathLive vira recurso secundário

O `DialogFormula` sai da barra e passa a ser uma entrada do menu, para montar
matriz ou algo que não se lembra de cabeça. Continua valendo o argumento do spec
anterior — digitar `\begin{bmatrix}` às cegas é lento demais — mas para o
símbolo do dia a dia o `//` é mais rápido que qualquer editor visual.

## 7. Alça de arrasto por bloco

`@milkdown/kit/plugin/block` dá alça de arrasto nos nós de topo. Reordenar
parágrafo, cerca e fórmula é **operação segura em Markdown**: muda a ordem das
linhas, não o formato.

É a afordância do AFFiNE que mais se paga aqui, porque nota de estudo é
reorganizada o tempo todo — o que virou resumo de prova nasceu como anotação
solta de aula.

## 8. A assinatura: o wikilink que mostra o que há do outro lado

É onde a ousadia deste spec é gasta, e o único lugar. Não compete com o Check do
dia, que é a assinatura da Home (`index.css:309`): aquilo é toque, isto é
leitura.

Passar o mouse num `[[link]]` abre um **peek**: título, matéria e as primeiras
linhas da nota citada. Link para nota que ainda não existe se distingue no traço
e oferece **criar sem sair da página**.

Por que isto e não outra coisa: é o que separa uma base de conhecimento de um
editor de texto. E é literalmente o que o spec anterior diz que o link quebrado
é — *"é onde a próxima nota nasce"*. Hoje essa frase é verdadeira no banco e
mentira na tela, porque criar exige sair, escolher matéria e voltar.

## 9. Autosave

A página salva sozinha. Indicador discreto no cabeçalho: "salvando" → "salvo".

**O detalhe técnico que decide se isto é viável.** `salvarNota` hoje faz, a cada
chamada: carrega todos os slugs, grava a nota, apaga as arestas de origem,
insere as novas, apaga os tópicos, insere os novos, resolve pendentes. São ~6
idas ao servidor. A cada 2 segundos de digitação, é insustentável.

A saída é separar o que muda a cada tecla do que muda raramente:

```ts
// Sempre, com debounce. Uma consulta.
salvarConteudo(id, conteudo, conteudoBusca)

// Só quando o CONJUNTO de links ou tópicos muda. O resto.
rederivarGrafo(id, conteudo)
```

Saber se mudou é comparação de arrays de string vinda de `extrairLinks` e
`extrairTopicos` — puro, barato, e já testado. Digitar dentro de um parágrafo não
mexe no grafo; escrever `[[` mexe, e aí a re-derivação acontece.

A invariante do spec anterior fica **intacta**: o grafo continua sendo re-derivado
sempre que o conjunto muda. O que muda é não re-derivar quando nada mudou.

Renomear título continua caminho à parte, mais caro, e dispara no blur do título
— nunca a cada tecla, porque propaga escrita em outras notas.

**Risco aceito e registrado:** sem histórico de versões, autosave grava por cima
sem volta. A opção de versionar foi considerada e ficou fora deste spec por ser
schema novo. A exportação `.zip` (seção 10 do spec anterior) segue sendo a única
rede — e este spec aumenta a razão para usá-la com frequência.

## Mobile

**O celular é só leitura. Esta feature é desktop.**

Isto endurece a restrição do spec anterior, que ainda oferecia edição no
celular por `textarea`. Aquilo tinha custo — dois modos de inserção, uma porta
imperativa com dois donos, cada afordância decidindo se existe ou não no
mobile — e nenhum uso real por trás. Escrever fórmula, arrastar bloco e desenhar
não são tarefas de polegar. Vale mais fazer bem uma coisa.

Consequências, todas simplificações:

- `EditorMarkdown` perde a ramificação de `textarea`. Sobra um caminho só.
- A porta imperativa `Inserir` perde o segundo dono e vira direta.
- `//`, `/` e a alça de arrasto não precisam de resposta para mobile: não
  existem lá.

**O que fica no celular:** a nota renderizada, completa — fórmula, diagrama,
gráfico, geometria e desenho, tudo legível e responsivo. É o caso de uso real
que o spec anterior nomeou: consultar antes da aula.

### Uma correção ao que eu disse na fase 1

`ConteudoNota.tsx` **não sai.** Ele passa a ser o renderizador de leitura, e é
o que o celular usa.

O motivo é peso: o chunk do Milkdown tem 458 kB. Renderizar a nota com o editor
em modo somente-leitura daria um renderizador só, o que é mais elegante — mas
faria quem abre a nota no ônibus baixar o ProseMirror inteiro para ler. O
`ConteudoNota` já existe, já funciona e monta os mesmos componentes de bloco
que as node views vão montar, então não há regra duplicada: o que difere é só a
estratégia de montagem.

A fase 1 continua necessária pelo mesmo motivo de antes — o **editor** precisa
mostrar o que a leitura mostra. O que muda é que ela não termina apagando nada.

## Fases

Cada uma deixa o sistema funcionando:

1. **Node views dos quatro blocos.** Vem primeiro porque sem ela a fase 2
   regride a leitura no desktop.
2. **Página vira editor** no desktop, **leitura no celular**: `NotaDetalhePage`
   com título editável, corpo em largura de leitura, sem `Card`; `DialogNota`
   reduzido a criar e navegar; `EditorMarkdown` perde a ramificação de
   `textarea`
3. Escala de leitura e bloco de propriedades
4. **Autosave**, com `salvarConteudo` separado de `rederivarGrafo` — antes das
   afordâncias, porque é o que sustenta todas elas
5. Trilho de conhecimento recolhível
6. **`//` de símbolo**, com catálogo puro e `Tab` entre os buracos
7. **`/` de bloco**, e o MathLive rebaixado a entrada do menu
8. Alça de arrasto
9. Peek do wikilink e criação inline — a assinatura, por último, porque é a que
   depende de tudo estar de pé

A ordem mudou em relação ao primeiro rascunho deste spec por causa da fase 1,
que só apareceu ao conferir o código: o editor não sabia renderizar os blocos
que a leitura renderiza.

## Testes

Na camada pura, em `features/notas/`:

- comparar conjuntos de links e de tópicos entre dois conteúdos detecta
  inclusão, remoção e reordenação sem falso positivo
- conteúdo que muda sem mexer em link nem tópico não pede re-derivação
- o catálogo de `latex.ts` não tem gatilho repetido, e todo item declara ao
  menos uma posição de cursor
- filtrar o catálogo por prefixo acha `int` em "integral" e não acha em
  "sen"
- inserir dentro de região de matemática devolve LaTeX cru; fora dela, devolve
  envolvido em `$`

Manual, uma vez, **no desktop**: escrever uma nota inteira sem tirar a mão do
teclado — `//int` para a integral, `Tab` entre os buracos, `/` para um gráfico,
`[[` para citar outra nota. Conferir que o indicador sai de "salvando" para
"salvo", que o peek abre ao passar o mouse num link, que criar a nota faltante
pelo trilho funciona, e que reordenar dois blocos por arrasto sai na ordem nova
no `.md` exportado.

E uma vez **no celular**, que é outra coisa e mais curta: abrir a mesma nota e
conferir que fórmula, diagrama, gráfico, geometria e desenho aparecem legíveis
— e que não há caminho que ofereça editar.

## Fora de escopo

- **Modo Edgeless / canvas livre.** Guardaria posição por bloco e quebraria
  Markdown como fonte de verdade, a exportação e o plano de busca.
- **Página aninhada.** Já estava fora no spec anterior, pelo mesmo motivo.
- **Histórico de versões.** Reconhecido como a defesa que falta ao autosave;
  é schema novo e merece spec próprio.
- **Edição colaborativa.** O AFFiNE é CRDT por natureza; aqui não há segundo
  usuário.
