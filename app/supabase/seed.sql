-- =============================================================================
-- Dados de exemplo do Nexus
--
-- Objetivo: dar forma visual ao sistema — gráficos com histórico, semáforos nos
-- três estados, PRs em progressão, um projeto esfriando. Não é fixture de teste:
-- é um cenário coerente de ~4 meses de uso.
--
-- Datas são relativas a `current_date`, então o cenário nunca envelhece.
--
-- Para limpar tudo: app/supabase/seed_limpar.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Financeiro
-- ---------------------------------------------------------------------------

insert into categorias (id, nome, natureza, tipo, meta_mensal, meta_tipo, cor) values
  ('c0000000-0000-4000-8000-000000000001', 'Salário',    'receita', null, null, null,               null),
  ('c0000000-0000-4000-8000-000000000002', 'Freelance',  'receita', null, null, null,               null),
  ('c0000000-0000-4000-8000-000000000003', 'Aluguel',    'despesa', 'fixo',      1800, 'valor',            '#8f6b4f'),
  ('c0000000-0000-4000-8000-000000000004', 'Mercado',    'despesa', 'variavel',   900, 'valor',            '#4f9d69'),
  ('c0000000-0000-4000-8000-000000000005', 'Delivery',   'despesa', 'variavel',   300, 'valor',            '#d0764b'),
  ('c0000000-0000-4000-8000-000000000006', 'Transporte', 'despesa', 'variavel',   250, 'valor',            '#4a87c4'),
  ('c0000000-0000-4000-8000-000000000007', 'Lazer',      'despesa', 'variavel',    10, 'percentual_renda', '#8b6bb5'),
  ('c0000000-0000-4000-8000-000000000008', 'Academia',   'despesa', 'fixo',       120, 'valor',            '#c4708f');

-- Receita: salário fixo nos últimos 6 meses + dois freelances
insert into lancamentos (categoria_id, valor, data, descricao)
select
  'c0000000-0000-4000-8000-000000000001',
  5200,
  (date_trunc('month', current_date) - (n || ' months')::interval + interval '4 days')::date,
  'Salário'
from generate_series(0, 5) as n;

insert into lancamentos (categoria_id, valor, data, descricao) values
  ('c0000000-0000-4000-8000-000000000002', 1400, (current_date - 42), 'Landing page'),
  ('c0000000-0000-4000-8000-000000000002',  900, (current_date - 12), 'Ajustes no app');

-- Aluguel: despesa fixa com vencimento — alimenta as contas no Calendário
insert into lancamentos (categoria_id, valor, data, data_vencimento, descricao, forma_pagamento)
select
  'c0000000-0000-4000-8000-000000000003',
  1800,
  (date_trunc('month', current_date) - (n || ' months')::interval + interval '2 days')::date,
  (date_trunc('month', current_date) - (n || ' months')::interval + interval '9 days')::date,
  'Aluguel',
  'Transferência'
from generate_series(0, 5) as n;

insert into lancamentos (categoria_id, valor, data, data_vencimento, descricao, forma_pagamento)
select
  'c0000000-0000-4000-8000-000000000008',
  120,
  (date_trunc('month', current_date) - (n || ' months')::interval + interval '5 days')::date,
  (date_trunc('month', current_date) - (n || ' months')::interval + interval '10 days')::date,
  'Mensalidade da academia',
  'Cartão'
from generate_series(0, 5) as n;

-- Mercado: comportado, dentro da meta de 900
insert into lancamentos (categoria_id, valor, data, descricao, forma_pagamento)
select
  'c0000000-0000-4000-8000-000000000004',
  (170 + (n * 37) % 110)::numeric,
  (current_date - (n * 6))::date,
  'Compra da semana',
  'Cartão'
from generate_series(0, 21) as n;

