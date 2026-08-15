# Editor — usabilidade de escrita

**Data:** 2026-08-15
**Status:** aprovado, sem necessidade de revisão
**Contexto:** com os blocos visuais arquivados, o editor ficou estável. O que
falta agora não é capacidade nova de renderização — é o atrito de escrever.

## Escopo

Três frentes, pedidas em uso. **Emoji fica de fora** por decisão: o teclado do
sistema já insere emoji (`Win+.`), então o ganho seria conveniência, e o plugin
do Milkdown converte `:smile:` em imagem Twemoji, o que poria `<img>` no
Markdown exportado.

**Atalhos de teclado também ficam de fora, por já existirem.** Verificado no
preset: `strongKeymap`, `emphasisKeymap`, `headingKeymap`, `bulletListKeymap` e
outros oito já vêm ligados. `Ctrl+B` e `Ctrl+I` funcionam, e a barra de seleção
os anuncia nos tooltips.

## 1. Setas e travessões

`->` vira `→` enquanto se digita. Também `<-`, `<->`, `=>`, `--` e `...`.

**Por que primeiro:** é o máximo de efeito visível pelo mínimo de risco. Input
rule é o mecanismo mais barato do ProseMirror, e não encosta em nada do que
quebrou.

**Por que importa nesta base:** `->` aparece o tempo todo em nota de
Engenharia — derivação, fluxo, "isso implica aquilo".

**O cuidado que domina a implementação:** `->` também aparece dentro de
fórmula (`\lim_{x \to 0}`) e de código. O `prosemirror-inputrules` já pula
blocos com `code: true`, o que cobre a cerca — mas **não** cobre `math_inline`,
que não é code. Sem uma guarda explícita, escrever uma fórmula corromperia o
LaTeX.

Ordem importa: `<->` precisa ser testado antes de `<-`, senão o segundo casa
primeiro e o terceiro caractere fica órfão.

## 2. Imagens

Colar (`Ctrl+V`), arrastar, ou `/imagem`. Guardadas em `![alt](url)`, que é
Markdown padrão.

**Por que vale:** é a lacuna mais concreta para nota de estudo — foto do
quadro, print de slide, recorte de PDF. Hoje simplesmente não há como.

**Por que o risco é baixo, ao contrário dos blocos arquivados:** `<img>` não é
engine imperativa. Dá-se um `src` e o browser desenha. Sem React na node view,
sem ciclo de vida, sem disputa de DOM. É a diferença entre o que quebrou e o
que funciona.

### O bucket precisa ser público, e isso é decisão

O bucket que existe (`documentos-estudos`) é **privado**, servido por URL
assinada de 10 minutos. Para imagem embutida no Markdown isso não serve:

- o link morre em 10 minutos, e a nota passa a mostrar imagem quebrada
- o `.md` exportado sai com URL morta — a exportação é a única rede contra
  perda de dado que o sistema tem, e entregá-la furada anula o propósito

Então entra um bucket **público**, `imagens-notas`, com caminho por UUID. Quem
tiver a URL vê a imagem.

**Isso muda a postura de segurança?** Pouco, e vale dizer com todas as letras:
o sistema já roda sem autenticação, com RLS desabilitado em 47 tabelas e a
publishable key no bundle (resolução 10.0). Uma imagem em bucket público com
caminho UUID não é o elo fraco. Mas é uma porta a mais, e fica registrado.

## 3. Desenho — polimento

A feature funciona. O que falta é o entorno.

**Excluir.** Hoje não há como. E apagar tem uma sutileza: a referência
`![[desenho:uuid]]` vive no TEXTO, e a cena vive na tabela. Apagar só a linha
deixaria a nota mostrando "Desenho não encontrado" — pior que antes.

A ordem certa é a inversa da intuitiva: **apagar o nó do editor primeiro**
(o que remove a referência do Markdown) e a linha depois. Assim, se a segunda
falhar, sobra uma linha órfã invisível em vez de uma referência quebrada
visível.

**Tamanho do modal.** Hoje `max-w-5xl` com canvas de `60vh`. Desenhar num
retângulo de 1024px é o mesmo defeito do diálogo de 384px que este trabalho
inteiro veio corrigir — só que menos grave. Vai para quase tela cheia.

**Abrir clicando no desenho.** Hoje só o lápis no canto abre, e ele aparece só
no hover. Clicar na figura é o gesto natural, e é o que o Notion faz.

**O que NÃO muda:** a cena continua em JSONB separada do Markdown, e a nota
continua guardando só a referência. Essa separação é o motivo de o desenho ter
sobrevivido ao arquivamento dos outros três blocos.

## Ordem

1. Setas e travessões — isolado, sem dependência
2. Desenho — não precisa de migration, entrega valor imediato
3. Imagens — por último, porque depende de migration aplicada

## Testes

Na camada pura não há o que testar em nenhuma das três: são todas integração
com o editor ou com o Storage.

O que dá para cobrir, e cobre o risco real das setas:

- a substituição não dispara dentro de `math_inline`
- `<->` casa antes de `<-`

Manual, uma vez: digitar `->` numa frase e ver a seta; digitar `\lim_{x \to 0}`
dentro de uma fórmula e conferir que o `\to` sobrevive; colar um print; apagar
um desenho e conferir que a referência sumiu do texto.
