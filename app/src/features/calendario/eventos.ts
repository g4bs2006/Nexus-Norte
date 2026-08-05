import { addDays, differenceInCalendarDays } from 'date-fns'
import { deISO, paraISO } from '@/lib/datas'
import { expandirRecorrencia, type ExcecaoRecorrencia } from '@/lib/recorrencia'
import type { PilarId } from '@/lib/pilares'

/**
 * Construção dos eventos do calendário unificado (plano, seção 6.1).
 *
 * Agrega sem duplicar tabelas: cada fonte continua sendo dona do seu dado e
 * aqui só é traduzida para eventos. É uma função pura — o intervalo visível
 * entra como parâmetro (plano, seção 9).
 */

export type CamadaCalendario = PilarId | 'sono'

/**
 * Tipo do evento, mais específico que a camada.
 *
 * `camada` resolve a cor e o filtro por pilar, mas não distingue prova de aula —
 * as duas são 'estudos'. O tipo é o que permite separar compromisso datado
 * (prova, conta, marco) de rotina recorrente (aula, treino, sono).
 */
export type TipoEvento =
  'prova' | 'aula' | 'treino' | 'conta' | 'marco' | 'sono'

/**
 * Tipos que representam prazo, e não rotina.
 *
 * São os que valem destaque: têm data marcada, acontecem uma vez e passam. Aula
 * e treino se repetem toda semana; listá-los junto afogaria as provas.
 */
const TIPOS_IMPORTANTES: readonly TipoEvento[] = ['prova', 'conta', 'marco']

export interface EventoCalendario {
  id: string
  titulo: string
  /** ISO date (`YYYY-MM-DD`) para dia inteiro, ou ISO datetime com horário. */
  inicio: string
  fim?: string
  diaInteiro: boolean
  camada: CamadaCalendario
  tipo: TipoEvento
  /** Destino ao clicar. Ausente quando não há página para onde ir. */
  rota?: string
  /**
   * Id da linha de origem, sem a data. Nos eventos de fluxograma é o id da
   * regra, que é o que `conclusoes_fluxograma` referencia — a faixa de carga usa
   * para saber se o check daquele dia saiu. Existe para não obrigar ninguém a
   * fatiar o `id` composto de volta.
   */
  origemId?: string
}

export interface Intervalo {
  de: string
  ate: string
}

export function ehImportante(evento: EventoCalendario): boolean {
  return TIPOS_IMPORTANTES.includes(evento.tipo)
}

/** `08:00:00` → `08:00` */
function hhmm(hora: string): string {
  return hora.slice(0, 5)
}

function comHorario(data: string, hora: string): string {
  return `${data}T${hhmm(hora)}:00`
}

// --- Fontes -----------------------------------------------------------------

export interface FonteAvaliacao {
  id: string
  nome: string
  data: string | null
  nota: number | null
  materia_id: string
}

export interface FonteFluxograma {
  id: string
  dia_semana: number
  horario_inicio: string
  horario_fim: string
  materia_id: string | null
  treino_id: string | null
}

export interface FonteConta {
  id: string
  descricao: string | null
  valor: number
  data: string
  data_vencimento: string | null
  categoria_id: string
  /** `tipo` da categoria — só despesas fixas viram conta no calendário. */
  categoria_tipo: string | null
  categoria_natureza: string
}

export interface FontePlanejamentoSono {
  id: string
  dia_semana: number
  hora_dormir_alvo: string
  hora_acordar_alvo: string
}

export interface FonteMarco {
  id: string
  nome: string
  data_prevista: string | null
  projeto_id: string
  projeto_nome: string
}

export interface FontesCalendario {
  avaliacoes: readonly FonteAvaliacao[]
  fluxograma: readonly FonteFluxograma[]
  excecoes: readonly ExcecaoRecorrencia[]
  contas: readonly FonteConta[]
  planejamentoSono: readonly FontePlanejamentoSono[]
  marcos: readonly FonteMarco[]
  /** Rótulos para resolver os ids do fluxograma. */
  nomePorMateria: ReadonlyMap<string, string>
  nomePorTreino: ReadonlyMap<string, string>
}

