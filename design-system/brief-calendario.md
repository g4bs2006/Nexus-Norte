# Brief — Calendário do Nexus

Contexto para o Claude Design. O Nexus é um sistema de gestão pessoal de um
usuário só: um estudante que treina, tem contas para pagar e roda projetos
paralelos. Quatro pilares (Financeiro, Estudos, Treino, Projetos) mais Sono.

## A tarefa

Reestruturar a página do Calendário. Não é um app de agendamento.

## O que o calendário agrega

Cinco fontes, cada uma dona do seu dado. Nada é duplicado — a página só traduz.

| Fonte | Tipo | Natureza |
| --- | --- | --- |
| `avaliacoes` (com data) | `prova` | Prazo — data marcada, acontece uma vez |
| `lancamentos` de despesa fixa | `conta` | Prazo |
| `marcos_projeto` | `marco` | Prazo |
| `fluxograma_semanal` (materia_id) | `aula` | Rotina — repete toda semana |
| `fluxograma_semanal` (treino_id) | `treino` | Rotina |
| `planejamento_sono` | `sono` | Contexto — faixa de fundo, não compromisso |

**A distinção que importa já existe no dado:** `prova`, `conta` e `marco` são
prazos; `aula` e `treino` são rotina que o usuário mesmo definiu e já conhece;
`sono` é contexto. Hoje a interface trata os três iguais.

Volume típico de uma semana: ~20 ocorrências de rotina, 1 a 2 prazos.

## A pergunta que a página deve responder

Em ordem de importância:

1. O que vence primeiro, e falta quanto?
2. Onde a semana aperta — que dia acumula rotina e prazo junto?
3. Como é a forma do mês (secundário: só ao planejar)

## Estado atual

FullCalendar `dayGridMonth` ocupando a largura, chips de filtro de camada acima,
e um painel "Prazos" numa coluna de 18rem à direita que empilha por último no
celular. Cada evento é um bloco sólido na cor do pilar.

## Restrições reais

- **Paleta fixa**, compartilhada com as outras 9 páginas. Não inventar cores.
  Claro: financeiro `#4f9d69`, estudos `#4a87c4`, treino `#d0764b`, projetos
  `#8b6bb5`, sono `#b8941f`. Status: ok `#2f8b6d`, atenção `#b8941f`, risco
  `#c4554d`. Fundo `#ffffff`, borda `#e9e9e7`, texto secundário `#787774`.
  Tema escuro tem os equivalentes claros.
- **Tipografia fixa:** Inter (texto) + JetBrains Mono com figuras tabulares
  (números). Não adicionar face nova — quebraria a consistência do app.
- **Regras de movimento já valendo:** movimento que não comunica estado não
  entra. Sem transição de rota, sem parallax, sem hover elaborado em card.
  `prefers-reduced-motion` neutraliza tudo.
- **Cor semântica é reservada** ao que pede atenção. Valor positivo usa a cor de
  texto — verde em tudo que está bem esvazia o significado do verde.
- **Nenhuma informação só por cor:** sempre cor mais forma ou texto.
- **Mobile é uso real**, não adaptação. Largura útil de 296px dentro de um card.
- FullCalendar custa 67 kB gzip — é o maior pedaço do bundle.

## O que já foi decidido nesta rodada

- **Cor marca a camada; peso marca a natureza.** Rotina: filete na cor do pilar,
  sem preenchimento. Prazo: preenchimento sólido. Sono: faixa de tinta ao fundo.
  Regra derivada de `ehImportante()`, que já existe no código.
- Os chips de filtro saem do topo e viram controle secundário.
