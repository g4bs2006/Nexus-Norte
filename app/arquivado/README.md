# Features arquivadas

Código que **não está no build**. Esta pasta fica fora de `src/`, e
`tsconfig.app.json` inclui só `src` — então nada aqui é compilado pelo
`typecheck`, importado pelo app, nem empacotado no bundle.

**Os testes daqui continuam rodando**, e isso é de propósito. O Vitest varre a
pasta inteira do app, e deixar assim não custa nada: os parsers arquivados são
puros, os testes levam milissegundos, e eles provam que a parte aproveitável
continua correta no dia em que a feature voltar. O que sai do ar é a
integração com o editor, não a lógica.

Não é lixo. É código que funcionou parcialmente, custou caro, e sai de cena
porque estava quebrando o que funciona. Cada subpasta traz o próprio relato: o
que funcionava, o que não funcionava, e o que fazer para trazer de volta.

## Por que arquivar em vez de apagar

Apagar perderia o desenho junto com o defeito. Os parsers de `plot` e
`geometria`, por exemplo, são puros, testados e corretos — o problema nunca
esteve neles. Reescrevê-los do zero no futuro seria trabalho repetido.

E arquivar é honesto de um jeito que comentar código não é: aqui está claro que
não roda, em vez de dar a impressão de que existe.

## O que está aqui

| Pasta | O quê | Por quê saiu |
| --- | --- | --- |
| `blocos-visuais/` | mermaid, gráfico de função, geometria interativa | Travavam a página |

Cada gaveta com plano de retomada traz um `PLANO-DE-RETOMADA.md`. Ele é o que
transforma "código guardado" em "trabalho que pode recomeçar" — sem ele, quem
voltar refaz o diagnóstico do zero.
