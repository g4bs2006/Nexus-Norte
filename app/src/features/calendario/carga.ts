import { eachDayOfInterval } from 'date-fns'
import { deISO, paraISO } from '@/lib/datas'
import { SONO_PADRAO_MINUTOS } from '@/lib/constants'
import { horasEntre } from '@/features/sono/calculos'
import {
  ehImportante,
  type CamadaCalendario,
  type EventoCalendario,
  type FontePlanejamentoSono,
  type Intervalo,
} from './eventos'

/**
 * Carga por dia — o dado da faixa acima da agenda.
 *
 * A grade de mês trata rotina e prazo com o mesmo peso, e é isso que afoga a
 * prova nas vinte ocorrências de aula e treino da semana. A faixa separa as duas
 * coisas em eixos diferentes: **quanto** o dia já está tomado (altura da barra) e
 * **o que vence** nele (marca acima). Responde "onde a semana aperta" antes de
 * ler qualquer título.
 *
 * Funções puras — `hoje` entra como parâmetro (plano, seção 9).
 */

export interface FonteSonoRealizado {
  data: string
  horas_calculadas: number | null
}

/** Ordem fixa dos segmentos, para a barra não mudar de forma entre renders. */
const ORDEM_CAMADAS: readonly CamadaCalendario[] = [
  'estudos',
  'treino',
  'trabalho',
  'projetos',
  'financeiro',
  'sono',
]

export interface SegmentoCarga {
  camada: CamadaCalendario
  minutos: number
  /**
   * Cor própria do item que gerou o segmento, quando ele tem uma.
   *
   * Hoje só matéria tem (`materias.cor`), então o efeito prático é uma fatia por
   * matéria dentro da camada de estudos, em vez de um bloco azul só. Ausente =
   * a fatia é a camada inteira e a cor sai de `COR_CAMADA` — é o que acontece
   * com treino, trabalho e sono, que não têm cor por item.
   */
  cor?: string
  /**
   * Nome do que ocupa a fatia, para o rótulo acessível e o tooltip.
   *
   * Ausente quando a fatia é a camada inteira — ali o rótulo da camada
   * (`ROTULO_CAMADA`) já responde, e repetir seria ruído.
   */
  rotulo?: string
}

export interface DiaCarga {
  /** ISO (`YYYY-MM-DD`). */
  data: string
  /** Rotina do dia por camada. Só camadas com tempo, em ordem fixa. */
  segmentos: SegmentoCarga[]
  minutosRotina: number
  /**
   * Minutos do dia não ocupados por sono planejado nem por rotina
   * (resolução 10.48.1) — `1440 − sono planejado − minutosRotina`, nunca
   * negativo. É o dado que a pressão até o prazo (10.48.4) e a alocação
   * sugerida (10.48.5) consomem.
   */
  minutosLivres: number
  /** Compromissos datados do dia. */
  prazos: EventoCalendario[]
  /**
   * Sono registrado abaixo da meta daquele dia da semana.
   *
   * Só para dias passados: o sono de hoje ainda não aconteceu, e marcar o futuro
   * como falha seria mentira.
   */
  sonoAbaixo: boolean
  /**
   * Havia rotina prevista e algum check ficou sem marcar. Também só no passado,
   * pela mesma razão.
   */
  checkPendente: boolean
  ehHoje: boolean
  ehPassado: boolean
}

/**
 * Minutos entre dois ISO datetimes. Zero quando falta o fim.
 *
 * Reaproveita `horasEntre`, que já é testado e trata a virada da meia-noite —
 * escrever a subtração de novo aqui seria repetir a única parte difícil.
 */
function duracaoMinutos(inicio: string, fim: string | undefined): number {
  if (!fim) return 0
  return Math.round(horasEntre(inicio.slice(11, 16), fim.slice(11, 16)) * 60)
}

/**
 * `"Cálculo II (remarcado)"` → `"Cálculo II"`.
 *
 * O sufixo é acrescentado por `eventosFluxograma` na ocorrência remarcada, e
 * serve na agenda, onde a linha fala do compromisso daquele dia. No rótulo da
 * fatia ele atrapalharia: a fatia soma a matéria inteira do dia, e "remarcado"
 * descreve uma ocorrência, não o total.
 */
