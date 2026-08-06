# Nexus

Sistema de gestão pessoal com 4 pilares (Financeiro, Estudos, Treino, Projetos),
um hub central (Home) e uma camada transversal de Calendário.

O plano de execução completo está em [`plano.md`](./plano.md). A seção 10 do
plano registra as resoluções de lacunas decididas antes da implementação — ela
**sobrescreve** as seções anteriores onde houver conflito.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Build | Vite 8 + React 19 + TypeScript (estrito) |
| Estilo | Tailwind CSS v4 + shadcn/ui |
| Estado servidor | TanStack React Query |
| Estado UI | Zustand (tema, sidebar) |
| Gráficos | Recharts |
| Calendário | FullCalendar |
| Formulários | React Hook Form + Zod |
| Backend | Supabase (Postgres + Storage + Triggers) |
| Deploy | Vercel |

## Progresso das fases

| Fase | Escopo | Status |
| --- | --- | --- |
| 0 | Fundação — setup, design system, schema base, shell de layout | ✅ Concluída |
| 1 | Financeiro | ✅ Concluída |
| 2 | Estudos | ✅ Concluída |
| 3 | Treino | ✅ Concluída |
| 4 | Projetos | ✅ Concluída |
| 5 | Calendário unificado | ✅ Concluída |
| 6 | Home | ✅ Concluída |
| 7 | Polimento | ✅ Concluída |

### Fase 0 — Fundação

- Projeto Vite + React + TypeScript com `strict` e `noUncheckedIndexedAccess`
- Tailwind v4 com paleta Notion e cores por pilar (plano 1.2)
- shadcn/ui com 16 componentes base
- React Router com as 10 rotas do plano (1.1)
- React Query com cache configurado para evitar refetch entre pilares (7.2)
- Zustand para tema (claro/escuro/sistema) e estado da sidebar
- Client Supabase tipado a partir do schema
- Shell de layout: sidebar colapsável com destaque do item ativo
- Schema base transversal: `checks_diarios`, `planejamento_sono`, `registro_sono`

### Fase 1 — Financeiro

- Schema: `categorias`, `lancamentos`, `investimentos`,
  `planejamento_semanal_financeiro`
- Views de agregação: `resumo_mensal_categoria`, `receita_mensal`
- Trigger de campo-resumo `categorias.total_gasto_mes` (mês corrente)
- Função `candidatos_corte()`, calculada na leitura
- Cálculos como funções puras com **26 testes** (`calculos.test.ts`)
- Card receita vs. despesa com projeção de saldo no fim do mês
- Card "disponível hoje": geral e planejado lado a lado, com 🟢/🔴 do dia
- Grade de planejamento semanal dia × categoria (ritual de domingo)
- Grid de cards de categoria com anel de progresso
- Gráfico de tendência de 6 meses (Recharts) com seletor de categoria
- Seção de atenção com candidatos a corte
- Seção de investimentos: aporte e rendimento do mês
- Checks diário e semanal
- Formulários de categoria, lançamento e investimento (RHF + Zod)
- Sub-página da categoria com histórico e progresso da meta

**Decisão desta fase:** o plano pedia card "Receita vs. Despesa" e
`meta_tipo = 'percentual_renda'`, mas não modelava receita. Resolvido com a
coluna `natureza` em `categorias` — ver resolução 10.12 no plano.

### Fase 2 — Estudos

- Schema: `materias`, `documentos`, `faltas`, `avaliacoes`,
  `config_calculo_media`, `registro_listas`, `sessoes_estudo`
- `fluxograma_semanal` + `excecoes_fluxograma` com FK real (resoluções 10.5/10.6)
- `conclusoes_fluxograma` para persistir o check derivado (resolução 10.15)
- Trigger de campo-resumo `materias.media_atual`, nos dois modos de cálculo
- Cálculos como funções puras: média, média projetada, risco de reprovação,
  frequência de estudo, próxima avaliação, percentual de acerto
- Expansão de recorrência no cliente (`lib/recorrencia.ts`), com testes
- Grid de cards de matéria com semáforo e contagem regressiva
- Sub-página com 5 abas: Avaliações, Faltas, Sessões, Documentos, Listas
- Upload de documentos no bucket privado, acesso por URL assinada
- Grade de fluxograma semanal (componente compartilhado com Treino)
- Checks diários derivados do fluxograma

