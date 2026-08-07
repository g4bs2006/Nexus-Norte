# Nexus — Plano de Execução do Sistema de Gestão Pessoal

> Documento de referência para implementação via Claude Code (Opus).
> Stack: React + Vite + TypeScript, Tailwind + shadcn/ui, React Query + Zustand, Recharts, FullCalendar, React Hook Form + Zod, Supabase (DB + Storage + Triggers), Vercel (deploy).

---

## 0. Visão geral e ordem de execução

O sistema tem 4 pilares + 1 hub central + 1 camada transversal:

1. **Home** (hub — depende dos outros pilares, implementar por último)
2. **Financeiro**
3. **Estudos**
4. **Treino**
5. **Projetos**
6. **Calendário unificado** (camada transversal — provas, treinos, vencimentos, sono)

**Ordem recomendada de execução (fases):**

- **Fase 0 — Fundacional**: setup do projeto, design system (tema Notion-like), schema base do Supabase, autenticação simples, layout de shell (sidebar + roteamento)
- **Fase 1 — Financeiro** (pilar mais estruturado, bom para validar padrões de planejado vs. realizado)
- **Fase 2 — Estudos**
- **Fase 3 — Treino**
- **Fase 4 — Projetos**
- **Fase 5 — Calendário unificado** (consome dados de todos os pilares)
- **Fase 6 — Home** (consolida tudo)
- **Fase 7 — Polimento**: cache, triggers de performance, dark mode, responsividade

Cada pilar deve ser implementado de forma que funcione **isoladamente** antes de integrar com a Home — evita dependência circular e permite testar cada page sozinha.

---

## 1. Fundação (Fase 0)

### 1.1 Setup técnico
- Projeto Vite + React + TypeScript
- Tailwind configurado com paleta customizada (ver 1.2)
- shadcn/ui instalado (componentes base: button, card, checkbox, dialog, tabs, progress, badge, input, select, form)
- React Router com estrutura de rotas:
  - `/` → Home
  - `/financeiro`, `/financeiro/categorias/:id`
  - `/estudos`, `/estudos/:materiaId`
  - `/treino`, `/treino/:exercicioId`
  - `/projetos`, `/projetos/:projetoId`
  - `/calendario`
- React Query configurado (QueryClientProvider no root)
- Zustand store mínimo (tema claro/escuro por enquanto)
- Supabase client configurado (`.env` com URL e anon key)

### 1.2 Design system (paleta estilo Notion)
- **Modo claro**: fundo `#FFFFFF`/`#FBFBFA`, texto `#37352F`, bordas `#E9E9E7`
- **Modo escuro**: fundo `#191919`/`#2F3437`, texto `#D4D4D4`, bordas `#3F3F3F`
- **Cores de destaque por pilar** (pastel, dessaturado):
  - Financeiro: verde suave
  - Estudos: azul suave
  - Treino: laranja/vermelho suave
  - Projetos: roxo suave
  - Sono/Calendário: amarelo suave
- Tipografia: Inter, line-height generoso, títulos peso médio (não bold pesado)
- Componente de sidebar: árvore colapsável, ícone + nome de cada pilar, item ativo destacado com fundo sutil

### 1.3 Schema base (tabelas transversais)
```sql
-- Checks diários (ação, não resultado)
checks_diarios (
  id, data, financeiro_registrado boolean,
  planejamento_semana_feito boolean, -- só relevante aos domingos
  created_at
)

-- Fluxograma semanal (usado por Estudos e Treino)
fluxograma_semanal (
  id, dia_semana int, pilar text, referencia_id uuid, -- aponta pra materia ou treino
  horario_inicio time, horario_fim time
)

-- Sono
planejamento_sono (
  id, dia_semana int, hora_dormir_alvo time, hora_acordar_alvo time
)
registro_sono (
  id, data, hora_dormir_real time, hora_acordar_real time, horas_calculadas numeric
)
```

---

## 2. Page Financeiro (Fase 1)

### 2.1 Schema
```sql
categorias (
  id, nome, tipo text check (tipo in ('fixo','variavel')),
  meta_mensal numeric, meta_tipo text check (meta_tipo in ('valor','percentual_renda')),
  cor text, subcategoria_pai_id uuid null
)

lancamentos (
  id, valor numeric, categoria_id uuid references categorias,
  data date, descricao text, forma_pagamento text
)

investimentos (
  id, valor_aportado numeric, data_aporte date,
  rendimento_periodo numeric, data_referencia date
)

planejamento_semanal_financeiro (
  id, semana_inicio date, dia_semana int,
  categoria_id uuid references categorias, valor_planejado numeric
)
```

### 2.2 Cálculos (via Postgres function/trigger, atualizados na escrita)
- `total_gasto_categoria_mes(categoria_id, mes)` → soma de lançamentos
- `gasto_disponivel_geral(data)` = (meta mensal total − gasto realizado) ÷ dias restantes do mês
- `gasto_disponivel_planejado(data)` = valor planejado da categoria/dia (do planejamento semanal)
- `status_diario(data)` → 🟢/🔴 comparando lançamento do dia vs. planejado
- `progresso_categoria(categoria_id)` → % da meta mensal consumida
- `ranking_gastos(mes)` → top 5 categorias por valor
- `candidatos_corte()` → categorias variáveis que estouraram meta 2 meses seguidos
- `saldo_projetado_fim_mes()` → projeção baseada no ritmo atual
- Trigger: ao inserir/editar lançamento, atualizar campo resumo `total_gasto_mes` em `categorias` (evita recálculo pesado na leitura)

### 2.3 Componentes de UI
- Card topo: **Receita vs. Despesa** (entrada total do mês x saída total, saldo líquido)
- Bloco de planejamento semanal: grade dia × categoria com valores planejados, editável (ritual de domingo), incluindo "disponível hoje" (geral + planejado lado a lado)
- Barra de progresso geral do mês
- Grid de cards por categoria (anel de progresso, gasto/meta, cor da categoria)
- Gráfico de linha (Recharts): tendência de gasto x meta, 6 meses, com seletor de categoria
- Seção "atenção" (candidatos a corte)
- Seção investimentos (aporte total + rendimento do mês)

### 2.4 Checkboxes
- Diário: "Lancei os gastos de hoje?" (`checks_diarios.financeiro_registrado`)
- Semanal (domingo): "Planejei a semana?" (`checks_diarios.planejamento_semana_feito`)

### 2.5 Formulários (React Hook Form + Zod)
- Cadastro/edição de categoria
- Novo lançamento
- Planejamento semanal (formulário em grade, 7 dias × N categorias)
- Novo aporte/rendimento de investimento

---

## 3. Page Estudos (Fase 2)

### 3.1 Schema
```sql
materias (
  id, nome, professor, carga_horaria_total int,
  limite_faltas int, semestre text
)

documentos (
  id, materia_id references materias, tipo text check (tipo in ('lista','livro','anotacao','ementa','prova_anterior')),
  nome, storage_path text -- Supabase Storage
)

faltas (
  id, materia_id references materias, data date, motivo text
)

avaliacoes (
  id, materia_id references materias, nome text, peso numeric, nota numeric null
)

config_calculo_media (
  id, materia_id references materias unique,
  tipo text check (tipo in ('ponderada','manual')),
  nota_manual numeric null, observacao text null
)

registro_listas (
  id, materia_id references materias, nome_lista text, data date,
  total_questoes int, questoes_erradas text, -- ex: "4,7" ou array
  topico text
)

sessoes_estudo (
  id, materia_id references materias, data date,
  duracao_minutos int, meta_diaria_minutos int -- referência do dia
)
```

### 3.2 Cálculos
- `media_materia(materia_id)`: se `config_calculo_media.tipo = 'ponderada'` → `Σ(nota × peso) / Σ(peso)`; se `'manual'` → usa `nota_manual`
- `faltas_restantes(materia_id)` = `limite_faltas - count(faltas)`
- `risco_reprovacao(materia_id)` → cruza média projetada + faltas restantes vs. limite → 🟢/🟡/🔴
- `frequencia_estudo_semana(materia_id)` → soma de `sessoes_estudo.duracao_minutos` vs. meta
- `dias_para_proxima_avaliacao(materia_id)` → menor data futura em `avaliacoes` sem nota
- Trigger: ao inserir nota em `avaliacoes`, recalcular e salvar `media_atual` em `materias` (campo resumo)

### 3.3 Componentes de UI
- Grid de cards de matéria: nome, média atual, faltas restantes (cor conforme proximidade do limite), próxima avaliação com contagem regressiva
- Sub-página da matéria (abas): Documentos / Avaliações / Faltas / Sessões de estudo
  - Documentos: lista com upload (Supabase Storage), filtro por tipo
  - Avaliações: tabela nota/peso, editor de fórmula (padrão ponderada ou manual)
  - Faltas: lista com motivo, contador visual de restantes
  - Sessões: timer simples ou input manual, histórico em lista/gráfico
- Fluxograma semanal (grade dias × horários) — componente compartilhado com Treino
- Registro de listas de exercícios (Opção C, começando pela Opção A): formulário simples pós-lista (total questões, quais errou, tópico)

### 3.4 Checkboxes
- Diário, **derivado do fluxograma** (calculado na leitura, não pré-gerado): "Hoje tem [Matéria X]" com toggle de concluído — resolver via `fluxograma_semanal WHERE dia_semana = hoje AND pilar = 'estudos'`

---

## 4. Page Treino (Fase 3)

### 4.1 Schema
```sql
treinos (
  id, nome, tipo text, dias_semana int[] -- ex: {1,4} = segunda e quinta
)

exercicios_treino (
  id, treino_id references treinos, nome, series int,
  reps_alvo int, carga_alvo numeric, descanso_segundos int
)

execucoes_treino (
  id, treino_id references treinos, data date
)

execucoes_exercicio (
  id, execucao_treino_id references execucoes_treino,
  exercicio_id references exercicios_treino,
  carga_real numeric, reps_reais int, rpe int null
)

personal_records (
  id, exercicio_id references exercicios_treino,
  data date, carga numeric, reps int, um_rm_estimado numeric -- Epley: carga*(1+reps/30)
)

registro_corporal (
  id, data date, peso numeric, medidas jsonb null, foto_storage_path text null
)

registro_lesoes (
  id, data date, regiao text, intensidade int
)
```

### 4.2 Cálculos
- `um_rm_estimado(carga, reps)` = `carga * (1 + reps/30)` — calculado a cada execução, compara com `personal_records` e insere novo PR se superado
- `frequencia_semana(treino_id)` = execuções reais vs. `dias_semana` planejado
- `progressao_carga(exercicio_id)` → compara última execução vs. anterior (subindo/estagnado/caindo)
- `sinal_estagnacao(exercicio_id)` → se 3-4 semanas sem progressão → sugestão de ajuste
- `volume_grupo_muscular(semana)` → soma de (séries × reps × carga) por grupo (requer campo `grupo_muscular` em exercícios)

### 4.3 Componentes de UI
- Card "treino de hoje" no topo, derivado do fluxograma — exercícios previstos + botão "iniciar execução"
- Grid de exercícios cadastrados, cada um abrindo histórico de progressão (gráfico de carga ao longo do tempo)
- Seção de PRs recentes com destaque visual (badge/troféu)
- Gráfico de peso corporal/medidas (discreto, não protagonista)
- Indicador de frequência semanal (ex: "3/4 treinos essa semana")
- Upload opcional de foto de progresso (reaproveita componente de upload dos Documentos de Estudos)
- Registro de lesões (formulário simples, lista histórica)

### 4.4 Checkboxes
- Diário, derivado do fluxograma (mesmo padrão de Estudos): "Treino de hoje: [Nome]" com toggle de concluído

---

## 5. Page Projetos (Fase 4)

### 5.1 Schema
```sql
projetos (
  id, nome, descricao, status text check (status in ('planejamento','em_andamento','pausado','concluido')),
  data_inicio date, prazo_alvo date null
)

marcos_projeto (
  id, projeto_id references projetos, nome, status text check (status in ('a_fazer','fazendo','feito')),
  data_prevista date null
)

log_progresso (
  id, projeto_id references projetos, data date, conteudo text -- texto livre
)
```

### 5.2 Cálculos
- `percentual_concluido(projeto_id)` = marcos feitos / total de marcos
- `dias_desde_ultima_atualizacao(projeto_id)` = hoje − max(log_progresso.data) → determina "momentum" (card esfria visualmente após X dias sem log)

### 5.3 Componentes de UI
- Grid de cards de projetos ativos: status, % concluído, "última atualização há X dias" (opacidade/cor reduzida se momentum baixo)
- Abas separadas: Ativos / Pausados / Concluídos
- Página do projeto: timeline do log de progresso (mais recente no topo) + lista de marcos (estilo kanban simples ou checklist)

### 5.4 Checkboxes
- Sem check diário fixo — a ação do dia é o próprio ato de adicionar um log de progresso

---

## 6. Calendário unificado (Fase 5)

### 6.1 Fonte de dados
Agrega, sem duplicar tabelas:
- `avaliacoes` (Estudos) → provas
- `fluxograma_semanal` → aulas e treinos recorrentes
- `lancamentos` com categoria tipo "fixo" e data de vencimento → contas (Financeiro)
- `registro_sono` / `planejamento_sono` → blocos de sono
- `marcos_projeto` com `data_prevista` → marcos de projeto

### 6.2 Implementação
- **FullCalendar** (adapter React), eventos coloridos por pilar (reaproveita paleta definida em 1.2)
- Visões: mensal (padrão) e semanal (para o ritual de planejamento de domingo)
- Filtro por pilar (toggle de camadas visíveis)
- Sono como bloco na grade semanal, junto com aulas/treinos planejados

---

## 7. Home (Fase 6)

### 7.1 Composição
Não duplica dado — apenas agrega e lê campos resumo já calculados:
- Mini-card Financeiro: Receita vs. Despesa (compacto) + status 🟢/🟡/🔴 do mês
- Mini-card Estudos: matérias em risco (🔴) + próxima avaliação mais próxima entre todas
- Mini-card Treino: frequência da semana + PR mais recente
- Mini-card Projetos: projetos com momentum baixo (atenção) + projeto mais ativo
- Mini-indicador de sono: horas dormidas ontem vs. meta
- Bloco de checks do dia: todos os checks diários (financeiro, estudos derivado do fluxograma, treino derivado do fluxograma) em uma lista única
- Atalho para o calendário (próximos 3-5 eventos)

