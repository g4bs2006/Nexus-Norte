# Blocos visuais — diagrama, gráfico e geometria

**Arquivado em 14/08/2026.** Travavam a página ao serem inseridos.

> **Para retomar, comece por [`PLANO-DE-RETOMADA.md`](./PLANO-DE-RETOMADA.md).**
> Ele traz o diagnóstico, a mudança central (tirar o React das node views) e as
> fases — incluindo a fase 0, que descobre qual dos três blocos trava. Foi a
> falta dessa fase que fez três correções seguidas errarem o alvo.

Entregues na fase 7 do spec `2026-08-14-notas-conhecimento-design.md`:

- ```` ```mermaid ```` — diagrama de fluxo e máquina de estados
- ```` ```plot ```` — gráfico de função, via `function-plot`
- ```` ```geometria ```` — geometria interativa com sliders, via `jsxgraph`

## O sintoma

Inserir `/diagrama` pelo menu congelava a aba inteira. Três correções foram
tentadas e nenhuma resolveu:

1. `20b8efe` — o menu passou a executar comandos do editor em vez de inserir
   texto. A cerca finalmente virava `code_block`, e **aí o travamento
   começou**: antes, a node view nunca chegava a rodar.
2. `2610cec` — `ignoreMutation` nas node views. Uma investigação posterior
   mostrou que o laço de mutação **já estava fechado**; foi correção de algo
   que não era a causa.
3. `31b48d3` — o bug real do `montarReact` (dois roots React no mesmo
   elemento) e mais três defeitos vizinhos. Não foi confirmado se resolveu.

## O que se sabe, e o que não se sabe

**O que funciona e é aproveitável integralmente:**

- `parsers/plot.ts` e `parsers/geometria.ts` — puros, sem DOM, **19 testes que
  continuam rodando no `npm test`**, mesmo arquivados. A sintaxe dos blocos é
  decisão do sistema e não depende de biblioteca nenhuma; o defeito nunca
  esteve aqui, e manter os testes vivos garante que ainda seja verdade quando a
  feature voltar.
- A renderização em si funcionou em algum momento: os três desenhavam.

**O que não se sabe:** qual dos três blocos trava, e se travam pelo mesmo
motivo. O diagnóstico nunca chegou a ser confirmado num browser, porque não
houve como discriminar.

**O teste que decide, e que deve ser o primeiro passo ao retomar:**

1. `/titulo` — não cria node view nenhuma. Trava?
2. `/codigo` — cria node view, mas sem React e sem engine. Trava?
3. `/diagrama` — cria node view com React e engine. Trava?

Se só o terceiro travar, o problema é a engine ou o `montarReact`. Se o segundo
travar, é a node view. Se o primeiro travar, é a máquina do gatilho `/`, e
nenhuma das correções tentadas tocou na causa.

## A suspeita estrutural

O mecanismo comum aos três é **montar uma árvore React com `createRoot` dentro
de uma node view do ProseMirror**. Isso foi escolhido para reaproveitar os
mesmos componentes da leitura — o ganho era não ter duas listas de "mermaid
vira Diagrama" para divergir.

O custo, que só apareceu em uso: uma árvore React por bloco, fora do ciclo do
app, sem providers, com ciclo de vida manual, e duas bibliotecas escrevendo no
mesmo DOM.

**Ao retomar, considere renderizar sem React nas node views.** As três engines
já são imperativas — recebem um elemento e desenham nele. React ali é uma
camada que não paga o que custa.

## Como trazer de volta

```bash
cd app
npm install mermaid function-plot jsxgraph mathjs
```

Depois:

1. Mover `componentes/` de volta para `src/components/blocos/`.
2. Mover `parsers/` de volta para `src/features/notas/`.
3. Em `src/features/notas/componentes/renderizadores.tsx`, restaurar os ramos
   `mermaid`, `plot` e `geometria` em `renderizarBloco`.
4. Em `src/features/notas/blocos.ts`, restaurar os itens `diagrama`, `grafico`
   e `geometria` do catálogo do `/`.
5. Em `src/features/notas/componentes/Cerca.tsx`, nada muda — ela já consulta
   `renderizarBloco` e cai no `<pre>` quando ele devolve `null`.

O `git log` destes arquivos preserva o histórico completo, incluindo as três
tentativas de correção e o que cada uma descobriu.

## O que continua funcionando sem eles

A cerca ```` ```mermaid ```` escrita à mão continua sendo Markdown válido: ela
só aparece como bloco de código em vez de diagrama. **Nenhuma nota existente
quebra**, e o `.md` exportado é idêntico ao que seria com o bloco ativo — o que
significa que retomar não exige migração de dado nenhuma.
