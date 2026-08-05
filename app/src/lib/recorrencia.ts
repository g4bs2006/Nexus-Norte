import { eachDayOfInterval } from 'date-fns'
import { deISO, paraISO } from './datas'

/**
 * Expansão de recorrência semanal em ocorrências datadas (resolução 10.5).
 *
 * A recorrência NÃO é materializada no banco: `fluxograma_semanal` guarda o
 * padrão (um registro por dia da semana) e a expansão acontece aqui, no
 * cliente, apenas para o intervalo visível. Isso evita duplicar dados e
 * permite exceções pontuais sem reescrever o padrão.
 *
 * Função pura — o intervalo entra como parâmetro (plano, seção 9).
 */

export interface RegraRecorrente {
  id: string
  /** 0 = domingo … 6 = sábado, convenção de `Date.getDay()`. */
  dia_semana: number
}

export interface ExcecaoRecorrencia {
  /** Id da regra em `fluxograma_semanal`. */
  fluxograma_id: string
  data: string
  status: 'cancelado' | 'remarcado'
}

export interface Ocorrencia<T extends RegraRecorrente> {
  regra: T
  /** Data da ocorrência, em ISO (`YYYY-MM-DD`). */
  data: string
  /** True quando há exceção com status 'remarcado' para esta data. */
  remarcada: boolean
}

export interface Intervalo {
  de: string
  ate: string
}

function chaveExcecao(fluxogramaId: string, data: string): string {
  return `${fluxogramaId}@${data}`
}

/**
 * Gera as ocorrências das regras dentro do intervalo.
 *
 * Ocorrências canceladas por exceção são **omitidas**; remarcadas são
 * mantidas e sinalizadas em `remarcada`, para que a UI possa destacá-las.
 */
export function expandirRecorrencia<T extends RegraRecorrente>(
  regras: readonly T[],
  intervalo: Intervalo,
  excecoes: readonly ExcecaoRecorrencia[] = [],
): Ocorrencia<T>[] {
  if (regras.length === 0) return []

  const inicio = deISO(intervalo.de)
  const fim = deISO(intervalo.ate)
  if (fim < inicio) return []

  const porStatus = new Map<string, 'cancelado' | 'remarcado'>()
  for (const excecao of excecoes) {
    porStatus.set(
      chaveExcecao(excecao.fluxograma_id, excecao.data),
      excecao.status,
    )
  }

  // Índice por dia da semana para não varrer todas as regras a cada data
  const porDia = new Map<number, T[]>()
  for (const regra of regras) {
    const lista = porDia.get(regra.dia_semana)
    if (lista) lista.push(regra)
    else porDia.set(regra.dia_semana, [regra])
  }

  const ocorrencias: Ocorrencia<T>[] = []

  for (const dia of eachDayOfInterval({ start: inicio, end: fim })) {
    const regrasDoDia = porDia.get(dia.getDay())
    if (!regrasDoDia) continue

    const dataISO = paraISO(dia)
    for (const regra of regrasDoDia) {
      const status = porStatus.get(chaveExcecao(regra.id, dataISO))
      if (status === 'cancelado') continue
      ocorrencias.push({
        regra,
        data: dataISO,
        remarcada: status === 'remarcado',
      })
    }
  }

  return ocorrencias
}

/** Ocorrências de um único dia — atalho para os checks diários. */
export function ocorrenciasDoDia<T extends RegraRecorrente>(
  regras: readonly T[],
  data: string,
  excecoes: readonly ExcecaoRecorrencia[] = [],
): Ocorrencia<T>[] {
  return expandirRecorrencia(regras, { de: data, ate: data }, excecoes)
}