-- Delivery: estourou a meta de 300 nos DOIS meses anteriores.
-- É isso que faz a categoria aparecer em "Atenção" (candidatos_corte).
insert into lancamentos (categoria_id, valor, data, descricao, forma_pagamento) values
  ('c0000000-0000-4000-8000-000000000005', 58, (date_trunc('month', current_date) - interval '1 month' + interval '3 days')::date,  'Hamburguer', 'Cartão'),
  ('c0000000-0000-4000-8000-000000000005', 74, (date_trunc('month', current_date) - interval '1 month' + interval '9 days')::date,  'Japonês',    'Cartão'),
  ('c0000000-0000-4000-8000-000000000005', 91, (date_trunc('month', current_date) - interval '1 month' + interval '16 days')::date, 'Pizza',      'Cartão'),
  ('c0000000-0000-4000-8000-000000000005', 68, (date_trunc('month', current_date) - interval '1 month' + interval '23 days')::date, 'Açaí',       'Cartão'),
  ('c0000000-0000-4000-8000-000000000005', 82, (date_trunc('month', current_date) - interval '1 month' + interval '27 days')::date, 'Marmita',    'Pix'),
  ('c0000000-0000-4000-8000-000000000005', 63, (date_trunc('month', current_date) - interval '2 months' + interval '5 days')::date,  'Lanche',    'Cartão'),
  ('c0000000-0000-4000-8000-000000000005', 88, (date_trunc('month', current_date) - interval '2 months' + interval '12 days')::date, 'Pizza',     'Cartão'),
  ('c0000000-0000-4000-8000-000000000005', 79, (date_trunc('month', current_date) - interval '2 months' + interval '19 days')::date, 'Japonês',   'Cartão'),
  ('c0000000-0000-4000-8000-000000000005', 95, (date_trunc('month', current_date) - interval '2 months' + interval '25 days')::date, 'Churrasco', 'Pix'),
  ('c0000000-0000-4000-8000-000000000005', 72, (date_trunc('month', current_date) - interval '3 months' + interval '11 days')::date, 'Pizza',     'Cartão');

-- Mês corrente: Delivery já em 2/3 da meta, e um gasto HOJE para o
-- semáforo do dia ter o que comparar
insert into lancamentos (categoria_id, valor, data, descricao, forma_pagamento) values
  ('c0000000-0000-4000-8000-000000000005', 64, (current_date - 8), 'Japonês',  'Cartão'),
  ('c0000000-0000-4000-8000-000000000005', 71, (current_date - 3), 'Pizza',    'Cartão'),
  ('c0000000-0000-4000-8000-000000000005', 42, current_date,       'Almoço',   'Pix'),
  ('c0000000-0000-4000-8000-000000000006', 28, current_date,       'Uber',     'Cartão');

-- Transporte e Lazer: histórico para o gráfico de tendência ter linha
insert into lancamentos (categoria_id, valor, data, descricao)
select
  'c0000000-0000-4000-8000-000000000006',
  (95 + (n * 23) % 80)::numeric,
  (current_date - (n * 9))::date,
  'Combustível'
from generate_series(0, 15) as n;

insert into lancamentos (categoria_id, valor, data, descricao)
select
  'c0000000-0000-4000-8000-000000000007',
  (110 + (n * 41) % 150)::numeric,
  (current_date - (n * 11))::date,
  'Cinema / bar'
from generate_series(0, 13) as n;

-- Investimentos: aportes mensais e rendimento, com um mês negativo
insert into investimentos (tipo, valor, data, descricao)
select
  'aporte',
  600,
  (date_trunc('month', current_date) - (n || ' months')::interval + interval '6 days')::date,
  'Aporte mensal'
from generate_series(0, 5) as n;

insert into investimentos (tipo, valor, data, descricao) values
  ('rendimento',  84.30, (date_trunc('month', current_date) + interval '14 days')::date,                    'Rendimento do período'),
  ('rendimento',  71.10, (date_trunc('month', current_date) - interval '1 month' + interval '14 days')::date, 'Rendimento do período'),
  ('rendimento', -32.40, (date_trunc('month', current_date) - interval '2 months' + interval '14 days')::date,'Período no prejuízo');

