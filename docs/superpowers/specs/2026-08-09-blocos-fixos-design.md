# Blocos fixos — design

**Data:** 2026-08-09
**Status:** aprovado para planejamento
**Contexto:** primeiro de três specs decididos na mesma conversa. Os outros dois estão em "Fora
de escopo" — este não depende de nenhum deles e não precisa de migration.

## Problema

O "Trabalho" não é um pilar. É uma linha de `fluxograma_semanal` com `materia_id` e `treino_id`
nulos e só um `rotulo` de texto livre (`features/fluxograma/api.ts:14-38`, resolução 10.48.0). O
Calendário tem camada e tipo `'trabalho'` com cor própria, mas o bloco não tem dono:
`resolverDonoFluxograma` devolve `rota: undefined` com o comentário "Trabalho não tem sub-página"
(`features/calendario/eventos.ts:331`).

Isso é uma decisão de modelagem deliberada e continua valendo. O que está quebrado é o acesso:

1. **Ponto de entrada único e enterrado.** O card "Trabalho e outros blocos" fica no rodapé de
   `/calendario` (`pages/calendario/CalendarioPage.tsx:525-537`), depois da agenda, da faixa de
   carga, do card de prazos e da lista de exceções pendentes. Não existe na sidebar, na barra
   inferior do mobile nem na paleta de comandos.

2. **A edição existe mas está desligada.** `DialogFluxogramaLivre` está inteiro para editar: prop
   `bloco?` (linha 47), `modoEdicao` (69), o `useEffect` que preenche o formulário (84-96), o
   branch de `atualizar.mutateAsync` (101-102), o título "Editar bloco" (127) e o trigger de lápis
   com alvo de 32px (113-116). O hook `useAtualizarFluxogramaLivre` existe
   (`features/fluxograma/hooks.ts:98`) e a função de API também (`api.ts:47`). **Nada no app passa
   `bloco`.** `CalendarioPage:529` renderiza `<DialogFluxogramaLivre />` sem props e
   `GradeFluxograma` só oferece lixeira. É código morto por falta de fiação — mudar um bloco de
   08:00 para 09:00 hoje exige apagar e recriar.

3. **O mobile da grade é hostil.** `GradeFluxograma` é `grid sm:grid-cols-2 lg:grid-cols-4`: no
   celular vira uma coluna com os sete dias empilhados, cada um com cabeçalho, e os vazios ainda
   renderizam um "—" (linhas 57-58). Três blocos ocupam uma tela inteira de rolagem.

Decisão de escopo tomada na conversa: **não promover Trabalho a pilar.** Existe outro sistema
responsável por essa parte. Aqui ele continua sendo bloco de rótulo livre — só passa a ser
editável e fácil de achar.

Três itens vizinhos entraram no mesmo escopo por serem do mesmo território: início da semana no
domingo, remoção do Sono das vistas de Mês e Horas, e uma correção na Home descoberta durante a
investigação.

## Restrição transversal: mobile

Toda alteração é desenhada separadamente para o celular, não adaptada depois. Isso muda decisões
concretas em pelo menos três pontos deste spec (layout da lista, dropdown de navegação, alvos de
toque) e está marcado em cada um.

## 1. Página `/calendario/blocos`

Arquivo novo `pages/calendario/BlocosPage.tsx`, carregado com `lazy` como as demais rotas
(`App.tsx:7-12`), irmã de `/calendario/semana` e `/calendario/historico`. Rota registrada em
`App.tsx` junto das outras duas.

Entra em `SUBPAGINAS` (`lib/pilares.ts:108`):

```ts
{
  id: 'blocos-fixos',
  nome: 'Blocos fixos',
  termos: 'trabalho blocos fixos expediente rotina horário semanal',
  rota: '/calendario/blocos',
  icone: Briefcase,
  classeTexto: 'text-trabalho',
}
```

`SUBPAGINAS` existe exatamente para este caso — o comentário em `pilares.ts:91-97` descreve o
mesmo problema acontecendo antes com a lista de lançamentos. A paleta de comandos é hoje o único
caminho que funciona igual no desktop e no celular.

O card de `CalendarioPage:525-537` sai. Saem junto tudo que fica órfão: os imports de
`GradeFluxograma` (linha 50) e `DialogFluxogramaLivre` (51), e os dois hooks (53-55) —
`blocosLivres` só é usado na linha 532 e `excluirBlocoLivre` na 534, ambos dentro do card
removido.

**Não** haverá dois lugares editando os mesmos blocos. A página nova é o único ponto de
manutenção — duplicar seria repetir o defeito do toggle corrigido em `63f3544`.

## 2. Navegação (decisão de mobile)

O cabeçalho do Calendário já tem quatro ações e o comentário em `CalendarioPage:267-270` registra
que os rótulos foram escondidos no mobile porque quatro blocos com texto estouravam a largura da
tela. Um quinto botão reintroduz o problema que aquele comentário resolveu.

