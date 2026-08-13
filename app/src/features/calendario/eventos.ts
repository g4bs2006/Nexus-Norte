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

/**
 * `'trabalho'` segue o precedente de `'sono'` (resolução 10.48.0): camada sem
 * ser pilar, sem entrada na sidebar. Trabalho ocupa tempo, mas não tem
 * métrica, meta nem sub-página — não justifica virar `PilarId`.
 */
export type CamadaCalendario = PilarId | 'sono' | 'trabalho' | 'evento'

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
  /** Bloco de trabalho ou outro rótulo livre (resolução 10.48.0). */
  | 'trabalho'
  /**
   * Compromisso avulso sem pilar, criado direto no calendário (resolução
   * "criar eventos", ago/2026) — dentista, reunião, o que não é rotina de
   * nenhum outro módulo.
   */
  | 'evento'

/**
 * Tipos que representam prazo, e não rotina.
 *
 * São os que valem destaque: têm data marcada, acontecem uma vez e passam. Aula
 * e treino se repetem toda semana; listá-los junto afogaria as provas.
 */
const TIPOS_IMPORTANTES: readonly TipoEvento[] = [
  'prova',
  'conta',
  'marco',
  'evento',
]

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
   * - `cancelado` — estava previsto e foi desmarcado.
   * - `remarcado` — o rastro na data de ORIGEM de uma ocorrência que foi movida
   *   para outro dia. A ocorrência em si aparece na data de destino, por
   *   `eventosFluxograma`; este estado é só a marca de "saiu daqui", e traz
   *   `remarcadoPara` com o destino.
   */
  estado?: 'feito' | 'cancelado' | 'remarcado'
  /**
   * Para onde a ocorrência foi, em ISO. Só em `estado === 'remarcado'`.
   *
   * Sem isto o rastro na origem diria apenas "foi remarcado" e obrigaria a
   * procurar o destino varrendo o calendário — que é justamente o trabalho que
   * o rastro existe para poupar.
   */
  remarcadoPara?: string
  /**
   * Id da linha de origem, sem a data. Nos eventos de fluxograma é o id da
   * regra, que é o que `conclusoes_fluxograma` referencia — a faixa de carga usa
   * para saber se o check daquele dia saiu. Existe para não obrigar ninguém a
   * fatiar o `id` composto de volta.
   */
  origemId?: string
  /**
   * Cor própria do item, quando a entidade dona tem uma escolhida.
   *
   * Hoje só matéria tem (`materias.cor`). Existe porque `camada` pinta o pilar,
   * não o item: sem isso, todas as aulas e provas da semana são do mesmo azul
   * de "estudos" e a agenda não diz Cálculo de Física sem ler o texto.
   *
   * Ausente = usa a cor da camada. Não resolva o fallback à mão nas views —
   * `corDoEvento` faz isso, e centralizar evita que uma view esqueça.
   */
  cor?: string
}

export interface Intervalo {
  de: string
  ate: string
}

export function ehImportante(evento: EventoCalendario): boolean {
  return TIPOS_IMPORTANTES.includes(evento.tipo)
}

/**
 * Se o bloco é pintado por inteiro nas grades (mês e horas).
 *
 * **Por que não é `ehImportante`.** As grades usavam `ehImportante` para decidir
 * o preenchimento, e com isso empataram duas coisas que o dado já separava: a
 * sessão de estudo registrada saía com o mesmo contorno da aula prevista, na
 * mesma cor da matéria e no mesmo horário. Duas caixas iguais, uma sendo o plano
 * e a outra o fato. O mesmo valia para treino executado contra treino previsto.
 *
 * `ehImportante` responde *"isto é prazo?"* e governa coisas que não são
 * pintura: a ordem da agenda, o card de pressão e a exclusão da barra de carga.
 * Acrescentar `estudo` ali faria a sessão de ontem aparecer como prazo a vencer.
 * O preenchimento é outra pergunta, e ganha função própria.
 *
 * A regra que sobra é legível em uma linha: **cheio = isto tem data própria
 * (prazo) ou aconteceu (fato); contorno = rotina prevista pelo fluxograma.**
 *
 * `estado` só preenche em `feito`. `cancelado` e `remarcado` também são desfecho
 * conhecido, mas de coisa que **não** aconteceu ali — preenchê-los daria a um
 * não-evento mais peso que à aula que de fato ocorreu.
 */