-- Planejamento da semana corrente (ritual de domingo)
-- `date_trunc('week')` no Postgres já cai na segunda-feira, que é a convenção
-- de `semana_inicio`.
insert into planejamento_semanal_financeiro (semana_inicio, dia_semana, categoria_id, valor_planejado)
select (date_trunc('week', current_date))::date, c.dia, c.id, c.valor
from (values
  (1, 'c0000000-0000-4000-8000-000000000004'::uuid,  60::numeric),
  (2, 'c0000000-0000-4000-8000-000000000006'::uuid,  30::numeric),
  (3, 'c0000000-0000-4000-8000-000000000004'::uuid,  60::numeric),
  (4, 'c0000000-0000-4000-8000-000000000005'::uuid,  40::numeric),
  (5, 'c0000000-0000-4000-8000-000000000007'::uuid, 120::numeric),
  (6, 'c0000000-0000-4000-8000-000000000004'::uuid,  80::numeric)
) as c(dia, id, valor);

-- `on conflict do nothing`: `data` é unique e o dia de hoje pode já ter um
-- check marcado pelo uso real.
insert into checks_diarios (data, financeiro_registrado, planejamento_semana_feito) values
  (current_date, true, false),
  (current_date - 1, true, false),
  (current_date - 2, true, false)
on conflict (data) do nothing;

-- ---------------------------------------------------------------------------
-- Estudos — os três estados do semáforo de risco, de propósito
-- ---------------------------------------------------------------------------

insert into materias (id, nome, professor, carga_horaria_total, limite_faltas, semestre) values
  ('a0000000-0000-4000-8000-000000000001', 'Cálculo II',           'Prof. Ribeiro', 72, 15, '2026.2'),
  ('a0000000-0000-4000-8000-000000000002', 'Física I',             'Profa. Lima',   72, 15, '2026.2'),
  ('a0000000-0000-4000-8000-000000000003', 'Algoritmos',           'Prof. Tanaka',  60, 12, '2026.2'),
  ('a0000000-0000-4000-8000-000000000004', 'Banco de Dados',       'Profa. Souza',  60, 12, '2026.2');

-- Cálculo II: tranquilo (média 8.4 projetada acima do mínimo)
insert into avaliacoes (materia_id, nome, peso, nota, data) values
  ('a0000000-0000-4000-8000-000000000001', 'P1', 2, 8.5, current_date - 45),
  ('a0000000-0000-4000-8000-000000000001', 'P2', 3, 9.0, current_date - 12),
  ('a0000000-0000-4000-8000-000000000001', 'P3', 3, null, current_date + 18),
  ('a0000000-0000-4000-8000-000000000001', 'Trabalho', 2, 8.0, current_date - 25);

-- Física I: RISCO — média projetada abaixo de 6 e faltas quase no limite
insert into avaliacoes (materia_id, nome, peso, nota, data) values
  ('a0000000-0000-4000-8000-000000000002', 'P1', 3, 4.5, current_date - 40),
  ('a0000000-0000-4000-8000-000000000002', 'P2', 3, 5.0, current_date - 10),
  ('a0000000-0000-4000-8000-000000000002', 'P3', 4, null, current_date + 6);

-- Algoritmos: ATENÇÃO — projetada na margem logo acima do mínimo
insert into avaliacoes (materia_id, nome, peso, nota, data) values
  ('a0000000-0000-4000-8000-000000000003', 'P1', 2, 7.0, current_date - 33),
  ('a0000000-0000-4000-8000-000000000003', 'Lista geral', 1, 6.5, current_date - 20),
  ('a0000000-0000-4000-8000-000000000003', 'P2', 3, null, current_date + 11);

-- Banco de Dados: usa média manual, para exercitar o outro modo de cálculo
insert into avaliacoes (materia_id, nome, peso, nota, data) values
  ('a0000000-0000-4000-8000-000000000004', 'Projeto final', 1, 9.2, current_date - 8);