**Decisões desta fase:** `avaliacoes` ganhou coluna `data` (resolução 10.14) e
foi criada `conclusoes_fluxograma` (resolução 10.15) — o plano pedia o toggle de
concluído sem definir onde guardá-lo.

### Fase 3 — Treino

- Schema: `treinos`, `exercicios_treino` com `grupo_muscular` (resolução 10.1),
  `execucoes_treino`, `execucoes_exercicio`, `personal_records`,
  `registro_corporal`, `registro_lesoes`
- `fluxograma_semanal` estendida com `treino_id` e check constraint final
  (resolução 10.6) — completa a substituição da referência polimórfica
- Trigger que grava PR automaticamente por Epley a cada execução
- Cálculos como funções puras: 1RM, frequência, progressão, sinal de
  estagnação, volume por grupo muscular
- Card "treino de hoje" derivado do fluxograma, com registro de execução
  pré-preenchido pelos alvos
- Indicador de frequência semanal e volume por grupo
- Seção de PRs recentes
- Sub-página do exercício com gráfico de progressão e alerta de estagnação
- Peso corporal com gráfico discreto e upload de foto de progresso
- Registro de lesões

**Decisão desta fase:** `treinos.dias_semana` foi descartada — era uma segunda
fonte de verdade competindo com o fluxograma (resolução 10.17). Cada linha de
`execucoes_exercicio` passa a representar uma série.

### Fase 4 — Projetos

- Schema: `projetos`, `marcos_projeto`, `log_progresso`
- Sem campo-resumo por trigger: as duas métricas são calculadas na leitura
  (resolução 10.9)
- Cálculos como funções puras: percentual concluído, dias desde a última
  atualização, momentum baixo
- Grid de cards com esfriamento visual por momentum baixo
- Abas Ativos / Pausados / Concluídos com contagem
- Página do projeto: status editável, checklist de marcos com status, e timeline
  do log de progresso

**Detalhe de modelagem:** `percentualConcluido` devolve `null` (não `0`) para
projeto sem marcos — 0% sugeriria projeto parado, quando na verdade ele ainda
não foi decomposto. Projeto sem nenhum log conta como momentum baixo.

### Fase 5 — Calendário unificado

- **Nenhuma tabela nova:** agrega as fontes existentes (plano 6.1)
- Construtor de eventos como função pura, com 20 testes
  (`features/calendario/eventos.ts`)
- Camadas: provas, aulas e treinos recorrentes, contas fixas, marcos e sono
- Recorrência expandida no cliente, apenas para o intervalo visível
  (resolução 10.5) — o `datesSet` do FullCalendar delimita a expansão
- Contas usam `data_vencimento` com fallback para `data` (resolução 10.2)
- Blocos de sono cruzando a meia-noite terminam no dia seguinte, com a mesma
  lógica da coluna gerada `registro_sono.horas_calculadas`
- Sono renderizado como evento de fundo: contexto, não compromisso
- Visões mensal e semanal, filtro de camadas por pilar
- FullCalendar re-tematizado para a paleta Notion, nos dois temas

### Fase 6 — Home

- Bloco unificado de checks do dia: financeiro, aulas e treinos em uma lista só
- Mini-card Financeiro: saldo do mês, entrada/saída e projeção, lendo o
  campo-resumo sem reagregar (plano 7.2)
- Mini-card Estudos: matérias em risco e próxima avaliação entre todas
- Mini-card Treino: frequência da semana e PR mais recente
- Mini-card Projetos: projetos sem movimento e o mais ativo
- Indicador de sono: horas de ontem versus a meta do dia
- Próximos eventos do calendário, reaproveitando o construtor da Fase 5
- Módulo de sono (`features/sono`), que faltava desde a Fase 0

**Correção encontrada nesta fase:** os `format()` do date-fns usavam a locale
padrão (inglês). `lib/locale.ts` passa a definir pt-BR e segunda como início da
semana globalmente.

### Fase 7 — Polimento