function semMarcaDeRemarcacao(titulo: string): string {
  return titulo.replace(/ \(remarcado\)$/, '')
}

/**
 * Uma entrada por dia do intervalo, inclusive dias vazios.
 *
 * Dia vazio é informação — "quarta está livre" é uma resposta — então a faixa
 * mantém a coluna e a agenda mantém a linha.
 */
export function cargaPorDia(
  eventos: readonly EventoCalendario[],
  intervalo: Intervalo,
  hoje: Date,
  planejamentoSono: readonly FontePlanejamentoSono[] = [],
  sonoRealizado: readonly FonteSonoRealizado[] = [],
  conclusoes: readonly string[] = [],
): DiaCarga[] {
  const inicio = deISO(intervalo.de)
  const fim = deISO(intervalo.ate)
  if (fim < inicio) return []

  const hojeISO = paraISO(hoje)
  const feitos = new Set(conclusoes)

  const horasDormidas = new Map<string, number>()
  for (const registro of sonoRealizado) {
    if (registro.horas_calculadas !== null) {
      horasDormidas.set(registro.data, registro.horas_calculadas)
    }
  }

  const metaPorDiaSemana = new Map<number, number>()
  for (const plano of planejamentoSono) {
    metaPorDiaSemana.set(
      plano.dia_semana,
      horasEntre(plano.hora_dormir_alvo, plano.hora_acordar_alvo),
    )
  }

  // Índice dos eventos por data, para não varrer a lista toda a cada dia
  const porData = new Map<string, EventoCalendario[]>()
  for (const evento of eventos) {
    const data = evento.inicio.slice(0, 10)
    const lista = porData.get(data)
    if (lista) lista.push(evento)
    else porData.set(data, [evento])
  }

  return eachDayOfInterval({ start: inicio, end: fim }).map((dia) => {
    const data = paraISO(dia)
    const doDia = porData.get(data) ?? []

    /*
     * Agrupado por camada **e cor**: duas matérias distintas no mesmo dia viram
     * duas fatias de estudos, cada uma na sua cor. A chave é a cor e não o nome
     * porque é a cor que a barra desenha — e `EventoCalendario` não carrega o id
     * da matéria (o `origemId` da aula é o id da regra do fluxograma).
     *
     * Matéria sem cor escolhida cai na chave vazia e se junta ao resto da
     * camada, que é o comportamento anterior a esta mudança.
     */
    const porCamadaECor = new Map<
      string,
      { camada: CamadaCalendario; cor?: string; rotulo?: string; minutos: number }
    >()
    const prazos: EventoCalendario[] = []
    let temRotina = false
    let checkPendente = false

    for (const evento of doDia) {
      if (ehImportante(evento)) {
        prazos.push(evento)
        continue
      }
      // Sono é contexto, não carga: entra na faixa de fundo da agenda, não na
      // barra de tempo comprometido
      if (evento.tipo === 'sono') continue

      /*
       * A barra mede tempo que a ROTINA compromete — projeção do fluxograma.
       * Evento com `estado` é desfecho, não previsão, e contá-lo aqui produzia
       * dois erros observados na tela (resolução 10.31):
       *
       * - `cancelado` carrega o horário do padrão, então somava 1h de "tempo
       *   comprometido" num dia em que justamente nada foi comprometido;
       * - `feito` ligava `temRotina` e, como o `origemId` dele é o `treino_id` e
       *   não o id da regra, nunca casava com `conclusoes` — o dia em que o
       *   treino ACONTECEU ganhava o anel de "rotina sem check".
       *
       * A duração do realizado também não sairia daqui: ela é `duracao_minutos`,
       * informada pelo usuário, e não a diferença entre início e fim (10.24).
       */
      if (evento.estado !== undefined) continue

      temRotina = true
      const minutos = duracaoMinutos(evento.inicio, evento.fim)
      const chave = `${evento.camada}|${evento.cor ?? ''}`
      const grupo = porCamadaECor.get(chave)
      if (grupo) {
        grupo.minutos += minutos
      } else {
        porCamadaECor.set(chave, {
          camada: evento.camada,
          minutos,
          ...(evento.cor
            ? { cor: evento.cor, rotulo: semMarcaDeRemarcacao(evento.titulo) }
            : {}),
        })
      }

      /*
       * Trabalho não tem entidade nem check (resolução 10.48.0): não entra
       * em `conclusoes_fluxograma`, e cobrar "marquei que trabalhei?" seria
       * ruído puro — por isso a camada fica de fora deste sinal, mesmo
       * contando normalmente para `minutosRotina` acima.
       */
      if (
        evento.camada !== 'trabalho' &&
        evento.origemId &&
        !feitos.has(`${evento.origemId}@${data}`)
      ) {
        checkPendente = true
      }
    }

    /*
     * Ordem estável em dois níveis: camada por `ORDEM_CAMADAS`, e dentro da
     * camada a fatia maior primeiro, com o nome como desempate. Sem o desempate,
     * duas matérias com a mesma duração poderiam trocar de lugar entre renders —
     * a barra mudaria de forma sem nada ter mudado no dado.
     */
    const segmentos = ORDEM_CAMADAS.flatMap((camada) =>
      [...porCamadaECor.values()]
        .filter((grupo) => grupo.camada === camada && grupo.minutos > 0)
        .sort(
          (a, b) =>
            b.minutos - a.minutos ||
            (a.rotulo ?? '').localeCompare(b.rotulo ?? ''),
        ),
    )

    const ehPassado = data < hojeISO
    const meta = metaPorDiaSemana.get(dia.getDay())
    const dormido = horasDormidas.get(data)

    const minutosRotina = segmentos.reduce((soma, s) => soma + s.minutos, 0)
    const sonoPlanejadoMinutos =
      meta !== undefined ? Math.round(meta * 60) : SONO_PADRAO_MINUTOS

    return {
      data,
      segmentos,
      minutosRotina,
      // Piso em zero: rotina que estoure o dia produz 0, nunca um negativo
      // silencioso — é esse 0 que liga o sinal de sobrecarga da 10.48.7.
      minutosLivres: Math.max(
        0,
        1440 - sonoPlanejadoMinutos - minutosRotina,
      ),
      prazos,
      sonoAbaixo:
        ehPassado &&
        meta !== undefined &&
        dormido !== undefined &&
        dormido < meta,
      checkPendente: ehPassado && temRotina && checkPendente,
      ehHoje: data === hojeISO,
      ehPassado,
    }
  })
}

