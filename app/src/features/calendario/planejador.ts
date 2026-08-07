import { differenceInCalendarDays } from 'date-fns'
import { deISO } from '@/lib/datas'
import { BLOCO_MINIMO_MINUTOS, ESTUDO_MAXIMO_DIA_MINUTOS } from '@/lib/constants'
import { horasEntre } from '@/features/sono/calculos'
import type { DiaCarga } from './carga'
import type { EventoCalendario, FonteAvaliacao } from './eventos'

/**
 * O calendário como planejador, não só espelho (resolução 10.48, degrau 2).
 *
 * Funções puras — `hoje` e todos os dados já carregados entram por parâmetro
 * (mesmo princípio do resto do módulo). Nenhuma delas toca rede.
 */

export type StatusPressao = 'ok' | 'risco'

export interface PressaoPrazo {
  avaliacaoId: string
  nome: string
  materiaId: string
  /** Data da avaliação, ISO. */
  data: string
  /** Nunca negativo aqui — só avaliações futuras entram (ver `pressaoDosPrazos`). */
  diasRestantes: number
  /** Soma de `minutosLivres` até a véspera da prova (exclui o dia dela). */
  minutosLivresAte: number
  /**
   * Ausente quando a matéria não tem meta cadastrada — o cartão mostra só a
   * folga disponível e não inventa um alvo (mesma regra de honestidade da
   * 10.44/10.47: número sem base não é apresentado como se tivesse).
   */
  minutosMetaRestante?: number
  status?: StatusPressao
}

/**
 * Soma `minutosLivres` dos dias estritamente **antes** da data-alvo.
 *
 * Contar as horas livres do próprio dia da prova para estudar para ela é
 * otimismo sem base — por isso "até a véspera", não "até o dia".
 */
function minutosLivresAteAVespera(
  dias: readonly DiaCarga[],
  hoje: string,
  dataAlvo: string,
): number {
  return dias
    .filter((dia) => dia.data >= hoje && dia.data < dataAlvo)
    .reduce((total, dia) => total + dia.minutosLivres, 0)
}

/**
 * Pressão de cada avaliação futura: quanto falta, quanta folga existe até
 * lá, e se a meta de estudo da matéria caberia nessa folga (resolução
 * 10.48.4).
 *
 * `metaMinutosPorMateria` e `estudadoMinutosPorMateria` chegam prontos —
 * resolver "qual meta vale para esta matéria" e "quanto já foi estudado" é
 * responsabilidade de quem chama, não desta função.
 */