- **Code-splitting por rota** (`React.lazy`): bundle inicial caiu de 443 kB para
  ~137 kB gzip. Recharts e FullCalendar só carregam nas pages que os usam
- **Responsividade:** sidebar escondida no mobile e substituída por navegação
  inferior, ao alcance do polegar; barra superior com o toggle de tema
- **Índices de cobertura** para 3 foreign keys apontadas pelo linter do Supabase
- **UI de sono**, que faltava: o schema existe desde a Fase 0 e é lido pela Home
  e pelo Calendário, mas nenhuma page do plano previa a entrada desses dados
- Dark mode já estava completo desde a Fase 0 (paleta e toggle)
- RLS **não** foi habilitado — ver seção de Segurança e resolução 10.8

## Refinamento visual

Depois das 8 fases do plano, um brief de design separou o que manter do que
ajustar. A conclusão: a identidade visual estava certa — o que faltava era
**resposta**. Executado em cinco blocos:

| Bloco | Entrega |
| --- | --- |
| A · Percepção | Skeletons por rota, entrada escalonada, anéis e barras animando de 0, escala de métrica em mono |
| B · Identidade | Acento por pilar no cabeçalho, verde semântico separado do verde do Financeiro, favicon na paleta |
| C · Assinatura | Bloco "O dia" no topo da Home, com o check redesenhado como objeto físico |
| D · Fricção | Lançamento em uma linha, paleta de comando, faixa de status compacta |
| E · Acabamento | Gráficos com área e ênfase no ponto final, estados vazios com ação, barra mobile |

Regras de movimento que ficaram valendo:

- Movimento que não comunica estado não entra. Sem transição de rota, sem
  parallax, sem hover elaborado em card, sem confete.
- `prefers-reduced-motion` neutraliza tudo, inclusive as transições de anel e
  barra conduzidas por CSS.
- Cor semântica é reservada ao que pede atenção. Valor positivo usa a cor de
  texto — verde em tudo que está bem esvazia o significado do verde.
- Nenhuma informação transmitida só por cor: sempre cor mais forma ou texto.

## Biblioteca de exercícios e tipos de treino

Exercício e tipo de treino eram texto livre em cada linha, o que produzia
duplicatas silenciosas: 27 registros de exercício para 21 movimentos reais,
"Supino Inclinado" do Push sem relação nenhuma com o do Upper, e erros de
digitação virando entidades próprias.

Agora há duas tabelas de referência — `biblioteca_exercicios` e `tipos_treino` —
com índice único **insensível a caixa e espaço** (`lower(trim(nome))`), que é o
que impede a duplicata voltar. O treino aponta para o tipo; o exercício do treino
aponta para o movimento base e guarda só o que varia entre treinos: séries, reps
alvo, carga alvo e descanso.

O ganho concreto está no recorde. `personal_records` passou a referenciar o
exercício **base**, e o gatilho compara o 1RM contra o histórico de todos os
treinos. Antes ele comparava só dentro do mesmo treino, então bater 120 kg no
Push depois de 130 kg no Upper registrava um recorde que não era recorde.

Por consequência, `/treino/:id` recebe o id do movimento base e mostra a
progressão somando todos os treinos que o usam, e buscar "Supino" na paleta de
comando devolve um resultado, não um por treino. Detalhes em
[`plano.md`, resolução 10.18](./plano.md).

## Exceções do fluxograma

O fluxograma guarda padrão, não datas: uma linha diz "treino B, terça, 18h" e
vale para toda terça. Faltava o meio entre "segue o padrão" e "não existe mais" —
quando a semana fugia do plano, só dava para deixar o check em aberto (e a
frequência acusar falha) ou apagar a linha (e perder o padrão de todas as semanas
seguintes por causa de uma terça).

Cada ocorrência tem agora um menu com três ações:

| Ação | O que faz |
| --- | --- |
| Não vai acontecer | Cancela só aquela data. Sai dos checks e do denominador da frequência |
| Remarcar… | Move a ocorrência para outra data, com horário próprio se você mudar o campo |
| Voltar ao padrão | Desfaz a exceção |