export function ehBlocoCheio(evento: EventoCalendario): boolean {
  return ehImportante(evento) || evento.estado === 'feito'
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
  /** Preenchido só quando nem `materia_id` nem `treino_id` estão (10.48.0). */
  rotulo: string | null
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
 * Evento avulso sem pilar (resolução "criar eventos", ago/2026).
 *
 * Shape idêntico ao `EventoLivre` de `features/eventos/api` de propósito:
 * `descricao` não é usado para construir o `EventoCalendario`, mas overar por
 * `origemId` para abrir o dialog de edição precisa do registro completo, e
 * ter dois tipos quase iguais só criaria uma conversão sem função.
 */
export interface FonteEventoLivre {
  id: string
  titulo: string
  descricao: string | null
  data: string
  hora_inicio: string | null
  hora_fim: string | null
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

/**
 * Sessão de estudo registrada.
 *
 * `hora_inicio` é **informada pelo usuário** e opcional (13/08) — mesma regra de
 * `execucoes_treino`. Nula quando ele só registrou "estudei 90 min hoje", que
 * era o único caso possível antes da coluna existir.
 */
export interface FonteSessaoEstudo {
  id: string
  materia_id: string
  data: string
  hora_inicio?: string | null
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
  eventosLivres: readonly FonteEventoLivre[]
  /** Rótulos para resolver os ids do fluxograma. */
  nomePorMateria: ReadonlyMap<string, string>
  nomePorTreino: ReadonlyMap<string, string>
  /**
   * Opcional: sem ela, todo evento de matéria cai na cor da camada — que é
   * exatamente o comportamento anterior a `materias.cor`.
   */
  corPorMateria?: ReadonlyMap<string, string | null>
  /** Opcional: sem ela, aula de fluxograma nunca é limitada por período. */
  periodoPorMateria?: ReadonlyMap<string, PeriodoMateria>
}

// --- Construtores por camada ------------------------------------------------

/** Provas: avaliações com data marcada e ainda sem nota lançada. */
export function eventosAvaliacoes(
  avaliacoes: readonly FonteAvaliacao[],
  intervalo: Intervalo,
  nomePorMateria: ReadonlyMap<string, string>,
  corPorMateria: ReadonlyMap<string, string | null> = new Map(),
): EventoCalendario[] {
  return avaliacoes.flatMap((avaliacao) => {
    if (avaliacao.data === null) return []
    if (avaliacao.data < intervalo.de || avaliacao.data > intervalo.ate)
      return []

    const materia = nomePorMateria.get(avaliacao.materia_id)
    const cor = corPorMateria.get(avaliacao.materia_id)
    return [
      {
        id: `avaliacao:${avaliacao.id}`,
        titulo: materia ? `${avaliacao.nome} — ${materia}` : avaliacao.nome,
        inicio: avaliacao.data,
        diaInteiro: true,
        camada: 'estudos' as const,
        tipo: 'prova' as const,
        rota: `/estudos/${avaliacao.materia_id}`,
        ...(cor ? { cor } : {}),
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

export interface PeriodoMateria {
  data_inicio: string | null
  data_fim: string | null
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
  /**
   * Início/fim das aulas de cada matéria (discussão em uso, 06/08). Matéria
   * ausente do mapa, ou com os dois lados nulos, não tem limite — mesmo
   * comportamento de antes desta resolução. Só se aplica a `ehAula`; treino
   * não tem período aqui (o id não bate com nenhuma chave do mapa).
   */
  periodoPorMateria: ReadonlyMap<string, PeriodoMateria> = new Map(),
  /** Cor própria por matéria; ausente cai na cor da camada. */
  corPorMateria: ReadonlyMap<string, string | null> = new Map(),
): EventoCalendario[] {
  return expandirRecorrencia(fluxograma, intervalo, excecoes)
    .filter(
      (ocorrencia) =>
        ocorrencia.regra.treino_id === null ||
        !treinosFeitos.has(
          chaveTreinoData(ocorrencia.regra.treino_id, ocorrencia.data),
        ),
    )
    .filter((ocorrencia) => {
      const materiaId = ocorrencia.regra.materia_id
      if (materiaId === null) return true
      const periodo = periodoPorMateria.get(materiaId)
      if (!periodo) return true
      if (periodo.data_inicio !== null && ocorrencia.data < periodo.data_inicio) {
        return false
      }
      if (periodo.data_fim !== null && ocorrencia.data > periodo.data_fim) {
        return false
      }
      return true
    })
    .map((ocorrencia) => {
      const { regra, data, remarcada } = ocorrencia
      const { nome, camada, tipo, rota, cor } = resolverDonoFluxograma(
        regra,
        nomePorMateria,
        nomePorTreino,
        corPorMateria,
      )

      return {
        id: `fluxograma:${regra.id}:${data}`,
        origemId: regra.id,
        titulo: remarcada ? `${nome} (remarcado)` : nome,
        inicio: comHorario(data, regra.horario_inicio),
        fim: comHorario(data, regra.horario_fim),
        diaInteiro: false,
        camada,
        tipo,
        rota,
        ...(cor ? { cor } : {}),
      }
    })
}

/**
 * Resolve nome/camada/tipo/rota a partir de qual "dono" a linha do
 * fluxograma tem — matéria, treino, ou nenhum (rótulo livre, 10.48.0).
 *
 * Trabalho não tem sub-página: `rota` fica `undefined` de propósito, o
 * modelo já prevê essa ausência.
 */
export function resolverDonoFluxograma(
  regra: Pick<FonteFluxograma, 'materia_id' | 'treino_id' | 'rotulo'>,
  nomePorMateria: ReadonlyMap<string, string>,
  nomePorTreino: ReadonlyMap<string, string>,
  corPorMateria: ReadonlyMap<string, string | null> = new Map(),
): {
  nome: string
  camada: CamadaCalendario
  tipo: TipoEvento
  rota: string | undefined
  /** Só matéria tem cor própria; treino e trabalho ficam na cor da camada. */
  cor: string | undefined
} {
  if (regra.materia_id !== null) {
    return {
      nome: nomePorMateria.get(regra.materia_id) ?? 'Aula',
      camada: 'estudos',
      tipo: 'aula',
      rota: `/estudos/${regra.materia_id}`,
      cor: corPorMateria.get(regra.materia_id) ?? undefined,
    }
  }
  if (regra.treino_id !== null) {
    return {
      nome: nomePorTreino.get(regra.treino_id) ?? 'Treino',
      camada: 'treino',
      tipo: 'treino',
      // Treino não tem sub-página própria; leva para a listagem do pilar
      rota: '/treino',
      cor: undefined,
    }
  }
  return {
    nome: regra.rotulo ?? 'Trabalho',
    camada: 'trabalho',
    tipo: 'trabalho',
    rota: undefined,
    cor: undefined,
  }
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
 * Com `hora_inicio` informada, a sessão ocupa o horário e o fim sai de
 * `inicio + duracao_minutos` — a duração é obrigatória, então o fim é sempre
 * derivável e guardar as duas coisas abriria espaço para discordarem.
 *
 * Sem hora, dia inteiro: era o único comportamento possível antes de a coluna
 * existir, e continua sendo o certo para "estudei 90 min hoje". Inventar hora a
 * partir de `created_at` mediria quando o *registro* foi feito (10.24).
 *
 * A duração vai no título nos dois casos: no bloco com horário ela é redundante
 * com o tamanho do bloco na grade de horas, mas a agenda e a vista de mês não
 * têm escala — e ler "90 min" é mais rápido que comparar alturas.
 */
export function eventosSessoesEstudo(
  sessoes: readonly FonteSessaoEstudo[],
  intervalo: Intervalo,
  nomePorMateria: ReadonlyMap<string, string>,
  corPorMateria: ReadonlyMap<string, string | null> = new Map(),
): EventoCalendario[] {
  return sessoes.flatMap((sessao) => {
    if (sessao.data < intervalo.de || sessao.data > intervalo.ate) return []

    const nome = nomePorMateria.get(sessao.materia_id) ?? 'Estudo'
    const cor = corPorMateria.get(sessao.materia_id)
    const comHora = Boolean(sessao.hora_inicio)

    return [
      {
        id: `sessao-estudo:${sessao.id}`,
        origemId: sessao.materia_id,
        titulo: `${nome} · ${sessao.duracao_minutos} min`,
        inicio: comHora
          ? comHorario(sessao.data, sessao.hora_inicio as string)
          : sessao.data,
        ...(comHora
          ? {
              fim: somarMinutos(
                comHorario(sessao.data, sessao.hora_inicio as string),
                sessao.duracao_minutos,
              ),
            }
          : {}),
        diaInteiro: !comHora,
        camada: 'estudos' as const,
        tipo: 'estudo' as const,
        estado: 'feito' as const,
        rota: `/estudos/${sessao.materia_id}`,
        ...(cor ? { cor } : {}),
      },
    ]
  })
}

/**
 * Avança minutos sobre um ISO datetime local, atravessando a meia-noite.
 *
 * Sessão que começa 23:30 e dura 60 min termina 00:30 do dia seguinte — o
 * mesmo caso que `eventosSono` já trata para o sono. Sem isto o fim sairia
 * como `23:90`, que nenhuma vista sabe desenhar.
 */
function somarMinutos(iso: string, minutos: number): string {
  const [data, hora] = [iso.slice(0, 10), iso.slice(11, 16)]
  const [h, m] = hora.split(':').map(Number)
  const total = (h as number) * 60 + (m as number) + minutos
  const diasAdiante = Math.floor(total / 1440)
  const doDia = ((total % 1440) + 1440) % 1440

  const dataFim =
    diasAdiante === 0 ? data : paraISO(addDays(deISO(data), diasAdiante))
  const hh = String(Math.floor(doDia / 60)).padStart(2, '0')
  const mm = String(doDia % 60).padStart(2, '0')
  return `${dataFim}T${hh}:${mm}:00`
}

/**
 * O que foi desmarcado (resolução 10.31).
 *
 * `expandirRecorrencia` **omite** a ocorrência cancelada, e é o comportamento
 * certo para a frequência: cancelado sai do denominador (10.17). Mas para a
 * agenda isso apagava a informação de que havia algo previsto — "cancelei o
 * Legs" e "nunca teve nada na quarta" ficavam idênticos.
 *
 * Não reaproveita `expandirRecorrencia` de propósito: mudar aquela função para
 * emitir canceladas afetaria a frequência do treino e a faixa de carga, que
 * dependem da omissão. Aqui as exceções são lidas direto.
 *
 * Vale para qualquer dia do intervalo, inclusive futuros. A 10.31 recortava em
 * `<= hoje` porque só a Home cancelava, e ali sempre é hoje; desde que o Ritual
 * Semanal e a página de Treino passaram a cancelar dias à frente, esse recorte
 * fazia o item desaparecer do calendário sem rastro — indistinguível de nunca
 * ter existido, que é exatamente o defeito que a 10.31 tinha ido corrigir.
 */
export function eventosCancelados(
  fluxograma: readonly FonteFluxograma[],
  excecoes: readonly ExcecaoRecorrencia[],
  intervalo: Intervalo,
  nomePorMateria: ReadonlyMap<string, string>,
  nomePorTreino: ReadonlyMap<string, string>,
  corPorMateria: ReadonlyMap<string, string | null> = new Map(),
): EventoCalendario[] {
  const porId = new Map(fluxograma.map((regra) => [regra.id, regra]))

  return excecoes.flatMap((excecao) => {
    if (excecao.status !== 'cancelado') return []
    if (excecao.data < intervalo.de || excecao.data > intervalo.ate) return []

    const regra = porId.get(excecao.fluxograma_id)
    if (!regra) return []

    const { nome, camada, tipo, cor } = resolverDonoFluxograma(
      regra,
      nomePorMateria,
      nomePorTreino,
      corPorMateria,
    )

    return [
      {
        id: `cancelado:${regra.id}:${excecao.data}`,
        origemId: regra.id,
        titulo: nome,
        inicio: comHorario(excecao.data, regra.horario_inicio),
        fim: comHorario(excecao.data, regra.horario_fim),
        diaInteiro: false,
        camada,
        tipo,
        estado: 'cancelado' as const,
        ...(cor ? { cor } : {}),
      },
    ]
  })
}

/**
 * O rastro, na data de origem, do que foi movido para outro dia.
 *
 * Irmã de `eventosCancelados`, e pela mesma razão: `expandirRecorrencia` emite a
 * remarcada só no destino, então a data de origem ficava idêntica a um dia que
 * nunca teve nada. "A aula de terça foi para quinta" e "terça não tem aula" são
 * fatos diferentes, e só o primeiro explica por que a quinta ficou cheia.
 *
 * Não é uma falha nem uma ausência — é um ponteiro. Por isso `estado` próprio, e
 * não `cancelado`: cancelado sai do denominador da frequência e entra em "o que
 * ficou pra trás" (`detectarFalhas`); remarcado não faz nem um nem outro, porque
 * a ocorrência continua existindo, noutro dia.
 *
 * Remarcação que só muda o horário dentro do mesmo dia não gera rastro: origem e
 * destino são a mesma linha da agenda, e duas linhas ali seriam ruído.
 */
export function eventosRemarcadosNaOrigem(
  fluxograma: readonly FonteFluxograma[],
  excecoes: readonly ExcecaoRecorrencia[],
  intervalo: Intervalo,
  nomePorMateria: ReadonlyMap<string, string>,
  nomePorTreino: ReadonlyMap<string, string>,
  corPorMateria: ReadonlyMap<string, string | null> = new Map(),
): EventoCalendario[] {
  const porId = new Map(fluxograma.map((regra) => [regra.id, regra]))

  return excecoes.flatMap((excecao) => {
    if (excecao.status !== 'remarcado') return []
    if (!excecao.nova_data) return []
    if (excecao.nova_data === excecao.data) return []
    if (excecao.data < intervalo.de || excecao.data > intervalo.ate) return []

    const regra = porId.get(excecao.fluxograma_id)
    if (!regra) return []

    const { nome, camada, tipo, cor } = resolverDonoFluxograma(
      regra,
      nomePorMateria,
      nomePorTreino,
      corPorMateria,
    )

    return [
      {
        /*
         * Prefixo próprio: o destino da mesma remarcação já usa
         * `fluxograma:${regra.id}:${nova_data}`, e reaproveitar o prefixo faria
         * as duas linhas colidirem quando origem e destino aparecem juntas no
         * intervalo visível.
         */
        id: `remarcado-origem:${regra.id}:${excecao.data}`,
        origemId: regra.id,
        titulo: nome,
        inicio: comHorario(excecao.data, regra.horario_inicio),
        fim: comHorario(excecao.data, regra.horario_fim),
        diaInteiro: false,
        camada,
        tipo,
        estado: 'remarcado' as const,
        remarcadoPara: excecao.nova_data,
        ...(cor ? { cor } : {}),
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
 * Eventos avulsos criados direto no calendário (resolução "criar eventos",
 * ago/2026). Único construtor cuja fonte é dona do próprio dado — todos os
 * outros agregam de outro pilar (plano 6.1).
 */
export function eventosLivres(
  eventos: readonly FonteEventoLivre[],
  intervalo: Intervalo,
): EventoCalendario[] {
  return eventos.flatMap((evento) => {
    if (evento.data < intervalo.de || evento.data > intervalo.ate) return []

    const comHora = evento.hora_inicio !== null
    return [
      {
        id: `evento:${evento.id}`,
        origemId: evento.id,
        titulo: evento.titulo,
        inicio: comHora
          ? comHorario(evento.data, evento.hora_inicio as string)
          : evento.data,
        fim:
          comHora && evento.hora_fim !== null
            ? comHorario(evento.data, evento.hora_fim)
            : undefined,
        diaInteiro: !comHora,
        camada: 'evento' as const,
        tipo: 'evento' as const,
      },
    ]
  })
}

/** Junta todas as camadas em uma única lista de eventos. */
export function construirEventos(
  fontes: FontesCalendario,
  intervalo: Intervalo,
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
    ...eventosAvaliacoes(
      fontes.avaliacoes,
      intervalo,
      fontes.nomePorMateria,
      fontes.corPorMateria,
    ),
    ...eventosFluxograma(
      fontes.fluxograma,
      fontes.excecoes,
      intervalo,
      fontes.nomePorMateria,
      fontes.nomePorTreino,
      treinosFeitos,
      fontes.periodoPorMateria,
      fontes.corPorMateria,
    ),
    ...feitos,
    ...eventosSessoesEstudo(
      fontes.sessoesEstudo,
      intervalo,
      fontes.nomePorMateria,
      fontes.corPorMateria,
    ),
    ...eventosCancelados(
      fontes.fluxograma,
      fontes.excecoes,
      intervalo,
      fontes.nomePorMateria,
      fontes.nomePorTreino,
      fontes.corPorMateria,
    ),
    ...eventosRemarcadosNaOrigem(
      fontes.fluxograma,
      fontes.excecoes,
      intervalo,
      fontes.nomePorMateria,
      fontes.nomePorTreino,
      fontes.corPorMateria,
    ),
    ...eventosContas(fontes.contas, intervalo),
    ...eventosSono(fontes.planejamentoSono, intervalo),
    ...eventosMarcos(fontes.marcos, intervalo),
    ...eventosLivres(fontes.eventosLivres, intervalo),
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

/**
 * Cor com que pintar um evento: a do item, se ele tiver; senão a da camada.
 *
 * É o único lugar que resolve esse fallback. Antes cada view fazia
 * `COR_CAMADA[evento.camada]` direto, e quando a matéria passou a ter cor
 * própria isso significaria repetir o `??` em cinco arquivos — com a garantia
 * de que um deles ficaria para trás.
 *
 * Cuidado: isto é para pintar **um evento**. A legenda de camadas e o filtro
 * por pilar continuam em `COR_CAMADA`, porque ali a cor representa a categoria,
 * não o item — o azul da legenda "Aulas e provas" não deve virar o vermelho de
 * uma matéria específica.
 */
export function corDoEvento(
  evento: Pick<EventoCalendario, 'cor' | 'camada'>,
): string {
  return evento.cor ?? COR_CAMADA[evento.camada]
}

/** Cor de cada camada, alinhada à paleta por pilar (plano 1.2 / 6.2). */
export const COR_CAMADA: Record<CamadaCalendario, string> = {
  financeiro: 'var(--financeiro)',
  estudos: 'var(--estudos)',
  treino: 'var(--treino)',
  projetos: 'var(--projetos)',
  sono: 'var(--sono)',
  trabalho: 'var(--trabalho)',
  evento: 'var(--evento)',
}

export const ROTULO_CAMADA: Record<CamadaCalendario, string> = {
  financeiro: 'Contas',
  estudos: 'Aulas e provas',
  treino: 'Treinos',
  projetos: 'Marcos',
  sono: 'Sono',
  trabalho: 'Trabalho',
  evento: 'Eventos',
}

export const ROTULO_TIPO: Record<TipoEvento, string> = {
  prova: 'Prova',
  aula: 'Aula',
  treino: 'Treino',
  conta: 'Conta',
  marco: 'Marco',
  sono: 'Sono',
  estudo: 'Estudo',
  trabalho: 'Trabalho',
  evento: 'Evento',
}