export function pressaoDosPrazos(
  avaliacoes: readonly FonteAvaliacao[],
  hoje: string,
  dias: readonly DiaCarga[],
  metaMinutosPorMateria: ReadonlyMap<string, number>,
  estudadoMinutosPorMateria: ReadonlyMap<string, number>,
): PressaoPrazo[] {
  return avaliacoes
    .filter((avaliacao) => avaliacao.data !== null && avaliacao.data >= hoje)
    .map((avaliacao) => {
      const data = avaliacao.data as string
      const metaMinutos = metaMinutosPorMateria.get(avaliacao.materia_id)
      const estudado = estudadoMinutosPorMateria.get(avaliacao.materia_id) ?? 0
      const minutosMetaRestante =
        metaMinutos !== undefined ? Math.max(0, metaMinutos - estudado) : undefined
      const minutosLivresAte = minutosLivresAteAVespera(dias, hoje, data)
      const status: StatusPressao | undefined =
        minutosMetaRestante === undefined
          ? undefined
          : minutosLivresAte < minutosMetaRestante
            ? 'risco'
            : 'ok'

      return {
        avaliacaoId: avaliacao.id,
        nome: avaliacao.nome,
        materiaId: avaliacao.materia_id,
        data,
        diasRestantes: differenceInCalendarDays(deISO(data), deISO(hoje)),
        minutosLivresAte,
        minutosMetaRestante,
        status,
      }
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
}

// --- Conflito e sobrecarga (resolução 10.48.7) ------------------------------
//
// Duas verificações sobre dado que já existe. O valor está no momento: as
// duas precisam aparecer no ritual de domingo (10.48.3), quando ainda é
// planejamento — descobrir na quarta que a semana não cabia é constatação,
// não informação.

export interface Conflito {
  /** ISO (`YYYY-MM-DD`). */
  data: string
  eventoA: EventoCalendario
  eventoB: EventoCalendario
}

/**
 * Dois eventos com horário sobreposto no mesmo dia.
 *
 * Detecção trivial: ordena por início e compara com o fim do evento
 * anterior. Eventos adjacentes (fim de um == início do outro) não contam —
 * `<` estrito, não `<=`. Só rotina prevista entra: dia inteiro não tem
 * horário para conflitar, e cancelado não vai acontecer.
 */
export function detectarConflitos(
  eventos: readonly EventoCalendario[],
): Conflito[] {
  const porDia = new Map<string, EventoCalendario[]>()
  for (const evento of eventos) {
    if (evento.diaInteiro || !evento.fim) continue
    if (evento.estado === 'cancelado') continue
    const dia = evento.inicio.slice(0, 10)
    const lista = porDia.get(dia)
    if (lista) lista.push(evento)
    else porDia.set(dia, [evento])
  }

  const conflitos: Conflito[] = []
  for (const [dia, doDia] of porDia) {
    const ordenados = [...doDia].sort((a, b) => a.inicio.localeCompare(b.inicio))
    for (let i = 1; i < ordenados.length; i += 1) {
      const anterior = ordenados[i - 1]
      const atual = ordenados[i]
      if (!anterior?.fim || !atual) continue
      if (atual.inicio < anterior.fim) {
        conflitos.push({ data: dia, eventoA: anterior, eventoB: atual })
      }
    }
  }
  return conflitos
}

export interface Sobrecarga {
  data: string
  minutosLivres: number
}

/**
 * Dias em que a folga chega a zero (ou abaixo do piso pedido).
 *
 * `minutosLivres` já nasce sem negativo (10.48.1) — aqui só se filtra quem
 * bateu no piso, o dado em si já está pronto.
 */
export function detectarSobrecarga(
  dias: readonly DiaCarga[],
  pisoMinutos = 0,
): Sobrecarga[] {
  return dias
    .filter((dia) => dia.minutosLivres <= pisoMinutos)
    .map((dia) => ({ data: dia.data, minutosLivres: dia.minutosLivres }))
}

// --- Alocação sugerida (resolução 10.48.5) -----------------------------------

export interface SugestaoAlocacao {
  data: string
  minutos: number
}

/**
 * Propõe onde encaixar `minutosNecessarios`, a partir da folga de cada dia.
 *
 * Propõe, não agenda — mesmo princípio da sugestão de investimento (10.45):
 * vive em memória até ser aceita. Sem tabela: recalcular é barato, e guardar
 * a sugestão criaria estado obsoleto assim que a rotina mudasse.
 *
 * Estratégia gulosa: ordena os dias da maior folga para a menor e vai
 * enchendo até o teto diário ou até a meta ser atingida. Um dia cuja folga
 * (já descontado o que outras sugestões aceitas comprometeram) não alcança
 * o bloco mínimo fica de fora — nunca gera um bloco menor que
 * `BLOCO_MINIMO_MINUTOS`.
 *
 * Não invade sono planejado: `minutosLivres` (10.48.1) já sai sem ele.
 */
export function alocarSugestao(
  minutosNecessarios: number,
  dias: readonly DiaCarga[],
  minutosJaComprometidos: ReadonlyMap<string, number> = new Map(),
): SugestaoAlocacao[] {
  if (minutosNecessarios <= 0) return []

  const candidatos = dias
    .map((dia) => ({
      data: dia.data,
      disponivel: Math.max(
        0,
        dia.minutosLivres - (minutosJaComprometidos.get(dia.data) ?? 0),
      ),
    }))
    .sort((a, b) => b.disponivel - a.disponivel)

  const sugestoes: SugestaoAlocacao[] = []
  let restante = minutosNecessarios

  for (const candidato of candidatos) {
    if (restante <= 0) break
    const bloco = Math.min(candidato.disponivel, ESTUDO_MAXIMO_DIA_MINUTOS, restante)
    if (bloco < BLOCO_MINIMO_MINUTOS) continue

    sugestoes.push({ data: candidato.data, minutos: bloco })
    restante -= bloco
  }

  return sugestoes.sort((a, b) => a.data.localeCompare(b.data))
}

// --- Realocação do que falhou (resolução 10.48.6) ---------------------------

export interface FalhaRotina {
  fluxogramaId: string
  /** Data original em que a rotina deveria ter acontecido. */
  data: string
  titulo: string
  duracaoMinutos: number
  /** `cancelado` = desmarcado; `sem_check` = previsto e nunca confirmado. */
  motivo: 'cancelado' | 'sem_check'
}

/** `08:00:00` (ou ISO com hora) → minutos entre início e fim. */
function duracaoDoEvento(inicio: string, fim: string): number {
  return Math.round(horasEntre(inicio.slice(11, 16), fim.slice(11, 16)) * 60)
}

/**
 * O que ficou pra trás: rotina cancelada ou sem check, em dias que já
 * passaram. Só rotina recorrente entra — prazo perdido (prova, conta,
 * marco) não tem `origemId` de fluxograma e não se remarca por aqui, se
 * renegocia fora do app.
 *
 * Trabalho fica de fora (10.48.0): sem check, não tem como estar "sem
 * check".
 *
 * `conclusoes` é o mesmo formato que `cargaPorDia` já consome —
 * `fluxogramaId@data`.
 */
export function detectarFalhas(
  eventos: readonly EventoCalendario[],
  conclusoes: ReadonlySet<string>,
  hoje: string,
): FalhaRotina[] {
  const falhas: FalhaRotina[] = []

  for (const evento of eventos) {
    if (evento.diaInteiro || !evento.fim || !evento.origemId) continue
    if (evento.camada === 'trabalho') continue
    const data = evento.inicio.slice(0, 10)
    if (data >= hoje) continue

    if (evento.estado === 'cancelado') {
      falhas.push({
        fluxogramaId: evento.origemId,
        data,
        titulo: evento.titulo,
        duracaoMinutos: duracaoDoEvento(evento.inicio, evento.fim),
        motivo: 'cancelado',
      })
    } else if (
      evento.estado === undefined &&
      !conclusoes.has(`${evento.origemId}@${data}`)
    ) {
      falhas.push({
        fluxogramaId: evento.origemId,
        data,
        titulo: evento.titulo,
        duracaoMinutos: duracaoDoEvento(evento.inicio, evento.fim),
        motivo: 'sem_check',
      })
    }
  }

  return falhas.sort((a, b) => b.data.localeCompare(a.data))
}

export interface SugestaoRealocacao extends FalhaRotina {
  sugestao: readonly SugestaoAlocacao[]
}

/**
 * Sugere um novo slot pra cada falha, reusando a busca de `alocarSugestao`
 * (10.48.5) — janela curta (o `diasFuturos` que quem chama passar, padrão o
 * resto da semana corrente). Falhas mais recentes reservam slot primeiro,
 * pela mesma razão de `pressaoDosPrazos`: duas não devem disputar o mesmo
 * dia.
 */
export function sugerirRealocacao(
  falhas: readonly FalhaRotina[],
  diasFuturos: readonly DiaCarga[],
): SugestaoRealocacao[] {
  const comprometido = new Map<string, number>()
  return falhas.map((falha) => {
    const sugestao = alocarSugestao(falha.duracaoMinutos, diasFuturos, comprometido)
    for (const bloco of sugestao) {
      comprometido.set(bloco.data, (comprometido.get(bloco.data) ?? 0) + bloco.minutos)
    }
    return { ...falha, sugestao }
  })
}

// --- Degrau 3: memória (resolução 10.48.9) -----------------------------------
//
// O heatmap anual (10.48.8) foi removido em uso: com poucos dias de app
// instalado, uma grade de 365 quadrados é quase só vermelho antes de ontem —
// ruído, não informação. `checkPendente` e `sonoAbaixo` continuam existindo
// por dia (`cargaPorDia`); a correlação abaixo é o que sobrou de útil sem
// depender da janela longa que o heatmap pedia.

/**
 * Correlação simples, só como observação (10.48.9): entre os dias com sono
 * abaixo da meta, que fração teve `checkPendente`? E entre os dias com sono
 * na meta ou acima?
 *
 * `undefined` quando não há dias suficientes de um dos dois lados — "sem
 * dado" é mais honesto que uma % calculada sobre zero ou um dia só.
 */
export interface CorrelacaoSonoAderencia {
  percentualFalhaComSonoBaixo: number | undefined
  percentualFalhaComSonoOk: number | undefined
}

export function correlacaoSonoAderencia(
  dias: readonly DiaCarga[],
  horasDormidasPorDia: ReadonlyMap<string, number>,
  metaHorasPorDiaSemana: ReadonlyMap<number, number>,
): CorrelacaoSonoAderencia {
  const passados = dias.filter((dia) => dia.ehPassado)

  const comSonoBaixo: DiaCarga[] = []
  const comSonoOk: DiaCarga[] = []

  for (const dia of passados) {
    const dormido = horasDormidasPorDia.get(dia.data)
    const meta = metaHorasPorDiaSemana.get(deISO(dia.data).getDay())
    if (dormido === undefined || meta === undefined) continue
    if (dormido < meta) comSonoBaixo.push(dia)
    else comSonoOk.push(dia)
  }

  function percentualFalha(lista: readonly DiaCarga[]): number | undefined {
    if (lista.length < 3) return undefined
    const falhas = lista.filter((dia) => dia.checkPendente).length
    return Math.round((falhas / lista.length) * 100)
  }

  return {
    percentualFalhaComSonoBaixo: percentualFalha(comSonoBaixo),
    percentualFalhaComSonoOk: percentualFalha(comSonoOk),
  }
}

// --- Timeline retrospectiva (resolução 10.48.10) -----------------------------

export interface ItemTimeline {
  texto: string
}

export interface DiaTimeline {
  data: string
  itens: readonly ItemTimeline[]
}

/**
 * Agrupa o que aconteceu por dia, do mais recente para o mais antigo — não é
 * agenda, é memória. Custo quase zero: cada fonte já é agregada em outro
 * lugar do app (execuções, sessões, PRs, log de projeto); aqui só se junta
 * por data e se ordena.
 *
 * Recebe os itens já como texto pronto — decidir "o que virou uma linha" é
 * responsabilidade de quem monta cada lista (evento, PR, log), não desta
 * função, que só agrupa e ordena.
 */
export function construirTimeline(
  itens: readonly { data: string; texto: string }[],
): DiaTimeline[] {
  const porDia = new Map<string, ItemTimeline[]>()
  for (const item of itens) {
    const lista = porDia.get(item.data) ?? []
    lista.push({ texto: item.texto })
    porDia.set(item.data, lista)
  }

  return [...porDia.entries()]
    .map(([data, itensDoDia]) => ({ data, itens: itensDoDia }))
    .sort((a, b) => b.data.localeCompare(a.data))
}