O que foi cancelado continua listado, riscado, com um botão de restaurar — sumir
sem deixar rastro tirava o caminho de volta depois de um cancelamento por engano.

A remarcação **move** a ocorrência: ela desaparece do dia de origem e aparece no
destino, inclusive quando o destino cai num dia da semana que a regra não cobre —
"treinei quinta em vez de terça" é o caso que motivou a feature. Se você não
mexer nos horários, eles ficam nulos e a ocorrência herda o do padrão, então
mudar o padrão depois continua valendo para ela.

Detalhes e o que mudou na expansão da recorrência em
[`plano.md`, resolução 10.19](./plano.md).

## Registro de treino

Cada série é salva no banco quando você confirma, não no fim da sessão. Antes tudo
ficava na memória da tela até um botão final — anotar duas séries e sair do app,
que é o que acontece com o celular na mão na academia, perdia tudo.

A sessão nasce na primeira série gravada. Você pode fechar o app no meio do treino
e voltar: a Home mostra **"Treino B em andamento · 4 séries salvas · Continuar"**, e
o diálogo reabre com o que já estava lá. Só existe uma sessão aberta por vez — o
banco garante isso com um índice único.

Enquanto não estiver finalizada, a sessão **não conta** na frequência da semana.
Treino abandonado no meio não é treino feito.

O recorde é gravado no instante em que a série é salva.

A **duração** é um campo seu, não um cálculo. Já foi derivada dos timestamps do
sistema, e errava: aqueles medem quanto tempo você passou *registrando*, não
treinando — um treino lançado depois do fato marcava 0 min. Quando não informada, a
tela mostra "—" e, ao lado, o tempo de registro rotulado como tal.

Cada sessão do histórico abre no **mesmo diálogo** da execução, em modo de edição:
data, horário, duração e as séries, com corrigir carga, apagar série e marcar
pulado. Um editor só, para os dois não divergirem.

Dá para **pular** um exercício — máquina ocupada, ombro doendo, tempo curto. O pulo
fica registrado: as linhas somem do formulário, o exercício sai do contador de
progresso e aparece no histórico como "pulado". Só vale para exercício sem nenhuma
série salva; fez 2 de 4 não é pulado, é "fez 2 de 4", e o dado já diz isso.

Mudou de ideia no meio? **Descartar** remove a sessão inteira, no diálogo ou no
aviso da Home.

O card "Treinos realizados" lista as sessões da semana e abre cada uma para ver
exercício por exercício, com carga, reps, RPE e 1RM de cada série, além de volume
total e quais recordes caíram ali. Também dá para apagar uma sessão registrada
errado — **a exclusão é definitiva e leva as séries junto.**

Detalhes em [`plano.md`, resolução 10.21](./plano.md).

## Lançamentos

O total do mês e o anel por categoria existiam, mas ver os lançamentos exigia entrar
numa categoria por vez. `/financeiro/lancamentos` responde o que faltava: o que
gastei esta semana, quanto gastei com uma categoria num período, e onde está aquele
lançamento.

Agrupada por dia, com saldo do dia. Filtros de período (com atalhos de hoje, semana,
mês, mês passado e últimos 30 dias), categoria, entrada ou saída, forma de pagamento
e busca na descrição. No painel do Financeiro fica um resumo com os cinco últimos
apontando para a lista.

A **forma de pagamento** deixou de ser texto livre e virou escolha entre débito,
crédito, dinheiro e pix — digitar produzia "Débito", "debito" e "Débito " como três
formas distintas, e nenhum filtro agrupava direito.

O **lançamento rápido** ganhou um botão "Lançar hoje" no mobile. Ele era de duas
interações — digitar o valor e apertar Enter — e no celular não salvava nunca:
`inputMode="decimal"` abre o teclado numérico, que não tem tecla de retorno, então
não havia de onde emitir o Enter, e sem `<form>` o navegador também não podia
oferecer a tecla de ação. Não existindo botão, o aparelho onde o lançamento mais
acontece era o único sem saída. A dica "Enter para lançar hoje" agora só aparece no
desktop, onde é verdade.