insert into config_calculo_media (materia_id, tipo, nota_manual, observacao) values
  ('a0000000-0000-4000-8000-000000000004', 'manual', 9.2,
   'Nota única do projeto, definida pela professora fora do padrão ponderado.');

-- Faltas: Física I quase estourando (13 de 15)
insert into faltas (materia_id, data, motivo)
select 'a0000000-0000-4000-8000-000000000002', (current_date - (n * 5))::date,
       case when n % 3 = 0 then 'Consulta médica' else null end
from generate_series(1, 13) as n;

insert into faltas (materia_id, data, motivo) values
  ('a0000000-0000-4000-8000-000000000003', current_date - 20, 'Viagem'),
  ('a0000000-0000-4000-8000-000000000003', current_date - 6,  null),
  ('a0000000-0000-4000-8000-000000000001', current_date - 30, null);

-- Sessões de estudo dos últimos 20 dias, com meta diária de 90 min
insert into sessoes_estudo (materia_id, data, duracao_minutos, meta_diaria_minutos)
select
  (array[
    'a0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000003'
  ]::uuid[])[1 + (n % 3)],
  (current_date - n)::date,
  (35 + (n * 17) % 70),
  90
from generate_series(0, 19) as n
where n % 4 <> 3;  -- alguns dias sem estudar, para a meta não bater 100%

-- Listas de exercícios com percentual de acerto variado
insert into registro_listas (materia_id, nome_lista, data, total_questoes, questoes_erradas, topico) values
  ('a0000000-0000-4000-8000-000000000001', 'Lista 3', current_date - 14, 10, '{4,7}',     'Integrais por partes'),
  ('a0000000-0000-4000-8000-000000000001', 'Lista 4', current_date - 5,  12, '{2}',       'Séries'),
  ('a0000000-0000-4000-8000-000000000002', 'Lista 2', current_date - 9,   8, '{1,3,5,7}', 'Cinemática'),
  ('a0000000-0000-4000-8000-000000000003', 'Lista 5', current_date - 2,  15, '{11,14}',   'Grafos');

-- Fluxograma de aulas
insert into fluxograma_semanal (materia_id, dia_semana, horario_inicio, horario_fim) values
  ('a0000000-0000-4000-8000-000000000001', 1, '08:00', '10:00'),
  ('a0000000-0000-4000-8000-000000000001', 3, '08:00', '10:00'),
  ('a0000000-0000-4000-8000-000000000002', 2, '10:00', '12:00'),
  ('a0000000-0000-4000-8000-000000000002', 4, '10:00', '12:00'),
  ('a0000000-0000-4000-8000-000000000003', 2, '14:00', '16:00'),
  ('a0000000-0000-4000-8000-000000000004', 5, '14:00', '16:00');

-- ---------------------------------------------------------------------------
-- Treino
-- ---------------------------------------------------------------------------

insert into treinos (id, nome, tipo) values
  ('b0000000-0000-4000-8000-000000000001', 'Treino A — Peito e tríceps', 'hipertrofia'),
  ('b0000000-0000-4000-8000-000000000002', 'Treino B — Costas e bíceps', 'hipertrofia'),
  ('b0000000-0000-4000-8000-000000000003', 'Treino C — Pernas',          'hipertrofia');

insert into exercicios_treino (id, treino_id, nome, grupo_muscular, series, reps_alvo, carga_alvo, descanso_segundos) values
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Supino reto',        'peito',    4, 8,  80, 90),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Supino inclinado',   'peito',    3, 10, 60, 90),
  ('d0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Tríceps na barra',   'triceps',  3, 12, 35, 60),
  ('d0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', 'Puxada frontal',     'costas',   4, 10, 65, 90),
  ('d0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000002', 'Remada curvada',     'costas',   3, 8,  70, 90),
  ('d0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000002', 'Rosca direta',       'biceps',   3, 12, 30, 60),
  ('d0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000003', 'Agachamento livre',  'perna',    4, 8,  100, 120),
  ('d0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000003', 'Leg press',          'perna',    3, 12, 160, 90),
  ('d0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000003', 'Panturrilha',        'perna',    4, 15, 80, 45);

