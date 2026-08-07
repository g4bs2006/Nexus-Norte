import { eachDayOfInterval, endOfMonth, getDaysInMonth } from 'date-fns'
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

// --- Recorrência mensal (resolução 10.43) -----------------------------------
//
// Irmã de `expandirRecorrencia`: mesmo princípio (padrão guardado, expansão
// na leitura), trocando "dia da semana" por "dia do mês". Compromissos
// recorrentes (salário, aluguel) vivem aqui, não na semanal, porque a
// granularidade e a regra de borda (dia inexistente no mês) são diferentes o
// bastante para não caber na mesma função sem `if`s cruzados.

export interface RegraMensal {
  id: string
  /** 1-31. Ver regra de borda na função de expansão. */
  dia_mes: number
  data_inicio: string
  /** `null` = sem previsão de término. */
  data_fim: string | null
}

export interface OcorrenciaMensal<T extends RegraMensal> {
  regra: T
  /** Data da ocorrência dentro do mês, em ISO. */
  data: string
}

/**
 * Gera a ocorrência de cada regra nos meses pedidos.
 *
 * `meses` é o primeiro dia de cada mês em ISO — mesma convenção de
 * `ultimosMeses`/`mesDeISO` (lib/datas.ts), não `'YYYY-MM'`.
 *
 * Regra de borda: `dia_mes = 31` não existe em fevereiro. A ocorrência cai no
 * **último dia daquele mês**, nunca transborda para o mês seguinte —
 * transbordar mudaria o mês de competência do compromisso, que é justamente o
 * que a projeção tenta medir.
 *
 * Uma regra só gera ocorrência em meses dentro do seu período
 * (`data_inicio`/`data_fim`) — comparação por string ISO, que ordena
 * corretamente por ser `YYYY-MM-DD`.
 */
export function expandirRecorrenciaMensal<T extends RegraMensal>(
  regras: readonly T[],
  meses: readonly string[],
): OcorrenciaMensal<T>[] {
  const ocorrencias: OcorrenciaMensal<T>[] = []

  for (const primeiroDia of meses) {
    const data = deISO(primeiroDia)
    const ultimoDiaDoMes = paraISO(endOfMonth(data))
    const diasNoMes = getDaysInMonth(data)

    for (const regra of regras) {
      if (regra.data_inicio > ultimoDiaDoMes) continue
      if (regra.data_fim && regra.data_fim < primeiroDia) continue

      const diaEfetivo = Math.min(regra.dia_mes, diasNoMes)
      const dataOcorrencia = `${primeiroDia.slice(0, 8)}${String(diaEfetivo).padStart(2, '0')}`

      // Regra que começou ou terminou no meio do mês: a ocorrência ainda
      // pode cair fora do período mesmo com o mês inteiro elegível.
      if (dataOcorrencia < regra.data_inicio) continue
      if (regra.data_fim && dataOcorrencia > regra.data_fim) continue

      ocorrencias.push({ regra, data: dataOcorrencia })
    }
  }

  return ocorrencias
}
