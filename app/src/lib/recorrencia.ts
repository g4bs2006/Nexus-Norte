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
  /**
   * Horários do padrão. Opcionais porque a interface é o contrato mínimo —
   * as regras de fluxograma sempre os têm, e é o que a remarcação sobrescreve.
   */
  horario_inicio?: string
  horario_fim?: string
}

export interface ExcecaoRecorrencia {
  /** Id da regra em `fluxograma_semanal`. */
  fluxograma_id: string
  /** Data ORIGINAL, a que saiu do padrão. */
  data: string
  status: 'cancelado' | 'remarcado'
  /** Destino da remarcação. Nulo em 'cancelado' (resolução 10.19). */
  nova_data?: string | null
  /** Nulos quando a remarcação só muda o dia e herda o horário do padrão. */
  novo_horario_inicio?: string | null
  novo_horario_fim?: string | null
}

export interface Ocorrencia<T extends RegraRecorrente> {
  /**
   * A regra. Numa ocorrência remarcada com horário próprio, vem com os
   * horários já sobrescritos — quem consome lê `regra.horario_inicio` e acerta
   * sem precisar saber que houve remarcação.
   */
  regra: T
  /** Data da ocorrência, em ISO (`YYYY-MM-DD`). Já é a nova, se remarcada. */
  data: string
  /** True quando esta ocorrência é o destino de uma remarcação. */
  remarcada: boolean
  /** Data de origem, presente só em ocorrência remarcada. */
  dataOriginal?: string
}

export interface Intervalo {
  de: string
  ate: string
}

function chaveExcecao(fluxogramaId: string, data: string): string {
  return `${fluxogramaId}@${data}`
}

/**
 * Aplica o horário da remarcação sobre a regra.
 *
 * O cast é intencional e contido: só substitui campos que a própria
 * `RegraRecorrente` declara, então o objeto continua sendo um `T` válido. Fazer
 * isso aqui é o que permite a quem consome ler `regra.horario_inicio` sem
 * precisar checar se houve remarcação — a alternativa era espalhar
 * `excecao.novo_horario ?? regra.horario` por cada tela.
 */
function comHorarioSobrescrito<T extends RegraRecorrente>(
  regra: T,
  excecao: ExcecaoRecorrencia,
): T {
  if (!excecao.novo_horario_inicio || !excecao.novo_horario_fim) return regra
  return {
    ...regra,
    horario_inicio: excecao.novo_horario_inicio,
    horario_fim: excecao.novo_horario_fim,
  } as T
}

/**
 * Gera as ocorrências das regras dentro do intervalo.
 *
 * Exceções (resolução 10.19):
 * - `cancelado` **omite** a ocorrência da data original
 * - `remarcado` **move** a ocorrência para `nova_data`, opcionalmente com
 *   horário próprio, e a marca com `remarcada`
 *
 * A ocorrência remarcada aparece na data de destino, não na original. Por isso
 * ela precisa entrar por um segundo caminho: o destino pode cair num dia da
 * semana que a regra não cobre — é justamente o caso de "treinei quinta em vez
 * de terça" — e o laço por dia da semana jamais a geraria.
 *
 * Consequência para quem busca as exceções: o filtro precisa aceitar as que têm
 * `data` OU `nova_data` no intervalo. Uma ocorrência empurrada de 31/07 para
 * 02/08 tem data original fora de agosto e precisa aparecer em agosto.
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

  const porRegraEData = new Map<string, ExcecaoRecorrencia>()
  for (const excecao of excecoes) {
    porRegraEData.set(
      chaveExcecao(excecao.fluxograma_id, excecao.data),
      excecao,
    )
  }

  const porId = new Map<string, T>()
  // Índice por dia da semana para não varrer todas as regras a cada data
  const porDia = new Map<number, T[]>()
  for (const regra of regras) {
    porId.set(regra.id, regra)
    const lista = porDia.get(regra.dia_semana)
    if (lista) lista.push(regra)
    else porDia.set(regra.dia_semana, [regra])
  }

  const ocorrencias: Ocorrencia<T>[] = []

  // 1. O padrão, menos o que foi cancelado ou movido para fora desta data
  for (const dia of eachDayOfInterval({ start: inicio, end: fim })) {
    const regrasDoDia = porDia.get(dia.getDay())
    if (!regrasDoDia) continue

    const dataISO = paraISO(dia)
    for (const regra of regrasDoDia) {
      if (porRegraEData.has(chaveExcecao(regra.id, dataISO))) continue
      ocorrencias.push({ regra, data: dataISO, remarcada: false })
    }
  }

  // 2. Os destinos das remarcações que caem no intervalo
  for (const excecao of excecoes) {
    if (excecao.status !== 'remarcado' || !excecao.nova_data) continue
    if (excecao.nova_data < intervalo.de || excecao.nova_data > intervalo.ate) {
      continue
    }

    const regra = porId.get(excecao.fluxograma_id)
    // Regra ausente da lista recebida: a exceção não tem o que remarcar
    if (!regra) continue

    ocorrencias.push({
      regra: comHorarioSobrescrito(regra, excecao),
      data: excecao.nova_data,
      remarcada: true,
      dataOriginal: excecao.data,
    })
  }

  // Sem isto os destinos de remarcação viriam todos no fim da lista, e as telas
  // que mostram "as próximas N" pegariam a ordem errada. O horário entra no
  // critério porque uma remarcada empurrada para um dia que já tinha aula
  // precisa se encaixar na hora certa, não no fim do dia.
  ocorrencias.sort(
    (a, b) =>
      a.data.localeCompare(b.data) ||
      (a.regra.horario_inicio ?? '').localeCompare(
        b.regra.horario_inicio ?? '',
      ),
  )

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