### 7.2 Regra de performance
- Dado do dia atual / check diário → calculado na leitura (barato)
- Dado agregado/histórico (médias, totais mensais) → lido de campo resumo pré-calculado via trigger, nunca recalculado na Home
- React Query com cache configurado para evitar refetch desnecessário ao navegar entre pilares e voltar pra Home

---

## 8. Fase 7 — Polimento

- Revisar todos os triggers de campo-resumo (performance)
- Dark mode completo (toggle na sidebar, paleta já definida em 1.2)
- Responsividade (o sistema é uso pessoal, mas vale funcionar bem em mobile pro registro rápido do dia a dia)
- Row Level Security no Supabase (boa prática mesmo com usuário único)
- Revisão geral de UX: reduzir fricção nos formulários mais usados no dia a dia (lançamento financeiro, execução de treino, check diário)

---

## 9. Notas para o Claude Code

- Seguir a ordem de fases acima; não pular para Home antes dos pilares estarem funcionais isoladamente
- Cada fase deve terminar com a page navegável e funcional antes de seguir para a próxima
- Reaproveitar componentes entre pilares sempre que possível (grade de fluxograma semanal, upload de arquivo, card de progresso circular, formulário de planejamento em grade dia×categoria)
- Priorizar TypeScript estrito (evitar `any`) dado o volume de cálculos numéricos sensíveis (médias, projeções financeiras)
- Cálculos de fórmula (média ponderada, 1RM estimado, gasto disponível) devem virar funções puras testáveis, não lógica espalhada em componentes

---

## 10. Resoluções de lacunas do plano

> Decisões tomadas após revisão do plano original. Estas resoluções **sobrescrevem** os schemas e regras das seções anteriores onde houver conflito.

### 10.0 Decisão base: sem autenticação
O sistema é single-user e **não terá autenticação** nesta etapa. Acesso ao Supabase via anon key, com policies abertas. Isso afeta as seções 10.8 e 10.10.

### 10.1 Campo `grupo_muscular` (corrige 4.1 / 4.2)
`volume_grupo_muscular(semana)` depende de um campo que não existia. Adicionar em `exercicios_treino`:
```sql
exercicios_treino (
  ..., grupo_muscular text -- ex: 'peito', 'costas', 'perna'
)
```

### 10.2 Vencimento de contas (corrige 2.1 / 6.1)
O Calendário precisa de data de vencimento para contas fixas, que não existia em `lancamentos`:
```sql
lancamentos (
  ..., data_vencimento date null -- só relevante para categorias tipo 'fixo'
)
```
Regra de leitura: se `data_vencimento` for `null`, o Calendário usa `data` como fallback.

### 10.3 Definição de `media_projetada` (completa 3.2)
`risco_reprovacao` citava "média projetada" sem defini-la. Definição como função pura:
```
media_projetada(materia_id) =
  [ Σ(nota × peso das avaliações já lançadas)
  + Σ(peso das avaliações pendentes × NOTA_MINIMA_APROVACAO) ]
  ÷ Σ(peso total)
```
Assume a nota mínima de aprovação para avaliações futuras (pior caso realista). `NOTA_MINIMA_APROVACAO` = `6.0`, declarada como **constante configurável única**, nunca hardcoded em múltiplos pontos.

### 10.4 Schema de `investimentos` (substitui 2.1)
O schema original misturava aporte e rendimento na mesma linha, tornando os cálculos ambíguos. Substituir por uma linha por evento:
```sql
investimentos (
  id, tipo text check (tipo in ('aporte','rendimento')),
  valor numeric, data date
)
```
- Aporte total do mês → soma de `valor` onde `tipo = 'aporte'`
- Rendimento do mês → soma de `valor` onde `tipo = 'rendimento'`

### 10.5 Expansão de recorrência no Calendário (completa 6.2)
`fluxograma_semanal` e `planejamento_sono` são recorrentes por `dia_semana`; o Calendário precisa de instâncias datadas. Decisão:

- **Não** expandir recorrência no banco (evita duplicação de dados e problemas de exceção).
- As tabelas recorrentes seguem sendo a **fonte de verdade** do padrão semanal.
- A expansão acontece **no cliente**, via função pura `expandirRecorrencia(regra, intervaloDatas)`, gerando ocorrências virtuais apenas para o mês/semana visível.
- Exceções pontuais (cancelar uma aula específica sem afetar as outras semanas) via tabela leve:
```sql
excecoes_fluxograma (
  id, fluxograma_id references fluxograma_semanal,
  data date, status text check (status in ('cancelado','remarcado'))
)
```

### 10.6 Integridade referencial do fluxograma (substitui 1.3)
`referencia_id + pilar` era uma referência polimórfica sem FK real, permitindo linhas órfãs. Substituir por duas colunas nullable com FK real:
```sql
fluxograma_semanal (
  id, dia_semana int,
  materia_id uuid null references materias on delete cascade,
  treino_id uuid null references treinos on delete cascade,
  horario_inicio time, horario_fim time
  -- exatamente uma das duas FKs deve estar preenchida (check constraint)
)
```
Ganha integridade referencial e `ON DELETE CASCADE` nativos, ao custo de colunas nulas — trade-off aceitável para o escopo. O campo `pilar` deixa de ser necessário (derivável de qual FK está preenchida).

### 10.7 Tipo de `questoes_erradas` (substitui 3.1)
Era `text` guardando `"4,7"`, exigindo parsing manual em toda leitura. Trocar para tipo nativo:
```sql
registro_listas (
  ..., questoes_erradas int[]
)
```

### 10.8 RLS removido da Fase 7 (altera 8)
RLS depende de `auth.uid()`; sem autenticação, as policies não teriam o que verificar. **Remover RLS da Fase 7.**

> **Dívida técnica consciente:** RLS fica condicionado à futura adição de autenticação. Enquanto isso, o acesso é via anon key com policies abertas — aceitável para uso pessoal single-user, mas deve ser revisto antes de qualquer exposição multi-usuário.

### 10.9 Campos-resumo e regra de performance (revisa 7.2)
A regra original ("dado agregado nunca é recalculado na Home") era inconsistente: apenas dois campos-resumo estavam definidos no plano inteiro. Regra revisada:

**Agregação pesada (somas sobre muitas linhas) → campo-resumo via trigger:**
- `categorias.total_gasto_mes` — trigger em `lancamentos` *(já previsto em 2.2)*
- `materias.media_atual` — trigger em `avaliacoes` *(já previsto em 3.2)*
- `categorias.candidato_corte boolean` — trigger em `lancamentos`; checa se estourou meta 2 meses seguidos

**Agregação leve (poucas linhas) → calculado na leitura:**
- `ranking_gastos(mes)` — opera sobre as N categorias do mês, barato
- `saldo_projetado_fim_mes()` — projeção aritmética simples

**Caso especial — depende da passagem do tempo, não de escrita:**
- `dias_desde_ultima_atualizacao(projeto_id)` e o momentum de projetos **não podem** vir só de trigger: o valor muda com o tempo mesmo sem novo `log_progresso`. Calcular na leitura, a partir de `max(log_progresso.data)`.

### 10.10 Supabase Storage (completa 3.3 / 4.3)
Dois buckets, não públicos, acessados via anon key (coerente com 10.0):
```
documentos-estudos/   -- materiais por matéria (seção 3.3)
progresso-treino/     -- fotos de progresso corporal (seção 4.3)
```
Sem RLS granular por ora — mesma dívida técnica registrada em 10.8.

### 10.11 Versionamento de schema (completa 1.1)
Usar **Supabase CLI migrations** desde a Fase 0. Cada bloco de schema (seções 1.3, 2.1, 3.1, 4.1, 5.1, mais as correções desta seção 10) vira uma migration numerada via `supabase migration new`, aplicada com `supabase db push`. Preserva histórico de schema e permite reset do banco local durante o desenvolvimento.

### 10.12 Modelagem de receita (corrige 2.1) — descoberta na Fase 1
A seção 2.3 pede um card **"Receita vs. Despesa"** e a 2.1 prevê
`meta_tipo = 'percentual_renda'`. Ambos exigem saber a renda do mês, mas o
schema não modelava receita: `categorias.tipo` só distingue `fixo`/`variavel`,
que são dois tipos de **despesa**.

Adicionada a coluna `natureza` em `categorias`:
```sql
categorias (
  ..., natureza text not null check (natureza in ('receita','despesa'))
)
```
- `tipo` (`fixo`/`variavel`) passa a ser exclusivo de despesas — receitas têm
  `tipo = null`, garantido por check constraint.
- A receita do mês vem da view `receita_mensal`, que soma lançamentos de
  categorias com `natureza = 'receita'`.
- `meta_tipo = 'percentual_renda'` é resolvido cruzando `meta_mensal` (o
  percentual) com a receita daquele mês.

**Ajuste em 10.9:** `candidato_corte` **não** virou campo-resumo por trigger.
Depende de quais são os 2 meses anteriores, que muda na virada do mês sem
nenhuma escrita acontecer — a mesma dependência temporal já reconhecida no
momentum de projetos. Virou a função Postgres `candidatos_corte()`, calculada na
leitura. O único campo-resumo do Financeiro é `categorias.total_gasto_mes`.

### 10.13 Ordenação do fluxograma (consequência de 10.6) — descoberta na Fase 0
Com FKs reais, `fluxograma_semanal` depende de `materias` e `treinos` e não pode
ser criada na Fase 0. É criada na migration da Fase 2 (com `materia_id`) e
estendida na Fase 3 (adicionando `treino_id` e o check constraint final).

Consequência nas seções 3.4 e 4.4: a query dos checks diários deixa de filtrar
por `pilar = 'estudos'` e passa a filtrar por `materia_id is not null` /
`treino_id is not null`.

### 10.14 Data das avaliações (corrige 3.1) — descoberta na Fase 2
`dias_para_proxima_avaliacao` (3.2) e as provas no Calendário (6.1) dependem da
data da avaliação, mas `avaliacoes` não tinha essa coluna. Adicionada:
```sql
avaliacoes (
  ..., data date null  -- null = data ainda não marcada
)
```
Avaliações sem data são ignoradas na contagem regressiva — não há como
projetá-las no calendário.

### 10.15 Persistência do check derivado (completa 3.4 / 4.4) — descoberta na Fase 2
As seções 3.4 e 4.4 pedem check diário "derivado do fluxograma, com toggle de
concluído". A derivação resolve **quais** itens aparecem no dia, mas o estado de
conclusão precisa ser gravado — e `checks_diarios` só tem os campos do
Financeiro.

Nova tabela, modelada como presença:
```sql
conclusoes_fluxograma (
  id, fluxograma_id references fluxograma_semanal on delete cascade,
  data date, unique (fluxograma_id, data)
)
```
Existir a linha significa "concluído"; desmarcar **apaga** a linha em vez de
gravar `false`. Assim a tabela só registra o que de fato aconteceu e não
pré-gera linhas para todo dia do calendário — coerente com a decisão de não
materializar a recorrência (10.5).

### 10.17 Fonte única do planejamento de treino (corrige 4.1) — descoberta na Fase 3
O plano definia `treinos.dias_semana int[]` (4.1) **e** usava o fluxograma para
o card "treino de hoje" (4.3) — duas fontes de verdade para o mesmo fato, que
sairiam de sincronia na primeira vez que uma fosse editada sem a outra.

`dias_semana` foi **descartada**. O fluxograma é a fonte única:
- "Treino de hoje" expande as ocorrências do fluxograma para a data atual
- `frequencia_semana` compara execuções reais com as ocorrências previstas no
  fluxograma na semana

**Convenção adicional:** cada linha de `execucoes_exercicio` representa **uma
série**. É o que permite `volume_grupo_muscular` ser `Σ(reps × carga)` somando
linha a linha, sem depender do número de séries planejado — o plano escrevia
"séries × reps × carga", que dá o mesmo resultado sob essa convenção.

### 10.16 Referência pendente no plano (3.3)
A seção 3.3 menciona "Registro de listas de exercícios (Opção C, começando pela
Opção A)", mas essas opções não estão definidas em nenhum ponto do documento.
Implementado o que a própria seção descreve: formulário pós-lista com total de
questões, quais errou e tópico. Se as opções A/C tinham outro escopo, isso
precisa ser revisitado.
### 10.18 Biblioteca de exercícios e de tipos de treino (corrige 4.1 / 4.3) — descoberta depois da Fase 7
`exercicios_treino` guardava `nome` e `grupo_muscular` como texto em cada linha,
e `treinos.tipo` era texto livre. Consequências reais no banco do usuário:

- 27 linhas de exercício para **21 movimentos distintos** — "Supino Inclinado"
  no Push e no Upper eram dois registros sem relação
- erros de digitação virando entidades separadas (`ombos`, `costas` no lugar de
  `bíceps`), impossíveis de agregar
- `personal_records` referenciava `exercicio_id` (a linha por treino), então o
  gatilho comparava o 1RM **só dentro do mesmo treino**: bater 120kg no Push
  depois de 130kg no Upper registrava um "recorde" que não era recorde
- a paleta de comando devolvia um resultado por treino ao buscar "Supino"

Duas tabelas passam a ser a fonte única:

```sql
biblioteca_exercicios (id, nome, grupo_muscular, observacoes)
tipos_treino          (id, nome, descricao)
```

Ambas com **índice único case-insensitive** em `lower(trim(nome))` — é o que
impede a duplicata voltar pela porta da frente. `exercicios_treino` guarda
`exercicio_base_id` (`on delete restrict`: não se apaga um movimento com
histórico) e `treinos.tipo_id` (`on delete set null`: o tipo é rótulo, não
dependência). As colunas de texto foram **removidas**, não mantidas em paralelo
— duas fontes de verdade era exatamente o problema (mesma razão de 10.17).

`personal_records.exercicio_id` virou `exercicio_base_id`, e o gatilho
`trg_registrar_pr()` resolve o exercício base a partir de `exercicios_treino`
antes de comparar com `max(um_rm_estimado)` **de todos os treinos**. O recorde
agora é do movimento, como sempre deveria ter sido.

**Consequência na UI:** `/treino/:exercicioId` recebe o id do exercício **base**
e agrega o histórico de todos os treinos que o usam. Editar nome ou grupo é
função da Biblioteca; editar séries, reps e carga alvo continua no card do
treino, porque esses valores variam legitimamente entre treinos.

### 10.19 Exceção pontual do fluxograma (completa 3.4 / 4.3) — descoberta em uso
O fluxograma guarda **padrão**, não datas: uma linha diz "treino B, terça, 18h" e
vale para toda terça. A recorrência não é materializada (10.5), o que é certo —
mas faltava o meio entre "segue o padrão" e "não existe mais". Quando a realidade
fugia do padrão (viagem, aula cancelada pelo professor, treino feito noutro dia)
as duas saídas eram ruins: deixar o check em aberto, e a frequência da semana
acusar falha; ou apagar a linha do fluxograma, e perder o padrão de todas as
semanas seguintes para consertar uma terça.

