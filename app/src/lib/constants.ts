/**
 * Constantes de domínio.
 *
 * Regra do plano (seção 9 / resolução 10.3): valores usados em fórmulas ficam
 * declarados aqui, uma única vez — nunca hardcoded em múltiplos pontos.
 */

/**
 * Nota mínima para aprovação. Usada por `media_projetada` (resolução 10.3),
 * que assume esta nota para avaliações ainda sem resultado lançado.
 */
export const NOTA_MINIMA_APROVACAO = 6.0

/**
 * Margem acima da nota mínima dentro da qual a matéria entra em 🟡 atenção,
 * mesmo sem estar reprovada (plano 3.2 — `risco_reprovacao`).
 */
export const MARGEM_ATENCAO_MEDIA = 1

/**
 * Faltas restantes a partir das quais a matéria entra em 🟡 atenção.
 */
export const FALTAS_ATENCAO = 2

/**
 * Dias sem log de progresso a partir dos quais um projeto é considerado
 * "momentum baixo" e esfria visualmente (plano 5.2).
 */
export const DIAS_MOMENTUM_BAIXO = 14

/**
 * Semanas consecutivas sem progressão de carga que disparam sinal de
 * estagnação em um exercício (plano 4.2).
 */
export const SEMANAS_SINAL_ESTAGNACAO = 3

/**
 * Meses consecutivos acima da meta que tornam uma categoria variável
 * candidata a corte (plano 2.2 / resolução 10.9).
 */
export const MESES_CANDIDATO_CORTE = 2

/**
 * Janela de meses usada para estimar o gasto variável nos meses projetados
 * (resolução 10.43). Com menos histórico que isto, a projeção usa o que
 * houver e a UI sinaliza baixa confiança em vez de aparentar a mesma firmeza
 * de uma janela completa.
 */
export const MESES_MEDIA_VARIAVEL = 3

/**
 * Quantidade padrão de meses exibidos na tabela de planejamento financeiro
 * de longo prazo (resolução 10.43).
 */
export const HORIZONTE_PROJECAO_PADRAO = 6

/**
 * Piso do horizonte do simulador (resolução 10.47.1). O horizonte real é
 * `max(HORIZONTE_MINIMO, numeroParcelas + 1)` — o `+1` mostra ao menos um
 * mês depois da última parcela, para ficar visível o alívio no fluxo quando
 * ela sai. Compromisso hipotético sem `data_fim` também cai neste piso: não
 * existe "última parcela" para ancorar uma janela maior.
 */
export const HORIZONTE_MINIMO = 6

/**
 * Limite de comprometimento (parcelas + compromissos de despesa do mês ÷
 * receita prevista do mês) a partir do qual o veredicto do simulador passa
 * de 🟢 para 🟡, mesmo com o saldo acumulado nunca ficando negativo
 * (resolução 10.47.7).
 */
export const LIMITE_COMPROMETIMENTO_PADRAO = 30

/**
 * Dias da semana na convenção de `Date.getDay()` — 0 = domingo.
 * Alinhado com `planejamento_sono.dia_semana` e `fluxograma_semanal.dia_semana`.
 */
export const DIAS_SEMANA = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const

export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6
