# Plano de retomada — blocos visuais

**Escrito em 15/08/2026**, junto do arquivamento, enquanto o contexto ainda
estava fresco. Ver `README.md` desta pasta para o histórico do caso.

## A hipótese que este plano descarta primeiro

Foi levantado que o problema seria **misturar Markdown com JSON**. Não é.

Os três blocos arquivados são cerca de código em Markdown puro — o conteúdo
dentro da cerca é texto, e nenhum JSON participa em momento algum. O único
JSON do sistema é `desenhos.cena`, do Excalidraw, e ele foi deliberadamente
mantido FORA do Markdown: a nota guarda só `![[desenho:uuid]]`, e a cena vive
em tabela separada. Essa separação funciona, e o desenho é justamente o bloco
visual que **não** foi arquivado.

Registrar isso importa porque a hipótese é plausível e voltaria a aparecer.

## O diagnóstico que sustenta o plano

O conflito não é de formatos. São **três donos do mesmo pedaço de DOM**:

| Dono | O que ele acredita controlar |
| --- | --- |
| ProseMirror | o DOM do documento, e reage a mutações nele |
| React | o DOM dos componentes montados na node view |
| mermaid / jsxgraph / function-plot | o DOM do desenho, que apagam e reescrevem |

Cada um fazendo a coisa certa isoladamente. Juntos, produzem o defeito que a
investigação achou: dois roots React no mesmo elemento, um limpando o commit
do outro.

**A matemática funciona porque tem um dono a menos.** O KaTeX recebe uma
string e devolve HTML; não há React entre ele e o ProseMirror. É a evidência
mais forte de que o problema é o intermediário, não a ideia.

## A mudança central: tirar o React das node views

```
hoje:    NodeView → createRoot → <Diagrama> → useEffect → mermaid.render
depois:  NodeView → mermaid.render(elemento)
```

As três engines já são imperativas: recebem um elemento e desenham nele. É
exatamente o contrato de um NodeView. React ali foi escolha de reaproveitar os
componentes da leitura, e cobrou mais do que rendeu.

**O que se perde:** a leitura (celular) e o editor passam a ter dois caminhos
de renderização. O que NÃO se perde é a regra de qual linguagem vira o quê —
ela continua num lugar só, num módulo que ambos consultam.

**O que se ganha, além de acabar a briga:** ciclo de vida explícito e legível
(`criar` / `atualizar` / `destruir`, sem microtask nem reconciliação), e uma
árvore React a menos por bloco.

## Fases

Cada uma verificável isoladamente. **A fase 0 não é opcional** — foi a falta
dela que fez três correções seguidas errarem o alvo.

### 0. Descobrir qual dos três trava

Antes de escrever qualquer linha. No editor, com o DevTools aberto:

1. `/titulo` — não cria node view nenhuma. Trava?
2. `/codigo` — cria node view, mas sem React e sem engine. Trava?
3. `/diagrama` — node view com React e engine. Trava?

| Resultado | Conclusão | Para onde ir |
| --- | --- | --- |
| só o 3 trava | é a engine ou o `montarReact` | fase 1 |
| 2 e 3 travam | é a node view em si | rever `criarViewCerca` antes da fase 1 |
| 1 trava | é a máquina do gatilho `/` | nenhuma correção tentada tocou na causa |

Grave um perfil no Performance do DevTools durante o travamento. Laço síncrono
aparece como pilha repetida; laço de microtask, como uma task gigante sem
paint. Isso nomeia o culpado sem adivinhação.

### 1. Um bloco só, sem React, ponta a ponta

Escolher **mermaid** — é o mais simples e foi o escolhido como piloto no spec
original pela mesma razão.

- node view em DOM puro: cria `<div>`, chama `mermaid.render`, escreve o SVG
- `destroy` que de fato desmonta a engine
- `update` que só redesenha quando o código muda
- `ignoreMutation` mantendo tudo fora do `contentDOM` como desenho

Só seguir para a fase 2 depois de: inserir, editar o código, desfazer com
`Ctrl+Z`, apagar o bloco, e navegar para outra nota e voltar — sem travar e
sem vazar.

### 2. Os outros dois

`function-plot` e `jsxgraph` pelo mesmo molde. Ambos já recebem um elemento;
a conversão é mecânica depois que a fase 1 fixou a forma.

Atenção ao `jsxgraph`: ele exige `freeBoard` no destroy, e o CSS dele não é
importável (o `exports` do pacote só expõe a raiz) — o arquivo
`componentes/geometria.css` desta pasta já resolve isso e volta junto.

### 3. Leitura

`Cerca.tsx` volta a desenhar os três. Aqui React continua fazendo sentido: a
leitura não tem ProseMirror, então não há disputa — é só um componente
montando um elemento.

### 4. Reativar o menu

Restaurar os itens `diagrama`, `grafico` e `geometria` em
`src/features/notas/blocos.ts`, devolvendo
`{ tipo: 'comando', comando: { tipo: 'cerca', linguagem } }`.

## O que já está pronto e volta sem trabalho

- `parsers/plot.ts` e `parsers/geometria.ts` — puros, **19 testes rodando**
  mesmo arquivados. O defeito nunca esteve aqui.
- A sintaxe dos blocos, que é decisão do sistema e não depende de biblioteca.
- O `.md`: uma cerca ```` ```mermaid ```` escrita à mão continua Markdown
  válido hoje, só aparece como código. **Retomar não exige migração de dado.**

## Como voltar as dependências

```bash
cd app
npm install mermaid function-plot jsxgraph mathjs
```

`mathjs` é do `plot` e da `geometria` — compila a expressão sem executá-la como
JavaScript, que é o que impede o conteúdo de uma nota de virar código com
acesso ao app. Não trocar por `eval` na pressa.

## O que NÃO mudar

**Markdown como fonte de verdade.** É o que faz a exportação `.zip` funcionar —
a única rede contra perda de dado que o sistema tem — e o que faz a busca por
conteúdo existir. Trocar por JSON resolveria um problema que não existe e
criaria dois que hoje estão resolvidos.

## O aprendizado que custou mais caro

Três commits de correção passaram no portão inteiro — typecheck, lint, 543
testes e build — e **os três continham o bug**. Nenhum deles executa
ProseMirror de verdade.

Ao retomar, considerar um punhado de testes que montem o editor em `jsdom` e
simulem `/diagrama`. Teria pego os três, e seria a diferença entre o CI
detectar e o usuário detectar.