Todo campo com casa decimal — valor, meta, peso corporal, nota, carga — aceita
**vírgula**. Antes eram campos `type="number"`, onde a vírgula é caractere inválido:
o navegador descartava a entrada, e como o teclado do celular em português oferece
vírgula, digitar 87,5 chegava ao código como vazio. Valia para a carga da série
também, que é o campo digitado de pé na academia. A leitura virou uma função só,
com teste, e "1.500" é lido como mil e quinhentos, não como um e meio.

No celular os **filtros vêm recolhidos**, com o período à vista e um botão "Filtros"
que mostra quantos estão valendo — sete campos empilhados empurravam a lista para
fora da primeira tela, e a página cujo propósito é a lista abria mostrando uma busca.
No desktop nada muda: lá os filtros cabem em duas linhas junto com a lista.

E dá para **chegar na lista por três caminhos** — pela paleta de comando, pelo card
"Últimos lançamentos" do painel ou pelo botão no topo do Financeiro. Antes havia um
só, um "Ver todos" de texto pequeno na quina de um card, que no celular era o mesmo
que não existir.

Detalhes em [`plano.md`, resoluções 10.23, 10.25, 10.26 e 10.27](./plano.md).

## Calendário

A grade de mês respondia a pergunta errada. Grade serve para **agendar** — achar
espaço livre — e aqui nada é agendado em espaço livre: a rotina está fixa no
fluxograma e prova, conta e marco chegam com data colada. A pergunta real é o que
vem e onde a semana aperta.

A vista padrão passou a ser a semana, em duas partes:

**A faixa de carga**, no topo, separa em dois eixos o que a grade misturava num
bloco colorido só. A altura da barra é o tempo já comprometido pela rotina,
segmentado por pilar; as marcas acima são o que vence naquele dia. Clicar num dia
leva a agenda até ele.

Dois sinais a mais, só em dias passados — marcar o futuro como falha seria
mentira: um traço quando o sono ficou abaixo da meta, um anel quando havia rotina
prevista e o check não saiu.

**A agenda**, abaixo, com uma linha por dia. Prazo aparece antes da rotina,
independente do horário. Dia vazio mantém a linha, porque "quarta está livre" é
uma resposta.

A regra de apresentação valendo nas duas vistas: **cor marca a camada, peso marca
a natureza.** Rotina é filete na cor do pilar; prazo é preenchimento sólido; sono
é tinta ao fundo. Antes tudo era bloco cheio, e uma prova pesava igual à terceira
aula da semana.

A grade de mês continua ali, atrás do botão "Mês" — e agora só é baixada por quem
a abre. Isso tirou 63 kB gzip do carregamento da página.

A agenda mostra **o que aconteceu, não só o que estava previsto**. Treino registrado
e sessão de estudo aparecem com ✓ na linha do dia; o que foi desmarcado aparece
riscado, mas só em dias que já chegaram — no futuro, desmarcado é simplesmente fora
do plano.

Antes a agenda era uma projeção do fluxograma e nada mais, e isso dava um resultado
ruim: registrar um treino fora do previsto e desmarcar o previsto deixava o dia **sem
nenhuma linha de treino**, como se você não tivesse treinado. Quando o previsto e o
realizado são o mesmo treino no mesmo dia, sai uma linha só — a realizada, que é o
fato e traz a hora que você informou.

A hora do treino vem de `hora_inicio`, informada por você. Sessão sem hora aparece sem
horário em vez de ganhar um número derivado de quando o registro terminou.

Detalhes em [`plano.md`, resoluções 10.20 e 10.31](./plano.md).

## Metas

"Meta" existia espalhada e sem lugar único — orçamento de categoria no Financeiro,
marco de projeto, recorde pessoal no Treino — e nada em Estudos ou Sono. Um dado só
(`metas`), quatro formas (numérica, marco, hábito, livre), vínculo opcional com
qualquer pilar. Sem rota nova: a seção vive na Home, com as metas mais próximas do
prazo em destaque e uma lista completa atrás de "Ver todas".

