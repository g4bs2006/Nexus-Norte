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
  | 'prova'
  | 'aula'
  | 'treino'
  | 'conta'
  | 'marco'
  | 'sono'
  /** Sessão de estudo registrada — fato, não rotina prevista. */
  | 'estudo'

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
   * O que aconteceu com o compromisso, quando se sabe.
   *
   * Ausente é o padrão: rotina prevista, sem informação sobre o desfecho. A
   * agenda existia só com esse caso, e por isso mostrava o **plano** e nunca o
   * **fato** — treino registrado fora do previsto não tinha por onde aparecer, e
   * cancelar o previsto apagava a única linha do dia.
   *
   * - `feito` — aconteceu de verdade, vindo de `execucoes_treino` ou
   *   `sessoes_estudo`.
   * - `cancelado` — estava previsto e foi desmarcado. Só é emitido para dias que
   *   já chegaram: no futuro, desmarcado é simplesmente fora do plano.
   */
  estado?: 'feito' | 'cancelado'
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

/**
 * Treino que aconteceu. `hora_inicio` e `duracao_minutos` são **informados pelo
 * usuário** (resoluções 10.23 e 10.24).
 *
 * `finalizado_em` entra só para separar sessão concluída de sessão abandonada no
 * meio. **Nunca** para dizer a que hora o treino foi: é timestamp de sistema, e
 * marca quando o registro terminou. Foi exatamente esse erro que a 10.24
 * corrigiu ao calcular duração de `finalizado_em - created_at`.
 */
export interface FonteExecucaoTreino {
  id: string
  treino_id: string
  data: string
  finalizado_em: string | null
  hora_inicio: string | null
  duracao_minutos: number | null
}

/** Sessão de estudo registrada. Não tem hora — só data e duração. */
export interface FonteSessaoEstudo {
  id: string
  materia_id: string
  data: string
  duracao_minutos: number
}