`excecoes_fluxograma` já existia desde a Fase 2 com `status in ('cancelado',
'remarcado')`, e `expandirRecorrencia` já lia a tabela. Faltavam três coisas.

**1. `remarcado` não tinha destino.** A tabela tinha a data de origem e o status,
nada mais. Ganhou `nova_data`, `novo_horario_inicio` e `novo_horario_fim`, com
CHECKs que barram os estados incoerentes — remarcado sem destino, cancelado com
destino, horário pela metade, fim antes do início. A regra fica no banco e não só
no formulário: um `remarcado` sem destino gravado por fora seria descartado em
silêncio pela expansão.

**2. Ninguém escrevia.** Não havia botão; o hook `useExcecoes` existia e não era
usado em lugar nenhum. Agora há um menu por ocorrência ("Não vai acontecer",
"Remarcar…", "Voltar ao padrão") no check do dia e no card do treino de hoje.

**3. Quatro telas discordavam.** Das cinco chamadas de `expandirRecorrencia`, só
o calendário passava as exceções. Home, Estudos e Treino caíam no `[]` padrão, e
uma ocorrência cancelada continuaria pedindo check na Home e contando como
prevista na frequência do Treino. Corrigido, e a invalidação de qualquer exceção
atinge as quatro raízes de cache.

**Semântica da expansão mudou.** `remarcado` agora **move** a ocorrência para
`nova_data` em vez de mantê-la na origem sinalizada. Isso exige um segundo
caminho na função: o destino pode cair num dia da semana que a regra não cobre —
é justamente o caso de "treinei quinta em vez de terça" — e o laço por dia da
semana jamais o geraria. Pela mesma razão, a busca filtra por `data` **ou**
`nova_data`: uma ocorrência empurrada de 31/07 para 02/08 tem origem fora de
agosto e precisa aparecer ao olhar agosto.

**Onde o código mora.** Num módulo próprio, `features/fluxograma`, e não em
`estudos` ou `treino`: a tabela é dos dois (`fluxograma_semanal` tem `materia_id`
OU `treino_id`) e deixar a escrita em `estudos` obrigaria a página de Treino a
importar de lá. Na mesma passada, as duas leituras duplicadas da tabela viraram
uma — a de `estudos` estava morta, e a do calendário ignorava as colunas novas.

**Cancelada continua listada, riscada.** Omitir sem deixar rastro tirava o
caminho de volta: cancelar por engano deixaria o dia sem a linha e sem como
restaurá-la. Aparecer riscada também é mais honesto sobre o que houve no dia.

**Horário nulo é intencional.** Quando a remarcação só muda o dia, os horários
ficam nulos e a ocorrência herda o do padrão — assim, mudar o padrão depois
continua valendo para ela. Só grava horário próprio quem de fato mexeu no campo.

### 10.20 Calendário: agenda no lugar da grade (reestrutura 6.1 / 6.2) — descoberta em uso
A grade de mês respondia a pergunta errada. Grade serve para **agendar**, isto é,
achar espaço livre — e aqui nada é agendado em espaço livre: a rotina está fixa no
fluxograma e prova, conta e marco chegam com data colada. A pergunta real é "o que
vem, e onde a semana aperta".

Quatro problemas concretos da grade:

1. **Peso visual igual para rotina e prazo.** Cerca de 20 ocorrências de aula e
   treino por semana contra 1 ou 2 prazos, todas como bloco sólido colorido. É o
   mesmo defeito que a Home tinha (a prova afogada na rotina), mas estrutural.
2. **`dayMaxEvents` cortava por ordem de inserção**, então a prova tinha a mesma
   chance de cair no "+2" que o terceiro treino.
3. **Sono como `display: background`** tingia a célula inteira na vista de mês;
   só funcionava na semana.
4. **Chips de camada eram filtro, não informação** — não diziam nada até o
   clique. E "Aulas e provas" numa camada só impedia separar rotina de prazo,
   distinção que `TipoEvento` já carregava no dado.

**Regra de apresentação nova: cor marca a camada, peso marca a natureza.** Rotina
é filete na cor do pilar, sem preenchimento; prazo é preenchimento sólido; sono é
tinta ao fundo. Derivada de `ehImportante()`, que já existia. Vale na agenda e
também na grade de mês.

**Estrutura.** A vista padrão é a semana: uma faixa de carga por cima e uma agenda
com uma linha por dia abaixo. A faixa separa em dois eixos o que a grade misturava
— **altura** da barra é tempo já comprometido pela rotina, segmentado por pilar;
**marca acima** é o que vence no dia. Clicar num dia da faixa leva a agenda até
ele. A grade de mês continua disponível, atrás de um botão.

**Dois sinais a mais na faixa**, ambos só para dias passados, porque marcar o
futuro como falha seria mentira: um traço quando o sono ficou abaixo da meta, e um
anel quando havia rotina prevista e o check não saiu. São formas e não cores — no
tema claro `--sono` e `--status-atencao` são o mesmo hex, então cor ali não
distinguiria nada.

**`origemId` em `EventoCalendario`.** O id do evento é composto
(`fluxograma:regra:data`); a faixa precisa do id da regra, que é o que
`conclusoes_fluxograma` referencia. O campo existe para ninguém precisar fatiar o
id composto de volta.

**Ganho de bundle.** O FullCalendar saiu para um módulo próprio carregado por
`React.lazy`: a página caiu de 67,8 kB para 4,3 kB gzip, e os 66,5 kB só descem
para quem abre a vista de mês.

**`PainelImportantes` foi removido.** A agenda mostra prazo antes da rotina em cada
dia, então o painel repetia a mesma resposta na mesma página. A Home segue com
`eventosComPrazo` para a versão de relance.

**Consulta condicional.** `useFontesCalendario` ganhou `comCarga`, desligado por
padrão: a Home usa o mesmo hook e as duas consultas da faixa seriam requisições
por nada. Ficam fora da lista de `carregando` quando desligadas — query
desabilitada permanece `pending` no React Query, e contá-la deixaria a página
carregando para sempre.

### 10.21 Sessão de treino: gravação série a série e histórico (completa 4.3) — descoberta em uso
Dois problemas relatados no uso real, com a mesma raiz.

**1. O progresso se perdia.** A sessão inteira ficava em estado do React até um
botão final. Anotar duas séries e sair do app — o que acontece com o celular na
mão, na academia — perdia tudo. Pior: ao voltar, o app abre na Home e não havia
sinal nenhum de que ficara algo pela metade.

**2. Não havia como ver os treinos da semana.** A frequência dizia "3 de 4" e
mais nada: nem qual treino foi feito, nem com que carga. As séries estavam no
banco desde a Fase 3, mas `listarSeries` não devolvia `execucao_treino_id`, então
agrupá-las por sessão era literalmente impossível — chegavam soltas com a data, e
como não há unique em `(treino_id, data)`, dois treinos no mesmo dia viravam uma
massa indistinguível.

**A gravação virou série a série.** Cada série vai para o banco quando você
confirma. A sessão nasce na **primeira** série gravada, não ao abrir o diálogo:
criação preguiçosa evita lixo no banco quando alguém abre e fecha, e faz "em
andamento" significar "tem pelo menos uma série" — o único estado em que retomar
faz sentido.

**`finalizado_em` era obrigatório.** Com a linha nascendo no começo, ela passa a
significar "comecei" e não "terminei". Sem a coluna, um treino abandonado no meio
contaria como treino feito na frequência da semana. Nulo = em andamento, e só as
finalizadas contam. As execuções que já existiam foram preenchidas com
`created_at` no backfill — sem isso apareceriam todas como em andamento e sairiam
da contagem.

**Índice único garante uma sessão aberta por vez:**
`create unique index on execucoes_treino ((finalizado_em is null)) where
finalizado_em is null` — índice sobre uma expressão que é sempre `true` nas linhas
do predicado é o idioma para "no máximo uma linha assim". Duas sessões abertas não
significam nada: você treina uma coisa de cada vez, e duas tornariam ambíguo qual
o aviso de "continuar" deve retomar.

**Ganhos de brinde.** O gatilho de PR dispara a cada série inserida, então o
recorde fica gravado no instante em que aconteceu. E `created_at` até
`finalizado_em` dá a **duração do treino**, que antes não existia. A duração
subestima de propósito: conta da primeira série, não do aquecimento — é o único
instante que o banco conhece, e inventar um início seria pior que informar menos.

**Aviso em vez de restaurar rota.** A Home mostra "Treino B em andamento · N
séries salvas · Continuar" quando há sessão aberta, e nada quando não há.
Restaurar a última rota desorienta — você abre o app e está numa tela que não
pediu; o aviso diz o que ficou pendente e deixa a decisão com o usuário.

**Bug que a mudança quase introduziu.** O efeito que monta as linhas do diálogo
dependia da sessão carregada, e cada série gravada invalida a query — o efeito
rodaria de novo e reconstruiria todas as linhas, apagando o que estivesse sendo
digitado na série seguinte. O estado do banco passou a ser carregado **uma vez por
abertura**, e depois só `gravar` e `desfazer` mexem nas linhas, que já sabem qual
mudou.

**Código morto removido.** `useRegistrarSessao` e `api.registrarSeries`
implementavam o fluxo de submeter tudo de uma vez, que deixou de existir.

### 10.22 Pular exercício e sair da sessão (corrige 10.21) — descoberta em uso
Três problemas, os dois últimos introduzidos pela própria 10.21.

**1. Não havia como pular um exercício.** Acontece: a máquina está ocupada, o
ombro doeu, o tempo acabou. Sem registro, as linhas do exercício ficavam em branco
parecendo pendência, e o contador mentia — "9 de 12" ao fim de um treino em que
você pulou de propósito lê como trabalho deixado pela metade.

Resolvido com `execucoes_pulados (execucao_treino_id, exercicio_id)`. Tabela em vez
de estado local porque a sessão foi feita para ser abandonada e retomada: um pulo
que evapora ao fechar o app contradiz isso. Presença = pulado, como em
`conclusoes_fluxograma` (10.15); desfazer apaga a linha em vez de gravar `false`.

Como fato registrado, o pulo é informação: aparece no histórico e abre caminho para
"pulei este exercício nas últimas três sessões", que é sinal de que ele não está
funcionando no treino.

**Regra no banco, não só no formulário.** Um gatilho recusa a marca quando já
existe série gravada para aquele exercício na sessão: fez 2 de 4 não é "pulado", é
"fez 2 de 4", e as duas coisas juntas apareceriam no histórico como feito e pulado
ao mesmo tempo. A leitura em `sessoesRealizadas` também prefere a série à marca, de
forma que um dado incoerente nunca chegue à tela.

**2. `useSalvarSerie` não tinha rollback.** O `useRegistrarSessao` removido na
10.21 desfazia a execução quando as séries falhavam; a versão nova não levou isso.
Se o insert da série falhasse depois da sessão criada, sobrava sessão aberta e
vazia — e, como o banco só admite uma aberta, ela travava o início de qualquer
outro treino. `usePularExercicio` nasceu com o mesmo cuidado.

**3. Não havia saída para a sessão sem séries.** "Finalizar" exige ao menos uma
série gravada, então desfazer a última série deixava a sessão presa: nem finalizava
nem desaparecia, e bloqueava todos os outros treinos. Agora há "Descartar" no
diálogo e no aviso da Home.

### 10.23 Horário da sessão, lista de lançamentos e forma de pagamento — descobertas em uso

**Horário real do treino.** O fluxograma dizia 18h; o treino aconteceu às 11h. São
dois fatos e o segundo não tinha onde morar: `data` guarda só o dia, e `created_at`
é quando a primeira série foi gravada — não é editável, e nas sessões registradas
antes da 10.21 era o instante do envio do formulário, não do treino. Coluna
`hora_inicio time`, editável no diálogo e no histórico, anulável porque a maioria
dos registros não vai informar e inventar um horário seria pior que não ter.

Não confundir com remarcar a ocorrência (10.19): aquilo muda o **plano** daquela
data; isto registra a **realidade** da sessão. As duas coisas são úteis e
independentes.

**Lista de lançamentos.** O Financeiro tinha a mesma assimetria que o Treino tinha:
o total do mês e o anel por categoria existiam, mas ver os lançamentos exigia entrar
numa categoria por vez. Faltava responder "o que gastei esta semana", "quanto gastei
com X em Y período" e "onde está aquele lançamento" — a pergunta "onde foi o dinheiro
este mês" já era respondida pela grade de categorias, então a lista não a repete.

Página própria (`/financeiro/lancamentos`) e não card no painel: o Financeiro já é a
tela mais densa do app, e cinco filtros somados a ela ficariam impraticáveis no
celular. No painel ficou um resumo com os cinco últimos apontando para lá — e ele não
custa consulta nenhuma, porque os lançamentos do mês **já eram buscados** para
calcular o gasto de hoje e descartados em seguida.

Agrupada por dia, com saldo por dia. Filtros de período (com presets), categoria,
entrada/saída, forma de pagamento e busca na descrição — todos no Postgres e não no
cliente, porque a tabela cresce todo dia e filtrar no cliente obrigaria a baixar o
ano inteiro para exibir uma semana.

**Truncamento silencioso corrigido.** `listarLancamentosDaCategoria` tinha
`limite = 50` fixo. Com 8 lançamentos ninguém nota; com um ano de uso a página da
categoria mostraria os últimos 50 e sumiria com o resto **sem avisar** — histórico
truncado que parece completo.

**Forma de pagamento fechada.** Era texto livre digitado a cada lançamento, o mesmo
problema que a biblioteca de exercícios resolveu (10.18): "Débito", "debito" e
"Débito " viram três formas distintas e nenhum filtro agrupa. Virou conjunto fechado
— débito, crédito, dinheiro, pix — com CHECK no banco e Select na tela.

CHECK em vez de tabela de referência: são quatro valores que não mudam, sem atributo
nenhum além do nome, e ninguém precisa cadastrar uma quinta forma. Tabela aqui seria
cerimônia sem ganho — o oposto de `biblioteca_exercicios`, onde o cadastro é do
usuário e cresce. Os valores gravados são slugs sem acento; o rótulo existe só para
a tela. O dado existente (`Débito`) foi normalizado no migration.

### 10.24 Editor da sessão e duração informada (corrige 10.21 / 10.23) — descoberta em uso