insert into fluxograma_semanal (treino_id, dia_semana, horario_inicio, horario_fim) values
  ('b0000000-0000-4000-8000-000000000001', 1, '19:00', '20:30'),
  ('b0000000-0000-4000-8000-000000000002', 3, '19:00', '20:30'),
  ('b0000000-0000-4000-8000-000000000003', 5, '19:00', '20:30'),
  ('b0000000-0000-4000-8000-000000000001', 6, '10:00', '11:30');

-- 8 semanas de execuções. O trigger de PR dispara sozinho a cada série, e a
-- carga sobe ao longo do tempo para o gráfico de progressão ter inclinação.
insert into execucoes_treino (id, treino_id, data)
select
  ('e1000000-0000-4000-8000-' || lpad((s.semana * 10 + t.ordem)::text, 12, '0'))::uuid,
  t.treino,
  (current_date - (s.semana * 7) - t.recuo)::date
from generate_series(0, 7) as s(semana)
cross join (values
  ('b0000000-0000-4000-8000-000000000001'::uuid, 1, 6),
  ('b0000000-0000-4000-8000-000000000002'::uuid, 2, 4),
  ('b0000000-0000-4000-8000-000000000003'::uuid, 3, 2)
) as t(treino, ordem, recuo)
where not (s.semana = 0 and t.ordem = 3);  -- treino C da semana atual ainda não feito

-- Séries: cada linha de execucoes_exercicio é UMA série (convenção 10.17).
-- A carga cresce ~1,5% por semana em direção ao presente.
insert into execucoes_exercicio (execucao_treino_id, exercicio_id, carga_real, reps_reais, rpe)
select
  ex.id,
  e.id,
  -- `current_date - ex.data` já devolve inteiro (dias) no Postgres, então não
  -- passa por extract/interval.
  round(
    (e.carga_alvo * (1 - (0.015 * ((current_date - ex.data) / 7.0))))::numeric,
    1
  ),
  greatest(e.reps_alvo - (serie.n / 3), 5),
  7 + (serie.n % 3)
from execucoes_treino ex
join exercicios_treino e on e.treino_id = ex.treino_id
cross join generate_series(1, 3) as serie(n)
where e.carga_alvo is not null;

-- Peso corporal em queda leve, para o gráfico discreto ter tendência
insert into registro_corporal (data, peso)
select (current_date - (n * 7))::date, round((82.5 + n * 0.28)::numeric, 1)
from generate_series(0, 11) as n
on conflict (data) do nothing;

insert into registro_lesoes (data, regiao, intensidade, observacao) values
  (current_date - 18, 'ombro direito', 4, 'Incômodo no supino inclinado'),
  (current_date - 4,  'lombar',        3, 'Após agachamento, melhorou com alongamento');

-- ---------------------------------------------------------------------------
-- Projetos — incluindo um esfriando de propósito
-- ---------------------------------------------------------------------------

insert into projetos (id, nome, descricao, status, data_inicio, prazo_alvo) values
  ('f0000000-0000-4000-8000-000000000001', 'Nexus',
   'Sistema de gestão pessoal — este aqui.', 'em_andamento',
   current_date - 60, current_date + 30),
  ('f0000000-0000-4000-8000-000000000002', 'TCC — proposta',
   'Levantamento bibliográfico e definição do tema.', 'em_andamento',
   current_date - 45, current_date + 90),
  ('f0000000-0000-4000-8000-000000000003', 'Reforma do quarto',
   'Marcenaria, pintura e iluminação.', 'pausado',
   current_date - 120, null),
  ('f0000000-0000-4000-8000-000000000004', 'Curso de inglês',
   'Retomar aulas e testar nível.', 'planejamento',
   current_date - 25, null),
  ('f0000000-0000-4000-8000-000000000005', 'Site do portfólio',
   'Trocar o tema antigo por algo próprio.', 'concluido',
   current_date - 150, current_date - 40);

