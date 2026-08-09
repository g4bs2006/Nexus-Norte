import type { ExcecaoRecorrencia } from '@/lib/recorrencia'

/**
 * Regra de fluxograma já com o nome resolvido.
 *
 * O rótulo entra pronto porque quem sabe traduzir `materia_id` em "Cálculo II"
 * é a página, que tem as queries. Aqui só interessa o par id → nome.
 */
export interface RegraRotulada {
  id: string
  /** `HH:MM:SS` como vem do banco. */
  horario_inicio: string
  rotulo: string
}

export interface CanceladaDeHoje {
  fluxogramaId: string
  rotulo: string
  /** `HH:MM`, já truncado para exibição. */
  horario: string
  data: string
}

/**
 * As ocorrências de hoje que foram canceladas, para continuarem listadas
 * riscadas com opção de desfazer.
 *
 * Sai das exceções e não das ocorrências: a expansão justamente as omite, e sem
 * esta derivação não haveria caminho de volta depois de cancelar por engano.
 *
 * Remarcação não entra: ela não sumiu, mudou de lugar — e aparece na data de
 * destino por conta própria.
 */
export function canceladasDeHoje(
  regras: readonly RegraRotulada[],
  excecoes: readonly ExcecaoRecorrencia[],
  hojeISO: string,
): CanceladaDeHoje[] {
  const porId = new Map(regras.map((regra) => [regra.id, regra]))

  return excecoes.flatMap((excecao) => {
    if (excecao.status !== 'cancelado' || excecao.data !== hojeISO) return []

    const regra = porId.get(excecao.fluxograma_id)
    if (!regra) return []

    return [
      {
        fluxogramaId: excecao.fluxograma_id,
        rotulo: regra.rotulo,
        horario: regra.horario_inicio.slice(0, 5),
        data: excecao.data,
      },
    ]
  })
}