**A duração estava errada nas duas sessões reais.** Ela era derivada de
`finalizado_em - created_at`, e esses timestamps medem quanto tempo se passou
**registrando**, não treinando. Só coincidem quando a sessão é anotada série a
série, ao vivo, do começo ao fim. No banco: a sessão de Push marcava **0 min** (é
registro em lote pré-10.21, onde o backfill fez `finalizado_em = created_at`) e a
de Pull marcava **18 min** para um treino feito horas antes. Número errado é pior
que nenhum.

Virou coluna `duracao_minutos int`, informada pelo usuário, com CHECK `> 0`. Nulo =
não informada, e a tela mostra **"—"**. O intervalo de registro continua calculado
e exibido, mas rotulado como o que é: *"registrado em 18 min"*, nunca como duração
do treino. `SessaoRealizada` carrega os dois campos separados de propósito —
`duracaoMinutos` e `spanRegistroMinutos` — para que nenhum código futuro confunda
os dois de novo.

**Um editor, não dois.** O `DialogExecucao` ganhou `execucaoIdEdicao`: com esse id
ele carrega uma sessão já finalizada em vez da aberta, e passa a editar data,
horário, duração e as séries — corrigir carga, apagar série, marcar pulado. As duas
telas precisam exatamente das mesmas ações, e um segundo editor divergiria do
primeiro na primeira mudança.

Consequências de virar editor:

- **A data destrava em modo edição.** Durante a sessão em andamento ela fica travada
  (mudá-la moveria séries que estão sendo gravadas para outro dia); editando o
  histórico, mover a sessão de dia é justamente o conserto de quem lançou errado.
- **"Finalizar treino" vira "Fechar".** Não há o que finalizar numa sessão
  finalizada.
- **"Descartar" vira "Excluir sessão".** Mesma ação, mas apagar um rascunho e apagar
  um treino do histórico não merecem o mesmo rótulo.
- **`outroTreinoAberto` não bloqueia edição.** Editar uma sessão do passado não
  conflita com a sessão aberta de outro treino.
- `atualizarHoraSessao` virou `atualizarSessao`, com data, horário e duração num
  update só.

### 10.25 Lançamento rápido sem saída no mobile (corrige 2.5 / Bloco D) — descoberta em uso

O lançamento rápido de despesa foi desenhado em duas interações: digitar o valor e
apertar Enter. **No celular ele não salvava nunca**, e o celular é onde o
lançamento mais acontece.

Duas causas somadas, ambas no mesmo componente:

- `inputMode="decimal"` abre o **teclado numérico**, que tem dígitos, separador e
  backspace — e **não tem tecla de retorno**. O `onKeyDown` que escutava `Enter`
  estava correto; nunca era acionado porque não existia tecla para emitir o evento.
- O input estava solto dentro de uma `<div>`, **sem `<form>`**. Sem formulário o
  navegador não pode oferecer a tecla de ação ("Ir"/"Enviar"), porque esse
  mecanismo *é* a submissão implícita de formulário. `enterKeyHint` sozinho também
  não teria efeito: ele rotula uma ação que precisa existir.

E não havia botão de salvar nenhum no card — a única affordance era o rótulo
"Enter para lançar hoje", uma instrução impossível de cumprir no aparelho. No
desktop funcionava, o que é o que fez isso passar despercebido.

A correção não é "fazer o Enter funcionar": no teclado numérico ele não existe.

- O conteúdo virou `<form onSubmit>`, o que restaura a submissão implícita onde há
  tecla, e o `onKeyDown` manual saiu — o formulário já faz esse trabalho.
- **Botão "Lançar hoje" visível no mobile** (`sm:hidden`), alvo de 44px, que é a
  affordance real de toque. A dica de teclado passou a `hidden sm:flex`: "Enter"
  só é verdade onde existe um Enter.
- `enterKeyHint="go"` rotula a tecla de ação nos teclados que têm uma.
- O botão desabilita quando o valor não dá número positivo ou não há categoria — a
  mesma guarda que `salvar()` já aplicava, agora visível antes do toque em vez de
  falhar em silêncio depois dele.

### 10.26 A vírgula do teclado brasileiro (corrige 2.5 / 3.3 / 4.3) — descoberta em uso

Todo campo decimal era `<input type="number">`, lido com `Number(...)` ou
`valueAsNumber`. **Para um `type="number"` a vírgula é caractere inválido**: o
navegador descarta a entrada, `.value` vira `''` e `valueAsNumber` vira `NaN`.

O teclado numérico do celular em português oferece **vírgula** como separador
decimal. Então digitar 87,5 resultava em campo vazio para o código — e o
formulário reprovava com "Informe um valor" tendo o número na tela. Pior caso
possível de bug: **funciona na máquina de quem programa e falha no aparelho de
quem usa**, porque o Chrome localiza a entrada de campos numéricos e o Safari
não. Não é um bug de uma tela; é do tipo do campo.

Dez campos afetados, todos com separador decimal:

| Campo | Onde |
| --- | --- |
| Valor do lançamento | `DialogLancamento` |
| Meta da categoria | `DialogCategoria` |
| Valor do investimento | `DialogInvestimento` |
| Planejamento semanal | `GradePlanejamentoSemanal` |
| Peso corporal | `SecaoCorporal` |
| Nota, nota manual e peso da avaliação | `AbaAvaliacoes` |
| Carga planejada | `DialogExercicio` |
| **Carga da série** | `DialogExecucao` |

O último é o mais grave: é o campo digitado de pé na academia, e a série
simplesmente não gravava.

**A correção, em fonte única.** `lib/numeros.ts` com `parseDecimal` e
`formatarDecimal`, com teste (15 casos), e os campos passaram a `type="text"` com
`inputMode="decimal"` — que mantém o teclado numérico e deixa a vírgula chegar até
o parse. Perde-se o spinner do desktop, e ele não faz falta: ninguém ajusta uma
despesa de centavo em centavo pela setinha.

Regras de `parseDecimal`, na ordem, porque separador em português é ambíguo:

1. **Tem vírgula** → vírgula é decimal, pontos são milhar: `1.234,56` → `1234.56`.
2. **Só pontos em grupos de três** → é milhar: `1.500` → `1500`. Sem esta regra,
   mil e quinhentos digitado do jeito brasileiro lançaria **R$ 1,50** — erro de
   mil vezes, em silêncio, num app de finanças.
3. **Qualquer outro ponto** → decimal: `87.5` → `87.5`.

Vazio devolve `NaN`, não `0` como faria `Number('')`: zero é valor legítimo em
vários desses campos, e confundir "não informado" com "zero" esconderia dado — a
mesma regra da resolução 10.24.

`CampoDecimal` guarda o **texto** digitado, não o número. Sem isso "12," passaria
por número e voltaria como "12", apagando a vírgula debaixo do dedo a cada tecla.
A sincronização com o valor de fora compara pelo número justamente para não
reescrever o campo no meio da digitação.

**Os campos inteiros ficaram como estavam** (séries, reps, RPE, descanso, duração,
faltas, total de exercícios da lista): inteiro não tem separador, então não tem o
problema, e mantêm o spinner do desktop.

### 10.27 A lista de lançamentos era invisível no mobile (corrige 10.23) — descoberta em uso

A lista de lançamentos foi pedida de novo, como se não existisse. Ela existia desde
a 10.23, e completa: lista agrupada por dia com saldo do dia, período por preset ou
intervalo livre, filtros de categoria, natureza, forma de pagamento e busca, e
totais do que está filtrado. O problema não era o que faltava construir — era que
**ela não era alcançável nem legível no celular**.

**Um único caminho no app inteiro.** Varredura do `src`: `/financeiro/lancamentos`
aparecia em dois lugares, a rota em `App.tsx` e um link em
`SecaoUltimosLancamentos`. Esse link era o "Ver todos" `size="sm" text-xs` na quina
do cabeçalho de um card do painel. A barra inferior do mobile tem os seis pilares e
nenhum caminho para lá; a paleta de comando navegava só sobre `ITENS_NAVEGACAO`,
os mesmos seis. No celular, chegar na página exigia entrar no Financeiro, rolar até
o card certo e acertar um alvo de texto pequeno no canto.

**A página abria mostrando o formulário, não a lista.** O card de filtros é
`grid gap-3 sm:grid-cols-2 lg:grid-cols-4` — no mobile, coluna única com **sete
campos**: Período, De, Até, Categoria, Tipo, Forma de pagamento e Busca. Somando
~54px por campo com label mais os gaps dá ~450px, e com o `PageHeader` (~130px, com
as ações quebrando para a própria linha), o card de totais (~80px) e a barra
superior (48px), são **~700px antes do primeiro lançamento** numa tela útil de ~660
a 750px. A tela cujo propósito é a lista abria mostrando uma busca. De novo o padrão
das resoluções 10.25 e 10.26: correto no desktop, onde `lg:grid-cols-4` resolve em
duas linhas, e quebrado na tela pequena.

**Nada foi reconstruído.** A lista e a lógica de filtro estavam boas.

- **Filtros recolhidos no mobile**, com o Período sempre à vista porque é o que mais
  muda. Botão "Filtros" com **contador dos escondidos que estão valendo** — sem o
  contador, uma lista curta pareceria "não gastei nada" quando há um filtro de
  categoria ligado que não aparece em lugar nenhum. Período livre conta, porque De e
  Até também moram no bloco. Escolher "livre" abre o bloco: pedir intervalo próprio
  e não ter onde digitar a data seria um beco.
- De `sm:` para cima **nada muda** — os campos estão todos à vista e o botão de
  abrir não existe. A implementação esconde cada campo com `hidden sm:block` em vez
  de agrupá-los num container, justamente para a grade do desktop ficar idêntica.
- **Três caminhos até a página**, no lugar de um: entrada na paleta de comando, o
  cabeçalho do card "Últimos lançamentos" inteiro clicável (alvo grande no lugar
  onde o olho já está, em vez do texto na quina) e um botão no `PageHeader` do
  painel.
- `SUBPAGINAS` em `lib/pilares.ts` guarda as páginas que não são pilares. Ficam
  **fora** de `ITENS_NAVEGACAO` de propósito: aquela lista alimenta a barra inferior,
  que já tem seis alvos numa faixa — um sétimo apertaria todos.

### 10.28 Exclusão sem confirmação e alvo de toque (corrige 10.1 em diante) — descoberta em uso

`DialogConfirmarExclusao` existia e era usado nas entidades "pai" com cascata —
categoria, matéria, treino, projeto, sessão. A doc dele dizia, textualmente, que
"para exclusões simples (uma linha sem filhos) o botão direto sem confirmação
continua sendo usado". **A regra estava errada.**

O que distingue os casos não é o tamanho da cascata — é ser irreversível, e todos
são: o sistema não tem desfazer nem lixeira. Um lançamento, uma falta ou uma série
apagados por engano não voltam. E no celular o argumento é mais forte: esses botões
vivem em linhas apertadas, colados no de editar, tocados com o polegar enquanto a
lista rola.

**Quatorze exclusões disparavam `mutate` direto**, sem confirmação:

| O que apagava | Onde |
| --- | --- |
| Lançamento | `CategoriaDetalhePage` |
| Investimento | `SecaoInvestimentos` |
| Avaliação, falta, lista, sessão de estudo, **documento** | `AbaAvaliacoes`, `AbaFaltas`, `AbaListas`, `AbaSessoes`, `AbaDocumentos` |
| Registro de lesão, registro corporal, exercício do treino | `SecaoLesoes`, `SecaoCorporal`, `TreinoPage` |
| Marco, registro do diário | `ProjetoDetalhePage` (dois) |
| Horário de aula e fluxograma de treino | `GradeFluxograma`, pelos dois chamadores |

Dois casos pediam atenção além da confirmação:

- **O documento apaga arquivo, não linha.** O objeto sai do Storage e não há como
  reenviá-lo pelo app. Era o único da lista que destruía dado fora do Postgres, e
  era um toque sem pergunta.
- **O do `GradeFluxograma` era invisível no celular.** `size-5` (20px) com
  `opacity-0 group-hover:opacity-100`: desenhado para mouse e quebrado no toque das
  duas pontas — no celular não existe hover, então o alvo ficava invisível mas
  clicável, com metade da régua do dedo. Apagar por acidente um horário que não se
  vê é o pior arranjo possível. Agora aparece sempre no mobile com 44px e volta ao
  hover de `sm:` para cima, onde o mouse existe e o ícone permanente poluiria a
  grade. Ganhou `group-focus-within` junto: quem navega por teclado também precisa
  vê-lo.

**Alvo de toque.** O trigger padrão passou de `size-9` (36px) para **`size-11`
(44px)** no mobile, a régua do HIG, voltando a 28px de `sm:` para cima. Os botões de
editar que dividem a linha com um de excluir subiram junto — um alvo de 44px ao lado
de um de 36px fica torto, e o de editar é tocado pelo mesmo dedo. `SecaoCorporal`
tinha `size-6` (24px), alvo de mouse posto numa lista de toque.

**Consequência aceita:** na tabela de lançamentos da categoria, o alvo maior faz a
coluna de ações ocupar 84px de um card de ~296px, apertando a descrição. É mais um
argumento para essa tabela virar lista de cards — alvo de dedo não cabe em coluna de
tabela.

### 10.29 Diálogo vira folha ancorada embaixo no mobile (corrige 10.21) — descoberta em uso

Todo formulário do app é o mesmo `DialogContent`: centralizado, `max-w-sm`, com a
rolagem no próprio container. No celular isso produzia três sintomas que pareciam
separados e tinham **uma causa só** — o conteúdo estava preso ao meio da tela:

1. **O X rolava junto com o conteúdo** e desaparecia em formulário longo (era uma
   limitação registrada). A rolagem estava no mesmo elemento em que o botão de
   fechar era `absolute`.
2. **Abrir o teclado fazia o diálogo saltar.** `-translate-y-1/2` recalcula a
   posição a partir do centro, e o viewport cai para ~400px com o teclado aberto.
3. **Os botões ficavam no meio da tela**, que é onde a mão que segura o aparelho não
   alcança.

De `sm:` para cima nada muda — lá o diálogo centralizado está certo, há mouse e a
tela é grande. No mobile ele virou **folha ancorada na borda de baixo**, largura
cheia, cantos arredondados só em cima, `max-h-[90dvh]`, entrando de baixo para cima.

O que isso resolve, na ordem dos sintomas:

- A rolagem desceu para um `div` interno (`data-slot="dialog-body"`), então o
  container ficou fixo e **o X não rola mais** — medido com Playwright: depois de
  rolar 500px o botão continuou em `y=169`. O `p-4` desceu junto com a rolagem, o
  que mantém o `-mx-4 -mb-4` do `DialogFooter` funcionando, porque ele continua
  cancelando o padding do pai direto.
- Ancorada embaixo, a folha **cresce para cima**: o teclado empurra em vez de
  reposicionar, e a borda inferior é a borda da tela.
- O rodapé passou a encostar embaixo, onde o polegar já está, e os botões dele
  ganharam 44px de altura no toque — o botão padrão tem 32px, que é alvo de mouse.
  **É isto que fecha o item da ação primária longe do polegar**: a ação repetida do
  app mora em diálogo, não em `PageHeader`.
- O X foi para 44px, com `pr` no `DialogHeader` para o título não passar por baixo.
- `pb` com `env(safe-area-inset-bottom)` no container: a folha encosta na borda, e
  sem isso a última linha ficava atrás da barra de gesto do sistema.

**Sem gesto de arrastar para fechar.** Fecha por Esc, clique fora e pelo X de 44px.
Arrastar exigiria dependência de gesto (`vaul`), e não vou acrescentar dependência
sem combinar. Por isso também **não tem alcinha** no topo da folha: alcinha promete
um gesto, e prometer um gesto que não existe é pior que não ter o desenho.

**Verificado no navegador**, não por leitura: viewport de iPhone 13 (390×664), folha
em `y=161` com 390×503, encostando embaixo, largura cheia; e no desktop de 1280 o
diálogo continua centralizado (`x=448`, largura 384, centro em 640). Foi essa
verificação que revelou o crash da paleta de comando, corrigido em commit próprio.

### 10.30 Tabela vira lista no mobile (corrige 10.23 / 3.3) — descoberta em uso

Sobraram duas tabelas no app, e as duas mostravam **menos** no celular do que no
desktop. O mecanismo era o mesmo: `TableCell` tem `whitespace-nowrap` global, então
para caber em ~296px cada página escondia coluna e truncava texto.

**Lançamentos da categoria — a tabela foi apagada e a lista reaproveitada.**

A `ListaLancamentos` da página de lançamentos já resolvia tudo isso: agrupa por dia
com saldo, filete na cor da categoria, descrição com a largura toda. Manter uma
tabela própria aqui era uma segunda lista do mesmo dado — e duas divergem na primeira
mudança. Ganhos concretos:

- a descrição saiu de ~80px truncados para a largura da linha, **quebrando em mais de
  uma linha em vez de cortar** — o `truncate` foi trocado por `break-words`. Medido no
  navegador: "Almoço foi mais caro do que o esperado pois a promoção do restaurante
  terminou" aparece inteiro, onde antes se lia "Almoço f…";
- a **forma de pagamento voltou no mobile** (era `hidden sm:inline`);
- ganhou agrupamento por dia com saldo, que a tabela não tinha.

`ListaLancamentos` ganhou exclusão — que a tabela tinha e ela não — mais
`ocultarCategoria`, porque repetir o nome da categoria em toda linha dentro da
própria categoria só gasta a largura que a descrição precisa. A consulta da categoria
devolve `Lancamento` sem os campos da categoria; eles são preenchidos a partir da
`categoria` que a página já tem em mãos, em vez de outra consulta ao banco.

**Avaliações — uma lista só, não tabela no desktop e lista no mobile.**

A tabela tinha cinco colunas; a **data** era escondida com `hidden sm:table-cell` e o
nome truncava em `max-w-0`. Esconder a data era pior do que parecia: é ela que diz se
a prova já aconteceu, o que **muda o sentido de um campo de nota vazio**. Sem ela, "P2
sem nota" (prova em setembro, normal) e "Trabalho sem nota" (entregue em julho,
pendência) apareciam idênticos.

A linha agora empilha nome-e-peso em cima, data embaixo, com o campo de nota e o
excluir à direita — e é **a mesma marcação nas duas larguras**, não duas versões que
divergiriam. Nota vazia em avaliação cuja data já passou ganhou um **"sem nota"** em
cor de atenção; em avaliação futura, nada, porque ali é o estado normal.

**Verificado no navegador** com dado temporário inserido e apagado em seguida
(asserção de limpeza: 0 linhas restantes). Nas duas páginas: nenhuma `<table>` no DOM
e **zero** de rolagem horizontal no documento.

**Consequência:** `components/ui/table.tsx` ficou sem nenhum uso. Não apaguei — é
primitivo do design system, e removê-lo é decisão de quem mantém o sistema, não efeito
colateral desta mudança.

### 10.31 A agenda mostrava o plano e nunca o fato (corrige 6.1 / 10.20) — descoberta em uso

Ele registrou um treino, desmarcou o previsto, e a agenda ficou sem nenhuma linha de
treino no dia: **parecia que ele não tinha treinado.** O dado estava íntegro; o
calendário é que não tinha como contá-lo.

`construirEventos` tinha cinco fontes — avaliações, fluxograma, contas, sono e
marcos. **Nenhuma lia `execucoes_treino`.** A agenda era uma projeção do fluxograma,
então:

- cancelar a ocorrência prevista removia a **única** linha de treino da quarta, e
  cancelar estava certo (ele não fez Legs);
- o Pull que ele fez, com 14 exercícios gravados, **não tinha por onde entrar**.

No banco, em 05/08: previsto Legs 18:00–19:00, exceção `cancelado` para Legs, e
execução de Pull finalizada com `hora_inicio` 11:00. A agenda mostrava zero.

Não é bug de dado, e dois números continuavam certos: a **frequência da semana**
conta execuções finalizadas (10.21), então o pilar Treino sabia do treino; e
`conclusoes_fluxograma` está vazia e só é escrita pelo Estudos, então "treinei" tem
**uma** fonte só — não havia armadilha de fonte dupla a desfazer, só uma fonte de
evento a acrescentar.

**Três fontes novas**, mais uma regra de reconciliação:

- `eventosExecucoesTreino` — só sessões **finalizadas**, porque treino abandonado no
  meio não é treino feito (mesma regra da frequência). A hora vem de `hora_inicio`,
  **informada pelo usuário**; quando é nula o evento é de dia inteiro. Derivar hora de
  `finalizado_em` seria repetir o erro da 10.24: no banco real, o Push de 04/08 teria
  ganhado um falso "08:09" que é quando o *registro* terminou.
- `eventosSessoesEstudo` — sempre dia inteiro, porque `sessoes_estudo` não guarda
  hora nenhuma. A duração vai no título ("Cálculo II · 90 min").
- `eventosCancelados` — o que foi desmarcado, **só em dias que já chegaram**. No
  futuro, desmarcado é fora do plano, e riscar o que não vai acontecer é ruído.
  Não reaproveita `expandirRecorrencia`: aquela função **omite** a cancelada de
  propósito, e é disso que a frequência (10.17) e a faixa de carga dependem. As
  exceções são lidas direto aqui.
- **Reconciliação:** previsto e realizado do mesmo treino no mesmo dia dão **uma**
  linha, a realizada — ela é o fato e carrega a hora informada. Sem isso, todo dia
  normal mostraria o treino duplicado.

`EventoCalendario` ganhou `estado?: 'feito' | 'cancelado'`. Ausente segue sendo o
padrão: rotina prevista, sem informação de desfecho.

Na agenda: feito ganha **✓** antes do filete; cancelado fica riscado, com o filete a
40% e o rótulo **"cancelado"** em texto — o risco sozinho não serve para leitor de
tela, e nada é transmitido só por cor.

**Regressão que eu mesmo criei e só apareceu na tela.** `cargaPorDia` calcula a barra
a partir da lista de eventos, então os novos entraram nela e produziram dois erros:

- o `cancelado` carrega o horário do padrão, e passou a somar **1h de "tempo
  comprometido"** num dia em que nada foi comprometido;
- o `feito` ligava `temRotina` e, como o `origemId` dele é o `treino_id` e não o id da
  regra, nunca casava com `conclusoes` — a terça, dia em que o treino **aconteceu**,
  ganhou o anel de "rotina sem check".

A barra mede tempo que a **rotina** compromete, uma projeção; desfecho não entra.
Evento com `estado` é ignorado em `cargaPorDia`, com teste para os dois casos.

**Consequência aceita:** a barra de carga não mostra o tempo do treino realizado (são
45 min informados na quarta). Misturar plano e fato na mesma barra é outra decisão, e
não foi pedida — a barra continua respondendo "quanto a rotina compromete".

**Verificado no navegador** contra o dado real: a quarta passou a ler
`✓ 11:00 Pull` + `18:00 Legs (cancelado)`, a terça mostra `Push` sem hora em vez de
uma hora inventada, o anel saiu da terça e a quarta deixou de somar 1h.

### 10.32 Metas — meta unificada entre pilares (spec própria) — feature nova

Hoje "meta" existia fragmentada e sem lugar único: `categorias.meta_mensal`
(Financeiro), `marcos_projeto` (Projetos), `personal_records` (Treino) — nada em
Estudos ou Sono, e nenhuma tela mostrava tudo que o usuário está perseguindo
independente do pilar.

Nova tabela `metas` (um dado, 4 formas via `tipo`: `numerica`, `marco`, `habito`,
`livre`) + `metas_checkins` (check-in diário de hábito, presença = feito, no mesmo
espírito de `conclusoes_fluxograma`/`execucoes_pulados`). No máximo uma FK de pilar
(`categoria_id`/`materia_id`/`tipo_treino_id`/`projeto_id`) por linha, checado na
aplicação — `metas.valor_alvo` é **independente** de `categorias.meta_mensal`, o
vínculo só serve para buscar o progresso real, nunca para herdar o alvo.

Progresso de meta numérica linkada vem da função `progresso_meta()` (RPC), que
espelha `progresso_categoria`/`calcular_media_materia`: soma `lancamentos` da
categoria, `sessoes_estudo.duracao_minutos` da matéria, contagem de
`execucoes_treino` do tipo, ou % de `marcos_projeto` concluídos — sempre entre
`data_inicio` (coluna própria, não `criada_em::date`, que resolveria no timezone do
servidor) e `data_alvo` (ou hoje, se `data_alvo` for nulo). Meta numérica sem link
usa `valor_atual_manual`, editado direto no card. Meta de hábito calcula streak e
progresso da semana client-side, puro e testado (`features/metas/calculos.ts`).

Sem rota nova, sem item em `BottomNav`/`Sidebar` — vive inteira como seção na Home
(`SecaoMetas`), com destaque das ~4 metas mais próximas do prazo e "Ver todas"
abrindo lista em tela cheia (`DialogListaMetas`).

**Pendência de processo encontrada depois do merge:** a migração
(`20260805000007_metas.sql` + ajustes em `20260805000008_metas_ajustes.sql`) tinha
sido aplicada direto no banco, sem passar por `apply_migration` — o schema estava
certo, mas o histórico de migração do Supabase não sabia disso. A próxima
`db push` teria tentado reaplicar `000008`, que não é idempotente (`add column`
sem `if not exists`), e quebraria em "column already exists". Reparado inserindo as
duas linhas correspondentes em `supabase_migrations.schema_migrations` — nenhum
dado ou schema mudou, só o rastro.

### 10.33 Metas reproduzia a vírgula do teclado brasileiro (corrige 10.26) — descoberta em uso

O campo "Alvo" de `DialogMeta` e a edição rápida de `valor_atual_manual` em
`CardMeta` usavam `<input type="number">` + `valueAsNumber` — exatamente o bug da
10.26: no teclado numérico em português o separador é vírgula, `type="number"`
rejeita, e o campo chega vazio ao formulário. A ironia é que `CampoDecimal`
(`components/CampoDecimal.tsx`) e `lib/numeros.ts` foram criados **na mesma leva de
mudanças** que trouxe Metas, e já estavam em uso em `DialogLancamento`,
`DialogCategoria`, `DialogInvestimento` — só não chegaram aos dois campos de Metas.

Trocado nos dois lugares por `CampoDecimal`. Na edição rápida do card, o commit
continua só no blur (como antes) — `CampoDecimal` chama `onValorChange` a cada
tecla, e mutar a cada tecla faria uma requisição por caractere digitado; o valor
digitado fica num ref até o campo perder o foco.

**Verificado no navegador:** digitar `87,5` no campo Alvo mantém a vírgula na tela
(antes ficaria vazio) e grava `87.5` no banco; digitar `45,2` na edição rápida do
card grava `45.2` só ao sair do campo. `frequencia_alvo` (vezes por semana)
continua `type="number"` — é inteiro, sem separador, fora da regra da 10.26.

### 10.34 Meta numérica ganha vínculo com peso corporal — feature nova

Ele criou uma meta "Perder 12kg" e vinculou a um **tipo de treino** — a única
opção disponível que parecia próxima de Treino. O vínculo com tipo de treino
calcula **contagem de sessões concluídas**, não peso: a meta ia mostrar
"2 / 12 Kg" onde 2 é número de treinos, sem relação nenhuma com quilos perdidos.
Não existia vínculo com `registro_corporal` porque essa tabela não é uma entidade
escolhível como categoria/matéria/tipo de treino/projeto — é peso ao longo do
tempo, uma linha por dia, sem FK para nada.

Vínculo novo: `metas.usa_peso_corporal boolean`, não mais um `uuid references` —
não há "qual" registro escolher, só "usar o histórico de peso ou não". Mesma
regra dos outros quatro vínculos: no máximo um por meta, checado na aplicação.

Semântica de `valor_alvo` confirmada com o usuário: **quilos a perder desde o
início da meta** (delta), não peso final absoluto — bate com a meta já criada
(alvo=12 para "Perder 12kg"). `progresso_meta()` calcula
`peso_inicial - peso_atual`, onde:
- `peso_inicial` = peso mais recente **estritamente antes** de `data_inicio`;
- `peso_atual` = peso mais recente até `data_alvo` (ou hoje, sem prazo).

**Bug pego testando com dado real, antes de ir para produção:** a primeira versão
usava `data <= data_inicio` para `peso_inicial`. Registrar um peso no mesmo dia em
que a meta foi criada fazia `peso_inicial` e `peso_atual` caírem no mesmo
registro — delta sempre 0, mesmo tendo perdido peso de verdade desde uma pesagem
anterior. Corrigido para `data < data_inicio` (estritamente antes): a linha de
base fica fixa no que já era conhecido quando a meta nasceu, e qualquer pesagem
a partir daquele dia (inclusive) conta como progresso.