Meta numérica linkada a um pilar calcula o progresso real via RPC
(`progresso_meta`) — soma de lançamentos, minutos de estudo, execuções de treino,
% de marcos concluídos, ou variação de peso corporal, conforme o vínculo. Peso
corporal é o único vínculo que não é uma FK para uma entidade (categoria, matéria…)
— é peso ao longo do tempo, então o progresso é a diferença entre o peso antes da
meta e o peso mais recente, não uma soma no período. Sem link, o valor é digitado
à mão no próprio card. Meta de hábito registra check-in diário e calcula
sequência e progresso da semana.

Detalhes em [`plano.md`, resoluções 10.32 a 10.34](./plano.md).

## Apagar dado pede confirmação

**Todo botão que apaga passa por uma confirmação**, não só os que apagam entidades
com cascata. A distinção antiga — "exclusão simples vai direto" — não se sustentava:
o sistema não tem desfazer nem lixeira, então um lançamento, uma falta ou uma série
apagados por engano não voltam. Eram quatorze botões disparando na hora, incluindo o
de documento, que apaga o arquivo do armazenamento e não só a linha.

Cada confirmação diz **o que se perde**, com o dado na frente: o valor e a data do
lançamento, a nota da avaliação, os minutos da sessão. "Tem certeza?" não é
informação.

Os alvos de toque subiram para **44px no celular** e voltam a 28px no desktop. Um
deles, o de remover horário do fluxograma, tinha 20px e só aparecia no `hover` — o
que no celular significa invisível e clicável ao mesmo tempo.

Detalhes em [`plano.md`, resolução 10.28](./plano.md).

## Formulários no celular

No celular todo diálogo é uma **folha ancorada na borda de baixo**, largura cheia,
que cresce para cima. No desktop segue centralizado, que é o certo lá.

Ancorar embaixo resolveu três incômodos que tinham a mesma causa — o conteúdo estava
preso ao meio da tela: o X sumia ao rolar formulário longo, abrir o teclado fazia o
diálogo saltar, e os botões ficavam no meio da tela, onde a mão que segura o aparelho
não alcança. Agora o rodapé encosta embaixo, e os botões dele têm 44px de altura no
toque.

Fecha por Esc, toque fora ou pelo X. **Não tem gesto de arrastar** — e por isso não
tem alcinha no topo, porque alcinha promete um gesto que não existiria.

Detalhes em [`plano.md`, resolução 10.29](./plano.md).

## Nada de tabela no celular

As duas tabelas que restavam mostravam **menos** no celular do que no desktop: para
caber em ~296px, uma escondia a forma de pagamento e truncava a descrição em ~80px, a
outra escondia a data das avaliações.

Os lançamentos da categoria passaram a usar a **mesma lista** da página de
lançamentos — uma lista só para o mesmo dado, agrupada por dia, com a descrição
quebrando em mais de uma linha em vez de ser cortada. As avaliações viraram lista
também, com a data de volta; e avaliação sem nota cuja data já passou ganhou um aviso
de **"sem nota"**, que é o que distingue uma pendência de uma prova que ainda vai
acontecer.

Detalhes em [`plano.md`, resolução 10.30](./plano.md).

## Estrutura

```
.
├── plano.md              # Plano de execução (fonte de verdade do escopo)
└── app/
    ├── src/
    │   ├── components/
    │   │   ├── layout/   # AppShell, Sidebar, ThemeToggle
    │   │   └── ui/       # shadcn/ui (vendored)
    │   ├── features/     # um módulo por pilar: api, hooks, calculos, componentes
    │   │   └── financeiro/
    │   ├── hooks/
    │   ├── lib/          # supabase, queryClient, pilares, constants, datas
    │   ├── pages/        # uma pasta por pilar (rotas)
    │   ├── stores/       # Zustand
    │   └── types/        # database.ts (gerado)
    └── supabase/
        └── migrations/   # schema versionado (resolução 10.11)
```

## Rodando localmente

```bash
cd app
npm install
cp .env.example .env.local   # preencha com as credenciais do Supabase
npm run dev
```

### Dados de exemplo

O sistema começa vazio. Para ver as telas com conteúdo, rode
[`app/supabase/seed.sql`](./app/supabase/seed.sql) — ~4 meses de histórico
coerente, montado para exercitar os casos de borda: os três estados do semáforo
de risco, uma categoria estourando a meta por 2 meses (candidata a corte), um
projeto esfriando e outro sem nenhum log, PRs em progressão e sono cruzando a
meia-noite. As datas são relativas a `current_date`, então o cenário nunca
envelhece.