export interface FontesCalendario {
  avaliacoes: readonly FonteAvaliacao[]
  fluxograma: readonly FonteFluxograma[]
  excecoes: readonly ExcecaoRecorrencia[]
  contas: readonly FonteConta[]
  planejamentoSono: readonly FontePlanejamentoSono[]
  marcos: readonly FonteMarco[]
  execucoesTreino: readonly FonteExecucaoTreino[]
  sessoesEstudo: readonly FonteSessaoEstudo[]
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
/** Chave de reconciliação entre o treino previsto e o treino que aconteceu. */
export function chaveTreinoData(treinoId: string, data: string): string {
  return `${treinoId}@${data}`
}

export function eventosFluxograma(
  fluxograma: readonly FonteFluxograma[],
  excecoes: readonly ExcecaoRecorrencia[],
  intervalo: Intervalo,
  nomePorMateria: ReadonlyMap<string, string>,
  nomePorTreino: ReadonlyMap<string, string>,
  /**
   * Chaves `treinoId@data` que já têm execução registrada, para a ocorrência
   * prevista **não** sair como segunda linha.
   *
   * Sem isso, todo dia em que o treino previsto foi feito mostraria duas linhas
   * do mesmo treino — a prevista e a realizada. Quem sobrevive é a realizada,
   * porque ela é o fato e carrega a hora que o usuário informou.
   */
  treinosFeitos: ReadonlySet<string> = new Set(),
): EventoCalendario[] {
  return expandirRecorrencia(fluxograma, intervalo, excecoes)
    .filter(
      (ocorrencia) =>
        ocorrencia.regra.treino_id === null ||
        !treinosFeitos.has(
          chaveTreinoData(ocorrencia.regra.treino_id, ocorrencia.data),
        ),
    )
    .map((ocorrencia) => {
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
    })
}

/**
 * Treinos que aconteceram (resolução 10.31).
 *
 * Só sessões **finalizadas**: a linha nasce na primeira série gravada, e treino
 * abandonado no meio não é treino feito — mesma regra da frequência (10.21).
 *
 * A hora vem de `hora_inicio`, informada pelo usuário. Quando ela é nula o evento
 * é de dia inteiro: preferir a ausência a derivar hora de `finalizado_em`, que
 * mediria quando o *registro* terminou (10.24). No dia 04/08 do banco real isso é
 * a diferença entre "sem hora" e um falso "08:09".
 */
export function eventosExecucoesTreino(
  execucoes: readonly FonteExecucaoTreino[],
  intervalo: Intervalo,
  nomePorTreino: ReadonlyMap<string, string>,
): EventoCalendario[] {
  return execucoes.flatMap((execucao) => {
    if (execucao.finalizado_em === null) return []
    if (execucao.data < intervalo.de || execucao.data > intervalo.ate) return []

    const nome = nomePorTreino.get(execucao.treino_id) ?? 'Treino'
    const comHora = execucao.hora_inicio !== null

    return [
      {
        id: `execucao:${execucao.id}`,
        origemId: execucao.treino_id,
        titulo: nome,
        inicio: comHora
          ? comHorario(execucao.data, execucao.hora_inicio as string)
          : execucao.data,
        diaInteiro: !comHora,
        camada: 'treino' as const,
        tipo: 'treino' as const,
        estado: 'feito' as const,
        rota: '/treino',
      },
    ]
  })
}

/**
 * Sessões de estudo registradas (resolução 10.31).
 *
 * Sempre dia inteiro: `sessoes_estudo` guarda data e duração, e nenhuma hora —
 * então não há hora para mostrar, e inventar uma seria pior que omitir. A duração
 * vai no título, porque é o dado que a sessão tem a dizer.
 */
export function eventosSessoesEstudo(
  sessoes: readonly FonteSessaoEstudo[],
  intervalo: Intervalo,
  nomePorMateria: ReadonlyMap<string, string>,
): EventoCalendario[] {
  return sessoes.flatMap((sessao) => {
    if (sessao.data < intervalo.de || sessao.data > intervalo.ate) return []

    const nome = nomePorMateria.get(sessao.materia_id) ?? 'Estudo'

    return [
      {
        id: `sessao-estudo:${sessao.id}`,
        origemId: sessao.materia_id,
        titulo: `${nome} · ${sessao.duracao_minutos} min`,
        inicio: sessao.data,
        diaInteiro: true,
        camada: 'estudos' as const,
        tipo: 'estudo' as const,
        estado: 'feito' as const,
        rota: `/estudos/${sessao.materia_id}`,
      },
    ]
  })
}

/**
 * O que foi desmarcado, em dias que já chegaram (resolução 10.31).
 *
 * `expandirRecorrencia` **omite** a ocorrência cancelada, e é o comportamento
 * certo para a frequência: cancelado sai do denominador (10.17). Mas para a
 * agenda de um dia passado isso apagava a informação de que havia algo previsto —
 * "cancelei o Legs" e "nunca teve nada na quarta" ficavam idênticos.
 *
 * Não reaproveita `expandirRecorrencia` de propósito: mudar aquela função para
 * emitir canceladas afetaria a frequência do treino e a faixa de carga, que
 * dependem da omissão. Aqui as exceções são lidas direto.
 *
 * Só dias `<= hoje`: no futuro, desmarcado é simplesmente fora do plano, e
 * mostrar riscado o que não vai acontecer é ruído.
 */
export function eventosCancelados(
  fluxograma: readonly FonteFluxograma[],
  excecoes: readonly ExcecaoRecorrencia[],
  intervalo: Intervalo,
  hoje: string,
  nomePorMateria: ReadonlyMap<string, string>,
  nomePorTreino: ReadonlyMap<string, string>,
): EventoCalendario[] {
  const porId = new Map(fluxograma.map((regra) => [regra.id, regra]))

  return excecoes.flatMap((excecao) => {
    if (excecao.status !== 'cancelado') return []
    if (excecao.data < intervalo.de || excecao.data > intervalo.ate) return []
    if (excecao.data > hoje) return []

    const regra = porId.get(excecao.fluxograma_id)
    if (!regra) return []

    const ehAula = regra.materia_id !== null
    const nome = ehAula
      ? (nomePorMateria.get(regra.materia_id as string) ?? 'Aula')
      : (nomePorTreino.get(regra.treino_id as string) ?? 'Treino')

    return [
      {
        id: `cancelado:${regra.id}:${excecao.data}`,
        origemId: regra.id,
        titulo: nome,
        inicio: comHorario(excecao.data, regra.horario_inicio),
        fim: comHorario(excecao.data, regra.horario_fim),
        diaInteiro: false,
        camada: ehAula ? ('estudos' as const) : ('treino' as const),
        tipo: ehAula ? ('aula' as const) : ('treino' as const),
        estado: 'cancelado' as const,
      },
    ]
  })
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

/**
 * Junta todas as camadas em uma única lista de eventos.
 *
 * `hoje` entra como parâmetro (plano §9): é o que separa dia que já chegou de dia
 * futuro para decidir se um cancelamento aparece.
 */
export function construirEventos(
  fontes: FontesCalendario,
  intervalo: Intervalo,
  hoje: string,
): EventoCalendario[] {
  const feitos = eventosExecucoesTreino(
    fontes.execucoesTreino,
    intervalo,
    fontes.nomePorTreino,
  )

  /*
   * A ocorrência prevista cede lugar à realizada quando as duas são do mesmo
   * treino no mesmo dia. Precisa ser calculado aqui, não dentro de
   * `eventosFluxograma`: é o único ponto que vê as duas fontes.
   */
  const treinosFeitos = new Set(
    feitos.map((evento) =>
      chaveTreinoData(evento.origemId as string, evento.inicio.slice(0, 10)),
    ),
  )

  return [
    ...eventosAvaliacoes(fontes.avaliacoes, intervalo, fontes.nomePorMateria),
    ...eventosFluxograma(
      fontes.fluxograma,
      fontes.excecoes,
      intervalo,
      fontes.nomePorMateria,
      fontes.nomePorTreino,
      treinosFeitos,
    ),
    ...feitos,
    ...eventosSessoesEstudo(
      fontes.sessoesEstudo,
      intervalo,
      fontes.nomePorMateria,
    ),
    ...eventosCancelados(
      fontes.fluxograma,
      fontes.excecoes,
      intervalo,
      hoje,
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
  estudo: 'Estudo',
}
