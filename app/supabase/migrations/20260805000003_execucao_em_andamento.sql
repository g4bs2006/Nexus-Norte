-- =============================================================================
-- Execução em andamento (resolução 10.21)
--
-- Até aqui uma linha em `execucoes_treino` só nascia quando a sessão inteira era
-- submetida: tudo ficava em estado do React até o botão final, e sair do app no
-- meio do treino perdia o que já havia sido anotado.
--
-- Com a gravação série a série, a linha passa a nascer na PRIMEIRA série salva.
-- Isso muda o que ela significa — de "terminei" para "comecei" — e é por isso que
-- `finalizado_em` precisa existir: sem ela, uma sessão abandonada contaria como
-- treino feito na frequência da semana.
-- =============================================================================

alter table public.execucoes_treino
  add column finalizado_em timestamptz;

-- As execuções que já existem foram todas registradas de uma vez, ou seja,
-- estavam terminadas no instante em que nasceram. Sem este backfill elas
-- apareceriam como "em andamento" e sairiam da contagem da semana.
update public.execucoes_treino
set finalizado_em = created_at
where finalizado_em is null;

/*
 * No máximo uma sessão aberta por vez.
 *
 * Índice único sobre uma expressão que é sempre `true` nas linhas do predicado —
 * é o idioma para "no máximo uma linha satisfazendo esta condição". Duas sessões
 * abertas ao mesmo tempo não são um estado que signifique algo: você treina uma
 * coisa de cada vez, e ter duas em aberto tornaria ambíguo qual delas o aviso de
 * "continuar" deve retomar.
 */
create unique index execucoes_treino_uma_aberta
  on public.execucoes_treino ((finalizado_em is null))
  where finalizado_em is null;

comment on column public.execucoes_treino.finalizado_em is
  'Quando a sessão foi encerrada. Nulo = em andamento; só as finalizadas contam na frequência da semana.';