Para limpar: [`app/supabase/seed_limpar.sql`](./app/supabase/seed_limpar.sql).
Ele apaga **todos** os dados, não só os de exemplo — o banco não distingue os
dois.

### Atalhos de teclado

| Atalho | Ação |
| --- | --- |
| `Ctrl`/`⌘` + `K` | Buscar e navegar |
| `G` então `H` / `F` / `E` / `T` / `P` / `C` | Ir para Home / Financeiro / Estudos / Treino / Projetos / Calendário |
| `?` | Mostrar a lista de atalhos |

A busca cobre as rotas e também os registros cadastrados — categoria, matéria,
treino, exercício, projeto. Teclas simples só disparam quando o foco não está em
campo de texto; `Ctrl`/`⌘` + `K` funciona de qualquer lugar.

### Scripts

| Comando | Ação |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Typecheck + build de produção |
| `npm run lint` | oxlint |
| `npm run test` | Vitest (funções puras de cálculo) |
| `npm run typecheck` | Apenas verificação de tipos |
| `npm run types:gen` | Regenera `src/types/database.ts` do schema remoto |

## Deploy (Vercel)

A configuração está em [`vercel.json`](./vercel.json), na raiz. Ela existe porque
o app vive em `app/`, não na raiz do repositório: sem isso a Vercel não encontra
`package.json`, não detecta framework e publica os arquivos crus do repo — o que
dá **404 em todas as rotas**, inclusive a home.

O que cada parte resolve:

| Chave | Por quê |
| --- | --- |
| `installCommand`, `buildCommand` | Entram em `app/` antes de rodar o npm |
| `outputDirectory` | Aponta para `app/dist`, onde o Vite escreve |
| `rewrites` | Fallback para `index.html`. O roteamento é do lado do cliente, então sem isso recarregar em `/financeiro` procuraria um arquivo com esse nome. A Vercel resolve estáticos antes dos rewrites, então `/assets/*` continua sendo servido |
| `headers` | Cache imutável em `/assets/*` (o Vite versiona por hash) e `no-cache` no `index.html`, que aponta para os hashes novos a cada deploy |

> O schema da Vercel usa `additionalProperties: false`, então **não aceita chaves
> de comentário** como `"//"`. É por isso que a documentação está aqui e não
> dentro do JSON.

### Variáveis de ambiente

`.env.local` não vai para o git, então precisam ser configuradas em
**Settings → Environment Variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

O Vite as lê **no build**, então alterá-las exige um novo deploy. Faltando
qualquer uma, o app mostra a tela `ConfiguracaoAusente` dizendo o que falta — em
vez da página em branco que acontecia antes.

> **Atenção:** o RLS está desabilitado (resolução 10.8). Numa URL pública,
> qualquer pessoa que descubra o endereço pode ler e escrever no banco. Enquanto
> não houver autenticação, vale ativar **Deployment Protection → Vercel
> Authentication**.

## Convenções

- **Cálculos de fórmula são funções puras testáveis** (média ponderada, 1RM
  estimado, gasto disponível), nunca lógica espalhada em componentes (plano 9).
- **Agregação pesada vem de campo-resumo via trigger**; agregação leve e dados
  que dependem da passagem do tempo são calculados na leitura (resolução 10.9).
- **Constantes de domínio** ficam em `src/lib/constants.ts`, declaradas uma
  única vez (resolução 10.3).
- **Recorrência não é expandida no banco** — `fluxograma_semanal` guarda o
  padrão semanal e o cliente expande em ocorrências datadas (resolução 10.5).
- **`dia_semana` segue `Date.getDay()`**: 0 = domingo … 6 = sábado.

## Segurança

Sistema single-user **sem autenticação** (resolução 10.0). RLS está
deliberadamente desabilitado e o acesso é feito com a publishable key.

> **Dívida técnica consciente:** RLS fica condicionado à futura adição de
> autenticação. Deve ser revisto antes de qualquer exposição multi-usuário.
