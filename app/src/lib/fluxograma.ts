/**
 * Helpers da grade semanal do fluxograma.
 *
 * Moram aqui, e não dentro de um dos componentes, porque duas grades precisam
 * deles: a compartilhada por Estudos e Treino (`GradeFluxograma`) e a dos
 * blocos fixos, que tem layout próprio no mobile. Duplicar significava manter
 * a mesma regra em dois arquivos que ninguém lembraria de mudar juntos.
 */

/** Ordem de exibição: segunda a domingo, apesar de `dia_semana` usar 0 = domingo. */
export const ORDEM_DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 0] as const

/** `08:00:00` → `08:00` */
export function horaCurta(valor: string): string {
  return valor.slice(0, 5)
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