Solução: no mobile, os três links de navegação (Ritual de domingo, Histórico, Blocos fixos) viram
**um único `DropdownMenu` "Ir para"**. A partir de `sm:` continuam três botões separados, como
hoje. O cabeçalho fica com menos itens no celular do que tem hoje, não mais.

## 3. `ListaBlocosFixos` — componente novo

Arquivo novo em `features/fluxograma/componentes/ListaBlocosFixos.tsx`.

**Decisão: não estender `GradeFluxograma`.** Ele é compartilhado por Estudos e Treino
(`pages/treino/TreinoPage.tsx:8`), e o que esta página precisa no mobile é o oposto do que ele
faz. O custo é ~15 linhas de agrupamento por dia duplicadas; o ganho é risco zero nas outras duas
páginas e liberdade para desenhar o mobile. `GradeFluxograma` fica intocado.

**Mobile (`< sm`):** lista agrupada por dia, **omitindo os dias sem bloco**. Cada bloco em uma
linha: rótulo, `09:00–18:00` e duração. Editar e excluir com alvo de 44px, **visíveis sempre** —
a mesma lição registrada em `GradeFluxograma:83-94`, onde um alvo de 20px dependente de hover era
invisível e clicável ao mesmo tempo no toque.

**`sm:` para cima:** a grade de sete colunas, com lápis e lixeira aparecendo no hover.

**Ordem dos dias:** segunda a domingo (`[1,2,3,4,5,6,0]`), como já é a convenção do fluxograma em
`GradeFluxograma:19` e `DialogFluxogramaLivre:43`. A mudança para domingo da seção 5 é do
Calendário e **não** se aplica aqui — o fluxograma é configuração de rotina, não visualização de
calendário.

**Sem nenhum bloco:** `EstadoVazio` com o botão de criar como ação, padrão de
`ProjetosPage:93-101`.

**Exclusão:** continua via `DialogConfirmarExclusao`, com a mensagem atual de
`GradeFluxograma:96-97`.

**Edição:** o lápis passa `bloco` para o `DialogFluxogramaLivre` que já existe. Nenhum código novo
de formulário, mutation ou validação.

## 4. Semana começando no domingo

- `features/calendario/componentes/GradeMes.tsx:151` — `firstDay={1}` → `firstDay={0}`. Cobre as
  duas vistas de uma vez: "Mês" monta este componente como `dayGridMonth` e "Horas" como
  `timeGridWeek` (`CalendarioPage.tsx:71-76`).
- `CalendarioPage.tsx:95` e `:244` — passam a usar um helper local com `weekStartsOn: 0`, para a
  vista de agenda acompanhar. Sem as três vistas alinhadas, trocar de aba mudaria o contorno da
  semana na mesma página.

**`lib/datas.ts:46` (`inicioSemana`) não muda.** O aviso em `lib/locale.ts:9-10` é real, mas se
aplica a outro mecanismo: `semana_inicio` vem de `inicioSemana()`, que passa `weekStartsOn: 1`
explicitamente, enquanto `firstDay` do FullCalendar é só desenho de grade. Seguem ancorados na
segunda, de propósito: `planejamento_semanal_financeiro`, metas semanais
(`features/metas/calculos.ts:32-33`), frequência de treino (`TreinoPage.tsx:59`), Home
(`HomePage.tsx:100`) e o Ritual de domingo — que planeja a semana *seguinte*, então a segunda ali
é a semântica correta.

O intervalo carregado nas vistas de Mês e Horas se ajusta sozinho: vem do `datesSet` do próprio
FullCalendar (`GradeMes.tsx:99-105`).

## 5. Sono fora das vistas de Mês e Horas

`GradeMes` filtra `evento.camada !== 'sono'` antes de montar `eventosFullCalendar`. O branch
`display: evento.camada === 'sono' ? 'background' : 'auto'` (linha 94) fica morto e sai junto.

**Consequência tratada:** o item "Sono" no menu Camadas (`CalendarioPage:297-310`) viraria um
checkbox sem efeito nessas duas vistas — de novo o defeito do `63f3544`. Ele **some do menu
quando `vista !== 'agenda'`**. O contador de camadas escondidas (`escondidas`, linha 256) precisa
acompanhar, para não relatar `−1` por uma camada que nem está listada.

**O tempo livre nas células do mês não muda.** Ele vem de `planejamentoSono`, não dos eventos
(`features/calendario/carga.ts:97` e `107-111`) — filtrar o desenho não mexe no cálculo.

## 6. Correção: desfazer cancelamento de bloco de trabalho na Home

`canceladasDeHoje` (`pages/HomePage.tsx:356-394`) monta a lista de regras só a partir de
`fluxogramaEstudos` e `fluxogramaTreino` (linhas 357-370). Blocos livres não entram. O comentário
em 350-355 diz que essa derivação existe justamente para haver "caminho de volta depois de
cancelar por engano" — e para trabalho esse caminho não existe: cancelar o expediente de hoje por
engano o faz sumir sem rastro para desfazer.