insert into marcos_projeto (projeto_id, nome, status, data_prevista) values
  ('f0000000-0000-4000-8000-000000000001', 'Fundação e design system',   'feito',   current_date - 55),
  ('f0000000-0000-4000-8000-000000000001', 'Quatro pilares',             'feito',   current_date - 20),
  ('f0000000-0000-4000-8000-000000000001', 'Calendário e Home',          'feito',   current_date - 8),
  ('f0000000-0000-4000-8000-000000000001', 'Refinamento visual',         'fazendo', current_date + 10),
  ('f0000000-0000-4000-8000-000000000001', 'Deploy',                     'a_fazer', current_date + 25),
  ('f0000000-0000-4000-8000-000000000002', 'Definir tema',               'feito',   current_date - 30),
  ('f0000000-0000-4000-8000-000000000002', 'Fichamento de 10 artigos',   'fazendo', current_date + 14),
  ('f0000000-0000-4000-8000-000000000002', 'Entregar proposta',          'a_fazer', current_date + 60),
  ('f0000000-0000-4000-8000-000000000003', 'Orçamento da marcenaria',    'feito',   current_date - 100),
  ('f0000000-0000-4000-8000-000000000003', 'Escolher iluminação',        'a_fazer', null),
  ('f0000000-0000-4000-8000-000000000004', 'Fazer teste de nível',       'a_fazer', current_date + 7),
  ('f0000000-0000-4000-8000-000000000005', 'Publicar',                   'feito',   current_date - 42);

insert into log_progresso (projeto_id, data, conteudo) values
  ('f0000000-0000-4000-8000-000000000001', current_date,      'Bloco A do refinamento visual: skeletons e entrada escalonada.'),
  ('f0000000-0000-4000-8000-000000000001', current_date - 2,  'Grafo de conhecimento gerado; achou o favicon fora da paleta.'),
  ('f0000000-0000-4000-8000-000000000001', current_date - 8,  'Fase 7 fechada: code-splitting e navegação mobile.'),
  ('f0000000-0000-4000-8000-000000000001', current_date - 15, 'Calendário unificado com expansão de recorrência no cliente.'),
  ('f0000000-0000-4000-8000-000000000002', current_date - 5,  'Fichados 4 dos 10 artigos.'),
  ('f0000000-0000-4000-8000-000000000002', current_date - 19, 'Tema aprovado pelo orientador.'),
  -- Reforma sem log há mais de 14 dias -> momentum baixo, card esfria
  ('f0000000-0000-4000-8000-000000000003', current_date - 47, 'Orçamento fechado com o marceneiro.'),
  ('f0000000-0000-4000-8000-000000000005', current_date - 41, 'Portfólio no ar.');
-- Curso de inglês fica SEM nenhum log, para exercitar o caso "nunca recebeu
-- atenção" (momentumBaixo devolve true para null)

-- ---------------------------------------------------------------------------
-- Sono
-- ---------------------------------------------------------------------------

insert into planejamento_sono (dia_semana, hora_dormir_alvo, hora_acordar_alvo) values
  (0, '23:30', '08:00'),
  (1, '23:00', '06:40'),
  (2, '23:00', '06:40'),
  (3, '23:00', '06:40'),
  (4, '23:00', '06:40'),
  (5, '23:00', '06:40'),
  (6, '00:30', '09:00')
on conflict (dia_semana) do nothing;

-- 21 dias de registro, quase todos cruzando a meia-noite
insert into registro_sono (data, hora_dormir_real, hora_acordar_real)
select
  (current_date - n)::date,
  (time '22:40' + ((n * 13) % 70 || ' minutes')::interval),
  (time '06:20' + ((n * 7) % 55 || ' minutes')::interval)
from generate_series(1, 21) as n
on conflict (data) do nothing;