// --- Construtores por camada ------------------------------------------------

/** Provas: avaliações com data marcada e ainda sem nota lançada. */
export function eventosAvaliacoes(
  avaliacoes: readonly FonteAvaliacao[],
  intervalo: Intervalo,
  nomePorMateria: ReadonlyMap<string, string>,
): EventoCalendario[] {
  return avaliacoes.flatMap((avaliacao) => {
    if (avaliacao.data === null) return []
    if (avaliacao.data < intervalo.de || avaliacao.data > intervalo.ate)
      return []

    const materia = nomePorMateria.get(avaliacao.materia_id)
    return [
      {
        id: `avaliacao:${avaliacao.id}`,
        titulo: materia ? `${avaliacao.nome} — ${materia}` : avaliacao.nome,
        inicio: avaliacao.data,
        diaInteiro: true,
        camada: 'estudos' as const,
        tipo: 'prova' as const,
        rota: `/estudos/${avaliacao.materia_id}`,
      },
    ]
  })
}

/**
 * Aulas e treinos recorrentes, expandidos no cliente (resolução 10.5).
 * A camada sai de qual FK está preenchida — a tabela é compartilhada (10.6).
 */
export function eventosFluxograma(
  fluxograma: readonly FonteFluxograma[],
  excecoes: readonly ExcecaoRecorrencia[],
  intervalo: Intervalo,
  nomePorMateria: ReadonlyMap<string, string>,
  nomePorTreino: ReadonlyMap<string, string>,
): EventoCalendario[] {
  return expandirRecorrencia(fluxograma, intervalo, excecoes).map(
    (ocorrencia) => {
      const { regra, data, remarcada } = ocorrencia
      const ehAula = regra.materia_id !== null

      const nome = ehAula
        ? (nomePorMateria.get(regra.materia_id as string) ?? 'Aula')
        : (nomePorTreino.get(regra.treino_id as string) ?? 'Treino')

      return {
        id: `fluxograma:${regra.id}:${data}`,
        origemId: regra.id,
        titulo: remarcada ? `${nome} (remarcado)` : nome,
        inicio: comHorario(data, regra.horario_inicio),
        fim: comHorario(data, regra.horario_fim),
        diaInteiro: false,
        camada: ehAula ? ('estudos' as const) : ('treino' as const),
        tipo: ehAula ? ('aula' as const) : ('treino' as const),
        // Treino não tem sub-página própria; leva para a listagem do pilar
        rota: ehAula ? `/estudos/${regra.materia_id as string}` : '/treino',
      }
    },
  )
}

/**
 * Contas a pagar: lançamentos de categoria de despesa FIXA.
 * Usa `data_vencimento`, caindo em `data` quando não houver (resolução 10.2).
 */
export function eventosContas(
  contas: readonly FonteConta[],
  intervalo: Intervalo,
): EventoCalendario[] {
  return contas.flatMap((conta) => {
    if (conta.categoria_natureza !== 'despesa') return []
    if (conta.categoria_tipo !== 'fixo') return []

    const data = conta.data_vencimento ?? conta.data
    if (data < intervalo.de || data > intervalo.ate) return []

    return [
      {
        id: `conta:${conta.id}`,
        titulo: conta.descricao ?? 'Conta a pagar',
        inicio: data,
        diaInteiro: true,
        camada: 'financeiro' as const,
        tipo: 'conta' as const,
        rota: `/financeiro/categorias/${conta.categoria_id}`,
      },
    ]
  })
}

/**
 * Blocos de sono planejado, um por dia do intervalo.
 *
 * Quando a hora de acordar é menor que a de dormir, o bloco atravessa a
 * meia-noite e termina no dia seguinte — mesma lógica da coluna gerada
 * `registro_sono.horas_calculadas`.
 */
