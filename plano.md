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