Sem cor nova no design system — `registro_corporal` vive dentro do pilar Treino
(`SecaoCorporal.tsx`), então o vínculo reaproveita `text-treino`.

**Verificado no navegador contra o banco real:** com um só registro de peso
(97kg, antes da meta), progresso = 0. Inserido um segundo peso (94.5kg) no dia da
meta — progresso passou a 2.5, e o card mostrou "Perder 12kg — 2.5 / 12 Kg". Meta
de teste e peso de teste removidos depois de confirmado.

### 10.35 Tendência do Financeiro ganha receita e saldo (só mostrava gasto)

Diagnóstico: o Financeiro inteiro tinha **um gráfico só** (`GraficoTendencia`,
reaproveitado na Home do pilar e no detalhe de categoria) — o resto é anel/barra/
número. E esse gráfico só somava despesa: não havia como ver se a receita estava
subindo ou caindo, nem se a diferença entre as duas estava melhorando ou piorando
mês a mês — a mesma classe de lacuna que motivou a 10.31 no Calendário (mostrar só
uma face do dado).

Extraída a agregação, que vivia solta dentro do `useMemo` do componente, para uma
função pura testada: `tendenciaMensal()` em `calculos.ts`, recebendo os ids de
categoria a somar como gasto e como receita e devolvendo `{ mes, gasto, receita,
saldo }` por mês — a receita soma sempre todas as categorias de receita,
independente do filtro de despesa selecionado.

**Receita só aparece na visão "todas as despesas".** Comparar o gasto de uma
categoria única com a renda inteira no mesmo traçado confundiria mais do que
ajudaria; a visão de categoria única continua exatamente como antes (só gasto x
meta). Sem série nova de "saldo" no gráfico — o espaço entre as duas áreas
(despesa em `--chart-1`, receita em `--chart-2`, mesmas cores já usadas em outros
gráficos do app) já mostra isso visualmente. O saldo exato mora no tooltip
customizado, junto com gasto e receita, calculado a partir do próprio ponto de
dado — não recalculado no componente.

Faxina de bônus: os eixos passaram a usar a constante `EIXO` de
`components/grafico.tsx`, que existia desde o Bloco E e nenhum gráfico do app usava
(cada um repetia o mesmo `tick`/`stroke` na mão).

**Verificado no navegador:** com "todas as despesas", o card mostra "Tendência de
gasto e receita", duas áreas com legenda, e o tooltip lista Gasto total, Receita e
Saldo (ex.: `R$ 162,46` / `R$ 275,00` / `R$ 112,54`). Trocando para uma categoria
específica, o título volta a "Tendência de gasto", a legenda e a área de receita
desaparecem — só a série de despesa contra a meta, como antes.

**Ainda em aberto, não decidido:** a linha de meta usa a receita do mês *corrente*
para os 6 meses inteiros (comentário no código já registra isso) — imprecisa para
meses passados se a meta é percentual e a receita variou. E falta uma visão de
**composição** (quanto cada categoria pesa no total de despesa) — nenhum gráfico
do pilar responde isso hoje.

### 10.36 Build da Vercel quebrado nos dois últimos commits — `tsc --noEmit` não checava nada

Ele reportou erro de build na Vercel nos commits `c2370cd` e `9ee7057`. Rodei
`npx tsc -b` (o comando real do `npm run build`, `tsc -b && vite build`) e apareceram
**dois erros de verdade** que eu tinha dado como "typecheck limpo" nas duas sessões
anteriores — porque validei com `npx tsc --noEmit` solto, que lê o `tsconfig.json`
da raiz. Esse arquivo tem `"files": []` e só referencia os sub-projetos
(`tsconfig.app.json`/`tsconfig.node.json`) — **não checava nenhum arquivo**, sempre
saía limpo porque não havia nada para checar. `npm run build` (e portanto a Vercel)
usa `tsc -b`, que constrói os sub-projetos de verdade. Erro meu de processo: devia
ter usado `tsc -b` ou `npm run build` desde a primeira vez, não `tsc --noEmit`.

**Os dois erros:**