/**
 * Maior carga do período, para dimensionar as barras.
 *
 * Escala relativa e não absoluta: o que interessa é qual dia pesa mais nesta
 * semana, não comparar semanas entre si. Um piso evita que um único dia de meia
 * hora vire uma barra cheia.
 */
export function escalaCarga(dias: readonly DiaCarga[]): number {
  const maior = dias.reduce((max, dia) => Math.max(max, dia.minutosRotina), 0)
  return Math.max(maior, 120)
}

/** `210` → `3h30`; `60` → `1h`; `0` → `—` */
export function formatarCarga(minutos: number): string {
  if (minutos <= 0) return '—'
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

/**
 * Eventos do dia na ordem em que a agenda deve mostrá-los.
 *
 * Prazo primeiro, independente de horário: é o que se precisa ver antes de
 * qualquer coisa. Depois a rotina por hora, e o sono por último, porque fecha o
 * dia. Sem esta ordem o `08:00 Cálculo` viria antes da prova só por ter horário.
 */
export function ordenarDoDia(
  eventos: readonly EventoCalendario[],
): EventoCalendario[] {
  function faixa(evento: EventoCalendario): number {
    if (ehImportante(evento)) return 0
    if (evento.tipo === 'sono') return 2
    return 1
  }

  return [...eventos].sort(
    (a, b) =>
      faixa(a) - faixa(b) ||
      a.inicio.localeCompare(b.inicio) ||
      a.titulo.localeCompare(b.titulo),
  )
}
