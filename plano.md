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