/**
 * Helpers da grade semanal do fluxograma.
 *
 * Moram aqui, e não dentro de um dos componentes, porque duas grades precisam
 * deles: a compartilhada por Estudos e Treino (`GradeFluxograma`) e a dos
 * blocos fixos, que tem layout próprio no mobile. Duplicar significava manter
 * a mesma regra em dois arquivos que ninguém lembraria de mudar juntos.
 */

/**
 * Ordem de exibição das grades semanais: domingo a sábado, igual ao valor de
 * `dia_semana` — o índice na lista é o próprio dia.
 *
 * Nasceu como `[1,2,3,4,5,6,0]` no spec dos blocos fixos, com o argumento de
 * que o fluxograma é configuração de rotina e não visualização de calendário.
 * O spec 2 revogou isso: as duas ordens se encontram dentro de
 * `GradePlanejamentoSemanal`, que é grade de rotina e de calendário ao mesmo
 * tempo. Duas ordens convivendo custam mais do que o argumento vale.
 */
export const ORDEM_DIAS_SEMANA = [0, 1, 2, 3, 4, 5, 6] as const

/** `08:00:00` → `08:00` */
export function horaCurta(valor: string): string {
  return valor.slice(0, 5)
}

/** `HH:MM` ou `HH:MM:SS` → minutos desde a meia-noite. `08:00` → 480. */
export function minutosDe(valor: string): number {
  const [horas = '0', minutos = '0'] = valor.split(':')
  return Number(horas) * 60 + Number(minutos)
}

interface ItemDaSemana {
  dia_semana: number
  horario_inicio: string
}

/** Agrupa por dia da semana, cada dia já ordenado por horário de início. */
export function agruparPorDiaSemana<T extends ItemDaSemana>(
  itens: readonly T[],
): Map<number, T[]> {
  const porDia = new Map<number, T[]>()
  for (const item of itens) {
    const lista = porDia.get(item.dia_semana)
    if (lista) lista.push(item)
    else porDia.set(item.dia_semana, [item])
  }
  for (const lista of porDia.values()) {
    lista.sort((a, b) => a.horario_inicio.localeCompare(b.horario_inicio))
  }
  return porDia
}