export function eventosSono(
  planejamento: readonly FontePlanejamentoSono[],
  intervalo: Intervalo,
): EventoCalendario[] {
  return expandirRecorrencia(planejamento, intervalo).map((ocorrencia) => {
    const { regra, data } = ocorrencia
    const cruzaMeiaNoite =
      hhmm(regra.hora_acordar_alvo) <= hhmm(regra.hora_dormir_alvo)
    const dataFim = cruzaMeiaNoite ? paraISO(addDays(deISO(data), 1)) : data

    return {
      id: `sono:${regra.id}:${data}`,
      titulo: 'Sono',
      inicio: comHorario(data, regra.hora_dormir_alvo),
      fim: comHorario(dataFim, regra.hora_acordar_alvo),
      diaInteiro: false,
      camada: 'sono' as const,
      tipo: 'sono' as const,
      // Sono é contexto de fundo; não há para onde navegar
    }
  })
}

/** Marcos de projeto com data prevista. */
export function eventosMarcos(
  marcos: readonly FonteMarco[],
  intervalo: Intervalo,
): EventoCalendario[] {
  return marcos.flatMap((marco) => {
    if (marco.data_prevista === null) return []
    if (
      marco.data_prevista < intervalo.de ||
      marco.data_prevista > intervalo.ate
    ) {
      return []
    }

    return [
      {
        id: `marco:${marco.id}`,
        titulo: `${marco.nome} — ${marco.projeto_nome}`,
        inicio: marco.data_prevista,
        diaInteiro: true,
        camada: 'projetos' as const,
        tipo: 'marco' as const,
        rota: `/projetos/${marco.projeto_id}`,
      },
    ]
  })
}

/** Junta todas as camadas em uma única lista de eventos. */
export function construirEventos(
  fontes: FontesCalendario,
  intervalo: Intervalo,
): EventoCalendario[] {
  return [
    ...eventosAvaliacoes(fontes.avaliacoes, intervalo, fontes.nomePorMateria),
    ...eventosFluxograma(
      fontes.fluxograma,
      fontes.excecoes,
      intervalo,
      fontes.nomePorMateria,
      fontes.nomePorTreino,
    ),
    ...eventosContas(fontes.contas, intervalo),
    ...eventosSono(fontes.planejamentoSono, intervalo),
    ...eventosMarcos(fontes.marcos, intervalo),
  ]
}

export interface EventoComPrazo extends EventoCalendario {
  /** Dias até a data. Negativo indica atrasado. */
  dias: number
}

/**
 * Só os compromissos datados, ordenados pelo mais próximo.
 *
 * Alimenta os próximos eventos da Home. Sem
 * este filtro, as ~20 ocorrências de aula e treino de duas semanas ocupariam
 * todos os lugares e a prova nunca apareceria.
 */
export function eventosComPrazo(
  eventos: readonly EventoCalendario[],
  hoje: Date,
): EventoComPrazo[] {
  return eventos
    .filter(ehImportante)
    .map((evento) => ({
      ...evento,
      dias: differenceInCalendarDays(deISO(evento.inicio.slice(0, 10)), hoje),
    }))
    .sort((a, b) => a.dias - b.dias || a.titulo.localeCompare(b.titulo))
}

/** Cor de cada camada, alinhada à paleta por pilar (plano 1.2 / 6.2). */
export const COR_CAMADA: Record<CamadaCalendario, string> = {
  financeiro: 'var(--financeiro)',
  estudos: 'var(--estudos)',
  treino: 'var(--treino)',
  projetos: 'var(--projetos)',
  sono: 'var(--sono)',
}

export const ROTULO_CAMADA: Record<CamadaCalendario, string> = {
  financeiro: 'Contas',
  estudos: 'Aulas e provas',
  treino: 'Treinos',
  projetos: 'Marcos',
  sono: 'Sono',
}

export const ROTULO_TIPO: Record<TipoEvento, string> = {
  prova: 'Prova',
  aula: 'Aula',
  treino: 'Treino',
  conta: 'Conta',
  marco: 'Marco',
  sono: 'Sono',
}