É um bug anterior a este spec, incluído por estar no mesmo território.

Correção: um terceiro item no array `regras`, vindo de `useFluxogramaLivre()`, com
`rotulo: regra.rotulo`, mais a dependência correspondente no `useMemo` (linhas 387-394).

## Testes

O grosso do escopo é fiação e layout, sem lógica pura nova. Os testes existentes (`eventos.test.ts`,
`carga.test.ts`, `planejador.test.ts`) continuam valendo e nenhum deve quebrar — a mudança de
`firstDay` não os toca, porque nenhum deles depende do início da semana do FullCalendar.

A exceção é a seção 6: a regra vive inline num `useMemo` de 40 linhas e por isso nunca foi
testada. Extrair para uma função pura em `features/calendario/` com teste próprio, cobrindo pelo
menos: bloco livre cancelado hoje aparece; cancelado em outra data não aparece; remarcado (não
cancelado) não aparece.

## Fora de escopo

- **Cor para matérias.** `materias` não tem coluna de cor (`types/database.ts:771-783`); quem tem
  é `categorias` (linha 83). Precisa de `alter table` + regeneração de tipos. A metade visual já
  está pronta: `ItemFluxograma` aceita `cor` opcional e `GradeFluxograma:72-74` já aplica como
  estilo inline.
- **Vigência da recorrência semanal.** `fluxograma_semanal` não tem `data_inicio`, `data_fim` nem
  `created_at` (`types/database.ts:591-618`), e `expandirRecorrencia` (`lib/recorrencia.ts:134-143`)
  emite ocorrência sempre que o dia da semana bate. Toda regra é eterna nos dois sentidos: uma
  criada hoje aparece retroativamente em todas as semanas passadas, poluindo o Histórico. Afeta
  matéria e treino igualmente, não só Trabalho. A solução já existe no mesmo arquivo:
  `expandirRecorrenciaMensal` (linhas 196-254) filtra por `data_inicio`/`data_fim`, incluindo o
  caso de borda de regra que começa no meio do período. **Próximo spec**; a migration pode viajar
  junto com a da cor.
- **Domingo como primeiro dia no resto do sistema.** Decidido na mesma conversa, fica para o
  spec 2 porque não dá para separar. Duas metades: (a) ordem de exibição — `ORDEM_DIAS =
  [1,2,3,4,5,6,0]` estava copiado em sete arquivos. **Três já foram consolidados** por esta
  branch, que criou `lib/fluxograma.ts` exportando `ORDEM_DIAS_SEMANA` (mais `horaCurta`,
  `minutosDe` e `agruparPorDiaSemana`), hoje consumido por `GradeFluxograma`,
  `DialogFluxogramaLivre` e `ListaBlocosFixos`. Sobram quatro cópias locais:
  `RitualSemanalPage:40`, `DialogSono:34`, `DialogFluxogramaTreino:26`,
  `estudos/DialogFluxograma:41` e `GradePlanejamentoSemanal:23`. O spec 2 deve consolidá-las
  **em `lib/fluxograma.ts`**, e não em `lib/constants.ts` como esta nota dizia antes — a
  constante é específica da grade do fluxograma e já tem casa com suas companheiras; movê-la
  de novo seria churn em cinco arquivos sem ganho; (b) fronteira da semana — `lib/datas.ts:47`,
  `financeiro/periodos.ts:51` e `lib/locale.ts:14`. As duas metades são inseparáveis porque
  `GradePlanejamentoSemanal:125-135` deriva a data do cabeçalho de `inicio + indice`: trocar a
  ordem sem trocar o `inicio` rotula as colunas com as datas erradas. A metade (b) exige migration
  (`update planejamento_semanal_financeiro set semana_inicio = semana_inicio - interval '1 day'`),
  senão o planejamento existente, chaveado em segundas, some da tela. Ressalva conhecida: o shift
  é exato de segunda a sábado e desloca as entradas de `dia_semana = 0` em uma semana — aceito.
  **Decisão adicional:** o Ritual passa a planejar a **semana atual**, não a seguinte —
  `RitualSemanalPage:62-65` vira `inicioSemana(hoje)` sem o `addDays(…, 7)`. Consequência nova:
  aberto no meio da semana, os dias já vividos aparecem marcados como passados mas **continuam
  editáveis** — o plano de um dia pode mudar depois do fato, e travar o campo impediria a
  correção. Vale nos passos de Financeiro, Rotina e Estudo/Treino.
- **Recorrência para eventos avulsos.** `eventos_calendario` (`types/database.ts:330-359`) guarda
  data única, sem repetição. Precisa de desenho próprio — decidir entre RRULE de verdade ou tratar
  "avulso que repete" como regra de fluxograma com rótulo. Depois dos dois anteriores.
- **Promover Trabalho a pilar** (tabela própria, página, horas trabalhadas, vínculo com
  Financeiro). Descartado: outro sistema já cobre essa necessidade.