1. `database.ts` — a última cláusula do helper `CompositeTypes<>` (regenerado via
   MCP `generate_typescript_types` na sessão do vínculo de peso corporal) indexava
   por `CompositeTypeName` em vez de `PublicCompositeTypeNameOrOptions`, igual ao
   padrão do helper `Enums<>` uma linha acima. Como o schema não tem nenhum tipo
   composto (`CompositeTypes: { [_ in never]: never }`), o TS simplifica isso para
   `{}` e indexar por um parâmetro genérico solto quebra ("Type 'CompositeTypeName'
   cannot be used to index type '{}'"). O texto que saiu do MCP já vinha assim — não
   bati contra o arquivo committado antes de escrever por cima.
2. `GraficoTendencia.tsx` — passar `content={<ConteudoTooltip .../>}` para o
   `Tooltip` do recharts (sessão dos gráficos do Financeiro) não tipa: JSX exige
   todas as props obrigatórias na criação do elemento, mas o recharts injeta
   `active`/`payload`/`label` depois, via `cloneElement` em runtime — o TS não sabe
   disso. Corrigido usando a forma de função que o `content` também aceita
   (`content={(props) => <ConteudoTooltip {...props} ... />}`), e soltando o
   generic de `ConteudoTooltipProps` (era `TooltipContentProps<number, string>`,
   virou `TooltipContentProps` sem argumento) — `<Tooltip>` não é genérico na
   assinatura JSX, então o `props` que a função recebe já vem nos defaults
   `ValueType`/`NameType` do recharts, não em `<number, string>`.

**Mudança de processo, não só de código:** doravante, verificar tipos deste
projeto significa `npx tsc -b` (ou `npm run build`) — nunca `tsc --noEmit` solto,
que só funcionaria se apontado direto para `tsconfig.app.json`.

### 10.37 Composição de gasto por categoria — "pra onde vai o dinheiro"

Segunda parte da melhoria de gráficos do Financeiro (10.35 foi a primeira). O
grid de `CardCategoria` mostra cada categoria contra a própria meta, mas nenhuma
tela deixava comparar categorias entre si — não dava para ver de cara que uma
categoria é 40% do gasto do mês só olhando os anéis, um por um.

Achado antes de escrever qualquer UI: a função de cálculo pra isso **já existia
e já tinha teste** — `rankingGastos()`, top N categorias por valor gasto — só
que nunca tinha sido usada em nenhum componente. Código morto, escrito e
testado, sem UI.

Discutido a forma antes de construir (ele escolheu): lista ranqueada com barra
proporcional ao gasto, em vez de barra única empilhada ou anel/donut — reaproveita
a pastilha colorida por categoria que `ListaLancamentos` já usa (`categoria.cor`),
só com o comprimento passando a significar algo, e é a opção que menos foge do
estilo "lista densa" do resto do pilar. Donut foi descartado por nunca ter sido
usado no app nem uma vez (`PieChart` do recharts, zero ocorrências) e ficar mais
colorido/decorativo que o resto do Financeiro.

`rankingGastos<T>` virou genérico (antes fixo em `EntradaRanking`) para que
`composicaoGastos()` — a função nova — consiga carregar `cor` e devolver
`percentual` sem perder tipo no meio do caminho. `percentual` reaproveita
`progressoCategoria()`: a mesma razão usada pra "quanto da meta já foi gasto"
serve aqui como "quanto do total de despesas essa categoria representa", com o
total de despesas no lugar da meta — zero cálculo novo além da soma do total.

`BarraProgresso` ganhou a prop `cor` (cor CSS livre, precedência sobre
`classeCor`) — faltava nela o que `AnelProgresso` já tinha, pelo mesmo motivo:
`categorias.cor` é texto livre no banco, não pode virar classe Tailwind estática.

**Bug pego no navegador antes de commitar:** a primeira versão passava
`listaCategorias` (receita + despesa) pro componente sem filtrar, e uma
categoria de receita ("Almoço - Receita", `total_gasto_mes` = 75 porque a coluna
existe pra qualquer natureza) apareceu na composição de despesa. Corrigido
filtrando por `natureza === 'despesa'` **dentro** de `composicaoGastos` — mesma
defesa que `metaTotalDespesas` já faz, em vez de confiar que todo chamador vai
filtrar antes de passar. Teste novo cobre esse caso específico.

**Verificado no navegador com o dado real:** card "Pra onde vai o dinheiro" com
Alimentação (78%), Assinaturas (7%), Lanche (7%), Bebidas - Refrigerante (6%),
Doces (2%) — barras proporcionais, cor de cada categoria, sem a categoria de
receita.

### 10.38 Estudos: início/fim das aulas por matéria, e editar avaliação

Ele pediu para registrar "que dia as aulas são" com data de início e fim. A
primeira metade **já existia**: `DialogFluxograma` (botão "Horário" na página
de Estudos) já deixa marcar dia da semana + horário por matéria, alimentando
"Aulas de hoje", a grade semanal e a agenda do Calendário. Não foi construído
de novo — só apontado onde já está.

O que faltava de verdade: `materias.semestre` era texto livre ("2026.2"), sem
data nenhuma por trás. Consequência real, discutida antes de construir: o
fluxograma de uma matéria segue gerando "aula hoje" pra sempre, mesmo depois do
semestre acabar, até alguém apagar o horário à mão.

**Duas decisões confirmadas antes de codar:**
1. A data mora na **matéria** (`data_inicio`/`data_fim`, ambas opcionais), não em
   cada linha de `fluxograma_semanal` — uma matéria pode ter Segunda e Quarta na
   grade, e duplicar a mesma data em cada linha violaria a fonte única de
   verdade. `expandirRecorrencia`/`fluxograma_semanal` continuam sem saber de
   período nenhum; quem cruza é a leitura da ocorrência.
2. O efeito é **funcional**, não só informativo: fora do intervalo, a aula some
   de "Aulas de hoje" (`EstudosPage`) e da agenda do Calendário
   (`eventosFluxograma`) — como se o semestre tivesse mesmo acabado. A **grade
   semanal** (tela de gerenciar horários) continua mostrando tudo, período
   incluído ou não: ela responde "o que está cadastrado", não "o que tenho
   hoje", e esconder o horário de quem quer revisá-lo/reativá-lo seria pior.

Nova função pura `dentroDoPeriodoMateria()` em `estudos/calculos.ts`, testada.
Em `eventos.ts` (Calendário), o mesmo cheque entrou como um parâmetro opcional
a mais de `eventosFluxograma()` (`periodoPorMateria`, default `Map` vazio) — não
importa `dentroDoPeriodoMateria` de Estudos porque `eventos.ts` é
propositalmente pillar-agnostic (só trabalha com formas `Fonte*`, nunca com
tipos de domínio de outro pilar); a checagem de 2 linhas foi duplicada em vez
de criar essa dependência cruzada. Todos os parâmetros novos são opcionais com
default, então nenhum teste existente de `eventosFluxograma`/`FontesCalendario`
precisou mudar.

**Editar avaliação (pedido no meio da sessão).** `AbaAvaliacoes` só deixava
editar a nota — nome, peso e data só existiam no momento da criação; mudar
qualquer um deles exigia apagar e recriar, perdendo a nota. Resolvido do jeito
já estabelecido no projeto ("um editor, não dois"): o mesmo card "Nova
avaliação" passa a servir de editor — um lápis por linha carrega os campos no
formulário, o botão vira "Salvar", e "Cancelar" volta ao modo de criação. Sem
diálogo novo.

**Verificado no navegador, com dado real, tudo limpo depois:**
- Horário criado para "Física IV" numa quinta (sem período) → apareceu em
  "Aulas de hoje".
- `data_fim` = ontem → sumiu de "Aulas de hoje" ("Nenhuma aula prevista para
  hoje"), mas a grade semanal continuou mostrando o horário normalmente.
- Avaliação de teste criada, editada (nome, peso 2→3, data) e conferida direto
  no banco: os três campos gravaram certo.

### 10.39 Entrada orquestrada faltava em 7 páginas (correção da 10.31)

Ele reparou que algumas páginas não animavam ao abrir — citou a página
individual da matéria como exemplo. Não era um bug de lógica: `surgir-grupo`
(a animação de entrada do Bloco A, ver README) tinha sido aplicada só nas
**4 páginas-hub** (Home, Financeiro, Estudos, Projetos), na grade principal de
cada uma. As páginas de detalhe/sub-página, e o próprio Treino (que por ter
layout de lista vertical em vez de grid nunca ganhou a classe), ficaram de
fora — inconsistência de aplicação do brief, não uma decisão.

`surgir-grupo` não depende de `grid`: anima os filhos diretos de qualquer
container (`& > *`), então funciona igual num `space-y-6` de Cards
empilhados. Acrescentada no wrapper de conteúdo principal de:
`MateriaDetalhePage`, `CategoriaDetalhePage`, `ProjetoDetalhePage`,
`ExercicioDetalhePage`, `LancamentosPage`, `CalendarioPage` (vista agenda) e
`TreinoPage`.

Nenhum CSS novo, nenhuma lógica nova — só estender o que já existia para onde
faltava. Verificado no navegador (não só visualmente — `getComputedStyle`
confirmando `animationName: "surgir"` no primeiro filho de cada página).

### 10.40 Vista de mês: clicar no dia abre um card de detalhe

Ele pediu uma vista mensal — que **já existia** (botão "Mês" ao lado de
"Semana" no Calendário, grade do FullCalendar carregada sob demanda) — só que
ele não sabia. Uma vez mostrada, o pedido virou outro: a grade de mês só
mostra 2–3 eventos por célula (`dayMaxEvents`) sem horário; clicar no **dia**
(não num evento) deveria abrir um card com o detalhe completo daquele dia.

Instalado `@fullcalendar/interaction` (só ele tinha `dateClick`; os plugins
já presentes — `dayGrid`/`timeGrid` — não expõem esse evento). `GradeMes`
ganhou `onClicarDia`, distinto de `onClicarEvento`: clicar num evento
continua navegando direto pra rota (não abre o card); clicar no número do
dia ou área vazia da célula é que abre o card.

O card **reaproveita `Agenda`** passando um array de um dia só, em vez de um
componente novo — a mesma leitura de rotina-em-filete/prazo-em-bloco/feito/
cancelado que a vista semanal já usa, sem risco de divergir dela na próxima
mudança. `dias`/`eventosPorData` já eram computados em `CalendarioPage` para
o intervalo inteiro do mês visível — nenhuma consulta nova, só reaproveitar o
que a página já buscava.

Verificado no navegador: clique no dia 05/08 abriu o card
"Quarta-feira, 5 de agosto" com os dois marcos, Pull às 11:00, Legs
cancelado e Sono — idêntico ao que a agenda semanal mostra para o mesmo dia.
Clique num evento na grade navega direto (sem abrir o card por engano);
clique num evento dentro do card também navega.

### 10.41 PWA de verdade — instalável e com base pra notificação

Ele tinha "instalado" o app pelo Chrome e achava que já era um PWA. Não era:
o Chrome oferece "Adicionar à tela inicial" pra **qualquer** site responsivo,
o que cria um atalho, mas sem `manifest.json` nem service worker não é um app
instalado de verdade — não abre em modo standalone garantido, não tem shell
cacheado, e principalmente **não tem como notificar**: push no Android exige
service worker.

Instalado `vite-plugin-pwa`, com `strategies: 'injectManifest'` em vez do
`generateSW` padrão — de propósito: o service worker vai ganhar um listener
de `push` na próxima etapa, e o modo automático não deixa escrever handler
nenhum ali. `src/sw.ts` é o código-fonte; hoje só pré-cacheia o shell
(`precacheAndRoute(self.__WB_MANIFEST)`) e assume controle imediato
(`skipWaiting`/`clients.claim`).

Ícones gerados a partir do próprio favicon (os quatro círculos por pilar,
fundo `#37352f`) em três tamanhos — `icon-192`, `icon-512` e uma versão
**maskable** com o conteúdo reduzido a 75% dentro de um fundo full-bleed sem
cantos arredondados, porque o Android aplica a própria máscara e cantos
arredondados nossos por cima da máscara do sistema cortariam errado.
Rasterizados com o Chromium do Playwright (screenshot de uma página com o
SVG), sem adicionar dependência de imagem ao projeto.

`self.__WB_MANIFEST` tem `lib: webworker`, incompatível com o `DOM` do resto
do app (`self` é `ServiceWorkerGlobalScope` ali, `Window` aqui) — por isso
`src/sw.ts` ganhou um `tsconfig.sw.json` próprio, excluído de
`tsconfig.app.json` e referenciado na raiz, mesmo padrão de
`tsconfig.node.json`.

`registerType: 'autoUpdate'`: atualiza sozinho, sem perguntar — é um app de
um usuário só, não um app de terceiros onde uma atualização inesperada no
meio de uma tarefa incomodaria vários usuários diferentes. `vercel.json`
ganhou `no-cache` em `/sw.js` e `/manifest.webmanifest`, mesmo motivo do
`/index.html`: sem isso, o CDN poderia servir um service worker desatualizado
e a atualização nunca chegaria.

**Verificado servindo o build de produção** (`npm run preview`, não o dev
server): manifest responde 200 com `lang: pt-BR` certo, os quatro ícones
respondem 200, e `navigator.serviceWorker.getRegistration()` devolve o
registro com `estado: "activated"`.

**Próxima etapa, não iniciada:** o handler de `push` em si, e o que deve
disparar uma notificação (aula, treino, conta a vencer, prazo de meta) — fica
pra uma conversa própria antes de implementar.

### 10.42 Notificações push — os três gatilhos discutidos na 10.41

Ele confirmou os três gatilhos (aula/treino, conta a vencer, prazo de prova ou
meta) e a antecedência de cada um: 15 min antes pra aula/treino, no dia pra
conta, 1 dia antes pra prova/meta.

**Schema novo**, sem tocar nas tabelas de pilar: `push_subscriptions`
(endpoint + chaves do protocolo Web Push, uma por navegador que autorizou) e
`notificacoes_enviadas` (dedup — chave única `tipo`+`origem_id`+
`data_referencia`, sem ela o cron reenviaria o mesmo aviso a cada execução).

**Edge Function `notificar`** (`supabase/functions/notificar/index.ts`),
Deno, chamada pelo `pg_cron` a cada 5 minutos via `pg_net`:
- Aula/treino: lê `fluxograma_semanal` do dia da semana atual, cruza com
  `excecoes_fluxograma` (cancelado sai, remarcado-pra-hoje entra por um
  caminho à parte) e com o período da matéria (mesma regra da 10.38), numa
  janela de 15-20 min à frente alinhada ao próprio intervalo do cron.
  **Simplificação assumida:** não cobre remarcação em cadeia (remarcar de
  novo o que já foi remarcado) — caso raro demais pra pagar a complexidade.
- Conta/prova/meta: só rodam quando o relógio cai na janela das 8h — o mesmo
  cron de 5 em 5 min serve os quatro gatilhos, sem precisar de um segundo
  agendamento.
- Envia via `web-push` (`npm:web-push` — Edge Functions do Supabase suportam
  `npm:` no Deno), removendo a inscrição do banco se o navegador devolver
  404/410 (desinstalou o app, limpou dados).

**Autenticação da chamada do cron:** não usa a service role key — um segredo
próprio (`CRON_SECRET`), gerado uma vez e guardado no **Vault** do Postgres,
comparado contra o header `x-cron-secret`. A migration do agendamento
(`20260806000005_cron_notificacoes.sql`) é git-safe: não tem valor nenhum de
segredo dentro, só a referência `vault.decrypted_secrets where name =
'cron_secret'` — o valor em si foi inserido via `execute_sql`, fora de
qualquer arquivo versionado.

**Cliente:** `features/notificacoes/` (api + hooks, sem pilar próprio, mesmo
espírito de Metas) — pede permissão, inscreve via `PushManager`, salva
endpoint+chaves no banco. Card na Home (`CardNotificacoes`) com os três
estados possíveis (ativar / ativado / bloqueado nas configs do navegador).
`sw.ts` ganhou os handlers de `push` (mostra a notificação) e
`notificationclick` (foca uma aba já aberta e navega pra rota certa via
`postMessage`, em vez de sempre abrir janela nova).

**Verificado o que deu pra verificar nesta sessão:** a Edge Function
implantada responde 500 (não 401) ao ser chamada com o `x-cron-secret`
certo — confirma que a autenticação está funcionando; o 500 é esperado até as
chaves VAPID serem configuradas. O clique real de "Ativar notificações" não
foi testado em navegador automatizado porque o sandbox deste ambiente nega
`Notification.permission` incondicionalmente (confirmado testando até em
`about:blank`) — precisa ser testado num navegador de verdade.

**Pendente, fora do meu alcance por aqui:** 4 segredos precisam ser
configurados manualmente (Dashboard do Supabase ou `supabase secrets set`) —
`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` — e a
`VITE_VAPID_PUBLIC_KEY` (pública, sem risco) nas variáveis de ambiente da
Vercel. Sem tool de "definir secret de Edge Function" disponível nesta
sessão; os valores foram passados ao usuário diretamente na conversa.

### 10.43 Planejamento financeiro de longo prazo — a terceira camada do dinheiro (spec própria) — feature nova

Até aqui o Financeiro conhecia duas camadas de dinheiro: o **fato**
(`lancamentos`, o que já aconteceu) e o **teto** (`categorias.meta_mensal`,
aspiração de gasto do mês corrente). Falta a camada do meio — o
**compromisso previsto**: aquilo que ainda não aconteceu, mas que se sabe
que vai acontecer, com valor e data razoavelmente certos. Sem ela, nenhuma
pergunta sobre o futuro tem resposta: a receita de setembro não existe em
lugar nenhum do schema, então projetar setembro é impossível.

É essa lacuna que trava a pergunta que originou a feature — *"se eu comprar
R$ 300 em 3x, o quanto isso afeta minha vida financeira?"*. A resposta exige
saber quanto entra e quanto já está comprometido nos três meses seguintes, e
hoje o sistema só sabe olhar para trás.

**Schema novo:**

```sql
compromissos_recorrentes (
  id            uuid primary key,
  descricao     text not null,
  categoria_id  uuid not null references categorias,
  valor         numeric not null,
  dia_mes       int not null check (dia_mes between 1 and 31),
  data_inicio   date not null,
  data_fim      date null   -- null = sem previsão de término
)
```

A natureza (receita ou despesa) **não é repetida aqui** — vem herdada de
`categorias.natureza` (resolução 10.12). Um mesmo registro cobre "salário"
(categoria de receita) e "aluguel" (categoria de despesa), sem campo
redundante que possa divergir da categoria.

**Não materializa por mês.** Mesmo princípio da 10.5: o registro guarda o
padrão e a expansão acontece na leitura, para o intervalo pedido. A lógica é
a de `lib/recorrencia.ts`, trocando "dia da semana" por "dia do mês" — com
uma diferença que precisa ser tratada explicitamente: `dia_mes = 31` não
existe em fevereiro. Regra adotada: **quando o dia não existe no mês, a
ocorrência cai no último dia daquele mês**, nunca transborda para o mês
seguinte (transbordar mudaria o mês de competência do compromisso, que é
justamente o que a projeção está tentando medir).

**Corte passado/futuro — a regra que impede duplicidade.** É o ponto mais
delicado da feature, porque compromisso previsto e lançamento real descrevem
o mesmo dinheiro em momentos diferentes do tempo. A regra é temporal, não
por tabela:

- **Até hoje** (meses fechados e a parte já decorrida do mês corrente): a
  projeção lê `lancamentos`. O que aconteceu, aconteceu — não se estima o
  passado.
- **Depois de hoje**: a projeção lê `compromissos_recorrentes` +
  `compras_parceladas` (10.44) + média histórica das categorias variáveis.

Consequência prática: um compromisso recorrente **nunca vira lançamento
automaticamente**. Quando o salário cai, é você quem registra o lançamento —
e a partir daquele instante o mês corrente passa a contar o valor real, não
o previsto. Materializar automaticamente traria o problema clássico de
conciliação (o previsto era R$ 3.000, entrou R$ 2.870, e agora existem duas
linhas concorrentes descrevendo o mesmo evento).

**Motor de projeção** — `features/financeiro/projecao.ts`, funções puras no
mesmo espírito de `calculos.ts` (data sempre entra por parâmetro, nada de
rede nem de `new Date()` dentro):

```ts
export interface ProjecaoMensal {
  mes: string              // 'YYYY-MM'
  receitaPrevista: number
  comprometido: number     // fixos recorrentes + parcelas do mês
  variavelEstimado: number // média histórica das categorias variáveis
  saldoDoMes: number       // receita − (comprometido + variável)
  saldoAcumulado: number   // soma dos saldos até este mês
  fonte: 'real' | 'projetado'   // transparência sobre a origem do número
}

export function projetarFluxoCaixa(params: {
  hoje: string
  meses: number
  compromissos: CompromissoRecorrente[]
  parcelas: CompraParcelada[]
  lancamentosRealizados: Lancamento[]
  mediaVariavelPorCategoria: Record<string, number>
  receitaSobrescrita?: Record<string, number>  // 'YYYY-MM' → valor
  compraHipotetica?: CompraParcelada           // usado pelo simulador (10.44)
}): ProjecaoMensal[]
```

O campo `fonte` existe para que a UI **nunca apresente estimativa como
fato** — mês projetado precisa ser visualmente distinto de mês realizado
(tracejado no gráfico, texto de rodapé na tabela).

**`receitaSobrescrita` resolve a renda variável.** Média automática não dá
conta de 13º, férias, bônus ou de um mês em que o trabalho renda diferente —
o campo permite fixar manualmente a receita de meses específicos sem
inventar um compromisso recorrente falso.

**Estimativa do variável.** Média dos últimos 3 meses por categoria (janela
declarada como constante única, mesmo tratamento dado a
`NOTA_MINIMA_APROVACAO` na 10.3). Com menos de 3 meses de histórico, usa o
que houver e a UI sinaliza baixa confiança — projetar com 2 semanas de dado
e apresentar com a mesma firmeza de 6 meses seria desonesto com quem lê.

**UI — aba "Planejamento" dentro do Financeiro** (ao lado de Categorias e
Lançamentos, sem rota de pilar nova):

- Formulário de compromisso recorrente: descrição, categoria, valor, dia do
  mês, início e fim opcional. Reaproveita `CampoDecimal` (10.26 — a vírgula
  do teclado brasileiro) e o padrão de exclusão com confirmação da 10.28.
- Tabela dos próximos N meses (padrão 6): receita prevista, comprometido,
  variável estimado, saldo do mês, saldo acumulado. Meses projetados em tom
  mais claro que o mês real corrente.
- Gráfico de linha do saldo acumulado (Recharts, componente `grafico.tsx` já
  existente), com o trecho futuro tracejado.
- **Alerta de saldo negativo**: se algum mês projetado fecha com saldo
  acumulado abaixo de zero, destaque em vermelho apontando o mês — é o
  output mais valioso da feature inteira e não pode ficar escondido dentro
  de uma coluna de tabela.

**Efeitos colaterais positivos, já previstos:**

- O card "Receita vs. Despesa" (2.3) ganha camada de **previsto vs.
  realizado** no mês corrente; divergência grande entre os dois é sinal de
  entrada ou saída surpresa.
- A sugestão de valor inicial no planejamento semanal (2.3) deixa de ser
  "meta mensal ÷ 7" e passa a considerar o dia em que cada compromisso
  vence.
- A regra de investimento (10.45) passa a poder olhar a sobra **projetada**,
  não só a do mês corrente.

---

### 10.44 Compras parceladas e o simulador "e se" (depende de 10.43) — feature nova

Parcelamento é o caso que o schema atual descreve mal: uma compra em 3x não
é um gasto de R$ 300 hoje, são três compromissos de R$ 100 em três meses de
competência diferentes — dois dos quais ainda não existem em lugar nenhum.

**Schema novo:**

```sql
compras_parceladas (
  id                    uuid primary key,
  descricao             text not null,
  categoria_id          uuid not null references categorias,
  valor_total           numeric not null,
  numero_parcelas       int not null check (numero_parcelas >= 1),
  data_primeira_parcela date not null,
  juros_mensal          numeric not null default 0
)
```

Como na 10.43, **não materializa parcela por parcela** — 36x viraria 36
linhas para gerenciar. A expansão é na leitura.

**Cálculo da parcela** (`expandirParcelas`, função pura):

- `juros_mensal = 0` (padrão brasileiro, cartão sem juros): divisão simples,
  com o **resto de centavo absorvido integralmente na última parcela**. R$
  100,00 em 3x é 33,33 + 33,33 + 33,34 — nunca três parcelas de 33,33 que
  somam R$ 99,99, nem arredondamento silencioso distribuído.
- `juros_mensal > 0` (financiamento de loja): fórmula PMT padrão,
  `PMT = PV × i / (1 − (1+i)^-n)`. O campo existe para não obrigar uma
  refatoração quando aparecer o primeiro parcelamento com juros de verdade.

Cada ocorrência de parcela entra na projeção da 10.43 no mês em que cai,
somando ao `comprometido` daquele mês.

**O simulador — três execuções, não uma.** Responder "o quanto isso me
afeta" exige isolar o efeito da compra do ruído do resto do orçamento. Por
isso o simulador roda `projetarFluxoCaixa` **duas vezes** e compara:

1. **Linha base**: projeção sem a compra hipotética.
2. **Cenário**: mesma projeção com `compraHipotetica` preenchida.
3. **Diferença**: subtração mês a mês entre as duas, que é o que a UI
   apresenta em primeiro plano.

**Nada é gravado.** O simulador vive inteiramente em estado local
(`useState`), sem `useMutation`, sem tocar no Supabase. É o que garante que
uma simulação nunca vaze para o dado real por engano — risco principal desse
tipo de feature. Só existe uma escrita possível a partir dele: um botão
explícito "registrar essa compra de verdade", que aí sim insere em
`compras_parceladas`.

**UI** — `Sheet` aberto por um botão "Simular" na page Financeiro (folha
ancorada embaixo no mobile, conforme 10.29):

- Campos da compra hipotética: valor total, número de parcelas, categoria,
  mês da primeira parcela.
- Sliders opcionais de corte por categoria variável ("e se eu reduzir
  delivery em 30%?"), com debounce de ~150 ms — recalcular a cada pixel
  arrastado desperdiça trabalho sem mudar o que se lê na tela.
- Saída em três números, antes → depois: saldo projetado ao fim do
  horizonte, disponível por dia no mês corrente, e sobra estimada para
  investimento (gancho direto com a 10.45).
- Gráfico com as duas linhas sobrepostas (base sólida, cenário tracejado).
- Frase-resumo em linguagem direta, do tipo *"reduz seu saldo em ~R$ 100/mês
  até novembro; em outubro o saldo acumulado ficaria negativo"* — o número
  isolado exige interpretação, a frase entrega a conclusão.

**Regra de honestidade:** se a projeção depende de histórico curto demais ou
de receita não informada para os meses do horizonte, o simulador diz isso em
vez de exibir um número com falsa precisão.

---

### 10.45 Regra de investimento — sugestão, nunca execução (depende de 10.43) — feature nova

O aporte hoje é 100% manual (10.4: uma linha por evento, `tipo = 'aporte'`).
A feature adiciona uma regra que **sugere** quanto aportar, mantendo a
decisão e o registro nas mãos do usuário — o sistema não tem, nem deve ter,
integração bancária.

**Schema novo:**

```sql
regra_investimento (
  id                   uuid primary key,
  ativa                boolean not null default true,
  gatilho_tipo         text not null check (gatilho_tipo in ('sobra_meta','percentual_receita')),
  percentual           numeric not null,   -- % da sobra, ou % da receita
  dia_sugestao         int not null check (dia_sugestao between 1 and 31)
)

sugestoes_investimento (
  id               uuid primary key,
  mes_referencia   date not null,
  valor_sugerido   numeric not null,
  status           text not null check (status in ('pendente','aceita','recusada')),
  investimento_id  uuid null references investimentos,
  unique (mes_referencia)
)
```

O `unique (mes_referencia)` é o mesmo raciocínio de dedup da 10.42
(`notificacoes_enviadas`): sem ele, cada carregamento da página geraria uma
sugestão nova para o mesmo mês.

**Gatilhos:**

- `sobra_meta` — no `dia_sugestao`, calcula
  `sobra = meta_mensal_total − gasto_realizado_mes` e sugere
  `sobra × percentual / 100`. Sugere apenas se `sobra > 0`.
- `percentual_receita` — sugere `receita_do_mes × percentual / 100`,
  independente de ter sobrado; é a disciplina de "investir antes de gastar".

Com a 10.43 disponível, ambos podem olhar a **sobra projetada** dos meses
seguintes antes de sugerir — evita sugerir um aporte gordo em um mês que já
tem três parcelas e o IPVA caindo no mês seguinte.

**Fluxo de aceite:** o card mostra a sugestão com dois botões. **Aceitar**
abre o formulário de aporte já pré-preenchido (o usuário confirma ou ajusta
o valor); ao salvar, grava o `investimentos.id` de volta em
`sugestoes_investimento.investimento_id` e marca `aceita`. **Recusar** marca
`recusada` e o mês não volta a ser sugerido. Sugestões recusadas ficam só
como registro histórico, fora da UI principal.

**Notificação:** quarto gatilho da Edge Function `notificar` (10.42), no
mesmo cron de 5 em 5 minutos e na mesma janela das 8h usada por
conta/prova/meta. Dedup pela chave já existente
(`tipo` + `origem_id` + `data_referencia`).

---

### 10.46 Projeção de carga no Treino (contraparte do simulador financeiro) — feature nova

O mesmo raciocínio de projeção aplicado ao Treino, respondendo *"nesse
ritmo, quando eu chego em X kg?"*.

Entra no histórico de progressão do exercício, ao lado do que
`progressaoCarga` já mostra. Ajusta uma reta de mínimos quadrados sobre os
últimos N valores de `umRmEstimado` (poucos pontos, não precisa de
biblioteca) e extrapola até a carga alvo informada.

**Regra de honestidade, herdada da 10.44:** quando a inclinação da reta é
zero ou negativa — situação que `sinalEstagnacao` já detecta —, o simulador
**não** exibe uma data. Exibe "sem progressão suficiente para projetar;
considere ajustar o treino", reaproveitando o sinal existente em vez de
produzir um número inventado. Mesmo com inclinação positiva, o resultado é
apresentado como faixa aproximada ("~8 a 10 semanas"), nunca como data
exata.

### 10.47 Simulador financeiro — correções e ampliação (revisa 10.44) — feature nova

O simulador entregue em 10.44 responde à pergunta que o originou, mas a
revisão do código em uso expôs duas imprecisões e três perguntas que ele
ainda não sabe responder. Esta resolução trata as duas coisas, em ordem de
prioridade: primeiro o que hoje devolve número errado, depois o que amplia o
alcance.

---

#### 10.47.1 Horizonte adaptativo (corrige `HORIZONTE_SIMULACAO`)

`SheetSimulador` fixa `HORIZONTE_SIMULACAO = 6` e passa esse valor a
`projetarFluxoCaixa`. Uma compra em 12x tem, portanto, metade das parcelas
fora da janela: a diferença entre base e cenário é calculada só sobre 6
meses, subestimando o impacto, e um saldo acumulado que só ficaria negativo
no mês 9 **nunca é sinalizado** — justamente o output mais valioso da
feature.

O horizonte passa a ser derivado, não constante:

```ts
const horizonte = Math.max(HORIZONTE_MINIMO, numeroParcelas + 1)
// HORIZONTE_MINIMO = 6
```

O `+ 1` é intencional: mostrar ao menos um mês **depois** da última parcela
deixa visível o alívio no fluxo quando ela sai — informação que muda a
leitura de "isso me aperta" para "isso me aperta até março".

A linha de base precisa ser recalculada com o mesmo horizonte do cenário —
comparar 6 meses de base com 13 de cenário produziria uma diferença sem
sentido. Ambas as chamadas de `projetarFluxoCaixa` usam `horizonte`.

#### 10.47.2 Frase-resumo com o impacto mensal real (corrige 10.44)

A frase atual divide a diferença total por `HORIZONTE_SIMULACAO`. Para R$
300 em 3x isso produz *"reduz ~R$ 50/mês"*, quando o efeito real é R$ 100
por três meses e R$ 0 depois — o número apresentado não descreve nenhum mês
que vai de fato existir.

O valor mensal deve vir de `calcularParcelas(compraHipotetica)`, não de uma
média: as parcelas podem divergir entre si pelo centavo absorvido na última
(10.44), então a frase usa a parcela típica e nomeia a duração:

> "R$ 100,00/mês pelos próximos 3 meses (última parcela em out/2026)."

Quando o cenário leva o acumulado a negativo, a segunda oração continua
apontando o mês, como já faz hoje.

---

#### 10.47.3 Comparação de cenários lado a lado

É a decisão real diante de uma compra: à vista, 3x sem juros ou 6x com
juros. O motor já aceita `compraHipotetica`, então comparar é rodar
`projetarFluxoCaixa` uma vez por cenário — nenhuma mudança em
`projecao.ts` além do horizonte:

```ts
export interface Cenario {
  rotulo: string          // 'À vista' | '3x sem juros' | '6x a 2,5% a.m.'
  compra: ParceladaDetalhada | null   // null = linha de base
}

export interface ResumoCenario {
  rotulo: string
  totalPago: number       // valor_total, ou soma das parcelas quando há juros
  piorSaldoAcumulado: number
  mesDoPiorSaldo: string
  ficaNegativo: boolean
}
```

À vista entra como uma "compra" de `numero_parcelas = 1` — não precisa de
caminho especial no código.

A tabela comparativa mostra, por cenário: total pago, pior saldo acumulado e
em que mês ele ocorre. É o que torna a troca visível — à vista drena um mês
só e custa menos; parcelado alivia o mês da compra e custa mais quando há
juros. Hoje o simulador força ver um cenário de cada vez, o que esconde
exatamente essa comparação.

#### 10.47.4 Compromisso hipotético (assinatura e renda extra)

Duas perguntas frequentes ficam fora hoje porque só compra parcelada é
simulável:

- *"E se eu assinar algo de R$ 120/mês?"* — despesa recorrente sem fim
  definido
- *"E se eu pegar um freela de R$ 800/mês por 4 meses?"* — receita
  recorrente com `data_fim`

`projetarFluxoCaixa` já expande compromissos; falta só aceitar um
hipotético, simétrico ao que já existe para compras:

```ts
compromissoHipotetico?: CompromissoDetalhado
```

Ele entra na expansão junto com os reais, sem mutar o array recebido — mesma
garantia que o teste de `compraHipotetica` já cobre. A natureza
(receita/despesa) vem da categoria escolhida, como em 10.43, então uma
"simulação de renda extra" não precisa de campo novo nenhum.

Para compromisso hipotético **sem** `data_fim`, o horizonte volta a ser
`HORIZONTE_MINIMO` — não existe "última parcela" para ancorar a janela.

#### 10.47.5 Sliders de corte por categoria variável

Parte prevista em 10.44 e não implementada. Aplica um percentual de redução
sobre `mediaVariavelPorCategoria` **antes** de projetar — ou seja, é
transformação de entrada, não mudança no motor:

```ts
function aplicarCortes(
  media: Record<string, number>,
  cortes: Record<string, number>,  // categoria_id → % de redução
): Record<string, number>
```

Vale porque muda a resposta de binária para acionável: em vez de "não cabe",
o simulador passa a poder dizer *"cabe se você reduzir 20% em delivery"*.
Debounce de ~150 ms no slider, como já previsto — recalcular a cada pixel
arrastado não muda o que se lê na tela.

Só categorias devolvidas por `categoriasElegiveisParaMediaVariavel` aparecem
como slider: as que já têm compromisso recorrente vinculado não entram na
média (10.44, correção da dupla contagem), então um corte ali não teria
efeito e confundiria.

#### 10.47.6 Banda de incerteza no variável

O variável estimado é uma média histórica apresentada como linha sólida, o
que dá à projeção uma precisão que ela não tem. A pergunta que importa não é
"cabe na média?", é "cabe se o mês for ruim?".

`mediaVariavelPorCategoria` ganha uma contraparte que devolve também o pior
mês observado na janela, e a projeção passa a poder rodar em dois modos —
`'media'` e `'pessimista'`. O gráfico mostra a faixa entre as duas linhas
(`Area` do Recharts, sobre o `grafico.tsx` existente), e o alerta de saldo
negativo distingue os casos:

- negativo já na média → alerta vermelho, como hoje
- negativo só no pessimista → alerta amarelo, texto de "depende do mês"

Com menos meses de histórico do que a janela, a banda é mais larga por
construção — o que é honesto, e dispensa texto extra explicando a
imprecisão.

#### 10.47.7 Veredicto em vez de número solto

Uma regra de comprometimento converte a saída numérica em semáforo, no mesmo
padrão `Status` (`ok` | `atencao` | `risco`) que os outros pilares já usam:

```
comprometimento = (parcelas do mês + compromissos de despesa do mês)
                  ÷ receita prevista do mês
```

Limite configurável, declarado como **constante única** (mesmo tratamento de
`NOTA_MINIMA_APROVACAO` na 10.3), com padrão de 30%. O veredicto combina
comprometimento e saldo:

- 🟢 **cabe** — comprometimento sob o limite e acumulado nunca negativo
- 🟡 **aperta** — passa do limite, mas o acumulado se mantém positivo
- 🔴 **não cabe** — o acumulado fica negativo em algum mês do horizonte

O veredicto vai no topo do resultado; a tabela e o gráfico continuam abaixo,
para quem quiser abrir o detalhe. Número exige interpretação, o veredicto
entrega a conclusão.

#### 10.47.8 Gancho com a reserva de emergência (dependência futura)

Quando a reserva existir (`investimentos.finalidade = 'reserva'` e o tipo
`'resgate'` ainda a adicionar no CHECK de 10.4), o simulador ganha a leitura
mais forte que pode ter: *"essa compra derruba sua reserva de 3,2 para 2,8
meses"*. Fica registrado aqui como ponto de integração, sem bloquear nada
desta resolução.

---

#### Ordem de execução

1. **10.47.1 e 10.47.2** — corrigem número errado, mudança pequena e contida
   em `SheetSimulador`. Não dependem de nada.
2. **10.47.3** — maior ganho de utilidade por esforço; só orquestra chamadas
   que já existem.
3. **10.47.4** — exige tocar `ParametrosProjecao`, mas a expansão de
   compromisso já está pronta.
4. **10.47.5** e **10.47.7** — independentes entre si, ambos sobre o que
   10.47.3 já tiver montado.
5. **10.47.6** — último; é o único que muda a forma do dado devolvido pelo
   motor.

#### Testes a acrescentar em `projecao.test.ts`

- horizonte adaptativo cobre a última parcela de uma compra em 12x (e um mês
  além dela)
- linha de base e cenário são projetados com o mesmo número de meses
- `compromissoHipotetico` de receita aumenta `receitaPrevista` dos meses no
  intervalo, e não afeta os meses fora dele
- `compromissoHipotetico` não muta o array `compromissos` recebido
- `aplicarCortes` reduz só as categorias informadas e nunca produz valor
  negativo
- veredicto devolve `risco` quando qualquer mês fecha com acumulado negativo,
  mesmo com comprometimento abaixo do limite
