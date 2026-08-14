import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import type { DateClickArg, EventResizeDoneArg } from '@fullcalendar/interaction'
import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventDropArg,
} from '@fullcalendar/core'
import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatarDuracao, paraISO } from '@/lib/datas'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { type DiaCarga } from '../carga'
import {
  corDoEvento,
  ehBlocoCheio,
  precisaConfirmarMovimento,
  type EventoCalendario,
} from '../eventos'

interface GradeMesProps {
  eventos: readonly EventoCalendario[]
  /** Pra mostrar o tempo livre do dia na célula (resolução 10.48.1). */
  dias: readonly DiaCarga[]
  onMudarDatas: (de: string, ate: string) => void
  onClicarEvento: (id: string) => void
  /** Clique no número do dia (não num evento) — abre o detalhe daquele dia. */
  onClicarDia: (data: string) => void
  /**
   * Arrastar sobre um horário vazio na grade de Horas, do início ao fim
   * desejado — estilo Google Agenda (chat 2026-08-14). Ausente = grade sem
   * seleção de horário, só o clique no dia (`onClicarDia`) segue existindo.
   * Só se aplica à vista de Horas: na de Mês, arrastar seleciona um
   * intervalo de DIAS, outra interação, e não é o que foi pedido.
   */
  onSelecionarIntervalo?: (
    data: string,
    horarioInicio: string | null,
    horarioFim: string | null,
  ) => void
  /**
   * Arrastar ou redimensionar um evento (resolução "arrastar eventos",
   * ago/2026). Ausente = grade só de leitura, sem `editable` em nenhum
   * evento.
   */
  onMoverEvento?: (
    evento: EventoCalendario,
    novaData: string,
    novoInicio: string | null,
    novoFim: string | null,
  ) => Promise<void>
  /**
   * Chamado no lugar de `onMoverEvento` quando o tipo exige confirmação
   * (prova — `precisaConfirmarMovimento`). O arrasto já foi revertido
   * visualmente quando isto dispara.
   */
  onPedirConfirmacaoMovimento?: (
    evento: EventoCalendario,
    novaData: string,
    novoInicio: string | null,
  ) => void
  /**
   * Vista inicial do FullCalendar (resolução "criar eventos", ago/2026).
   *
   * O toggle interno do próprio FullCalendar (Mês/Semana no canto do
   * cabeçalho) foi removido: com o toggle de cima da página (Semana/Mês/
   * Horas) já escolhendo a vista, os dois controles podiam desacordar — trocar
   * pelo botão interno mudava a grade sem mover o destaque de "Horas" lá em
   * cima, parecendo bugado. Agora só existe um jeito de trocar de vista.
   *
   * O React só lê `initialView` na montagem — mudar a prop sozinha não move
   * o calendário. Quem usa este componente precisa forçar remount (`key`)
   * quando quiser trocar a vista inicial de fora.
   */
  initialView?: 'dayGridMonth' | 'timeGridWeek'
}

/**
 * `timeGridWeek` em 7 colunas não cabe num celular — cada coluna ficava com
 * ~40px, hora e evento ilegíveis. `timeGridTresDias` é a mesma grade de
 * horas, só com um terço da largura por coluna: a "planilha de horas" que a
 * vista promete, só que legível. Desktop continua vendo a semana inteira.
 */
const VISTA_HORAS_MOBILE = 'timeGridTresDias'

/** `Date` → `HH:mm:ss`, o formato que as mutations de mover esperam. */
function formatarHoraISO(data: Date): string {
  return data.toTimeString().slice(0, 8)
}

/**
 * A grade de mês, agora secundária.
 *
 * Em módulo próprio para o `React.lazy` da página conseguir separá-la do bundle:
 * o FullCalendar é o maior pedaço do app (67 kB gzip) e a vista padrão passou a
 * ser a agenda, que não precisa dele. Quem nunca abrir "Mês" nunca baixa.
 *
 * Mantém o peso de dois níveis da agenda: preenchimento sólido para o que tem
 * data própria ou já aconteceu, borda só para a rotina prevista. Antes tudo era
 * bloco cheio, e a prova pesava igual à terceira aula da semana; depois o
 * critério era só `ehImportante`, e aí a sessão de estudo registrada ficava
 * idêntica à aula prevista da mesma matéria. Quem decide é `ehBlocoCheio`.
 */
export function GradeMes({
  eventos,
  dias,
  onMudarDatas,
  onClicarEvento,
  onClicarDia,
  onMoverEvento,
  onPedirConfirmacaoMovimento,
  onSelecionarIntervalo,
  initialView = 'dayGridMonth',
}: GradeMesProps) {
  const telaEstreita = useMediaQuery('(width < 40rem)')

  const vistaEfetiva =
    initialView === 'timeGridWeek' && telaEstreita
      ? VISTA_HORAS_MOBILE
      : initialView

  /*
   * Só na grade de Horas: na de Mês, "arrastar" já significa outra coisa
   * (marcar um intervalo de dias), e o clique isolado no dia colidiria com
   * `onClicarDia` — os dois disparariam para o mesmo gesto.
   */
  const selecaoDeHorarioLigada =
    Boolean(onSelecionarIntervalo) && initialView === 'timeGridWeek'

  const livresPorData = useMemo(
    () => new Map(dias.map((dia) => [dia.data, dia.minutosLivres])),
    [dias],
  )

  /*
   * Sono fica de fora destas vistas. Ele é contexto de fundo, não compromisso,
   * e numa grade de mês ou de horas rouba a leitura dos que são. Segue na
   * agenda, e o cálculo de tempo livre das células não usa estes eventos —
   * vem de `planejamentoSono` (carga.ts).
   */
  const eventosFullCalendar = eventos
    .filter((evento) => evento.camada !== 'sono')
    .map((evento) => {
      const cor = corDoEvento(evento)
      const cheio = ehBlocoCheio(evento)
      /*
       * O que não acontece naquele slot — desmarcado, ou movido para outro dia.
       * Sem esta marca, a grade mostrava a aula cancelada da semana passada
       * exatamente igual à que aconteceu: `estado` existia no dado desde a
       * 10.31 e só a agenda o lia, então o risco existia numa vista e não nas
       * outras duas.
       *
       * O destino da remarcação não é riscado: ele vem de `eventosFluxograma`
       * sem `estado`, e é onde a ocorrência de fato está.
       */
      const riscado =
        evento.estado === 'cancelado' || evento.estado === 'remarcado'

      return {
        id: evento.id,
        title: evento.titulo,
        start: evento.inicio,
        ...(evento.fim ? { end: evento.fim } : {}),
        allDay: evento.diaInteiro,
        // Prazo e fato preenchem; rotina prevista fica só com a borda e o texto
        // na cor do tema (`ehBlocoCheio` documenta por que não é `ehImportante`)
        backgroundColor: cheio ? cor : 'transparent',
        borderColor: cor,
        textColor: cheio ? '#ffffff' : 'var(--foreground)',
        classNames: [
          ...(evento.rota ? ['evento-clicavel'] : []),
          ...(riscado ? ['evento-riscado'] : []),
          /*
           * Com o check do dia preenchendo a aula, preenchimento passou a
           * significar STATUS ("aconteceu") e parou de conseguir dizer o QUE a
           * coisa é: aula cumprida e sessão de estudo da mesma matéria voltaram
           * a ser dois blocos idênticos. A textura devolve a identidade num
           * canal que não é a cor — o sistema já exige isso em outros pontos
           * ("nenhuma informação passa por cor sozinha").
           *
           * Listra só na sessão, e não em todo `estado: 'feito'`: aula com
           * check e treino executado OCUPAM a vaga da rotina (o treino previsto
           * é até filtrado quando há execução). A sessão de estudo não tem vaga
           * nenhuma na grade — ela é esforço além dela, e é isso que a textura
           * diz. Liso = cumpri o que estava planejado; listrado = fiz a mais.
           */
          ...(evento.tipo === 'estudo' ? ['evento-sessao'] : []),
        ],
        editable: Boolean(onMoverEvento) && evento.movimento !== undefined,
        // Redimensionar só faz sentido pra quem tem hora — prova e marco são
        // datas soltas, sem `fim` que dependa do horário.
        durationEditable:
          Boolean(onMoverEvento) &&
          evento.movimento !== undefined &&
          !evento.diaInteiro,
      }
    })

  function aoMudarDatas(arg: DatesSetArg) {
    // `end` do FullCalendar é exclusivo; recuar um dia evita buscar um dia extra
    onMudarDatas(
      paraISO(arg.start),
      paraISO(new Date(arg.end.getTime() - 86_400_000)),
    )
  }

  function aoClicarEvento(arg: EventClickArg) {
    arg.jsEvent.preventDefault()
    onClicarEvento(arg.event.id)
  }

  function aoClicarDia(arg: DateClickArg) {
    onClicarDia(paraISO(arg.date))
  }

  /**
   * Arrastou de um horário a outro na grade de Horas — estilo Google Agenda.
   * `allDay` só acontece se o arrasto tocar a faixa de "dia inteiro" da
   * vista de Horas; aí não há horário para sugerir, só a data.
   */
  function aoSelecionarIntervalo(arg: DateSelectArg) {
    const data = paraISO(arg.start)
    onSelecionarIntervalo?.(
      data,
      arg.allDay ? null : formatarHoraISO(arg.start),
      arg.allDay ? null : formatarHoraISO(arg.end),
    )
  }

  async function aoSoltarEvento(arg: EventDropArg) {
    const evento = eventos.find((e) => e.id === arg.event.id)
    if (!evento) {
      arg.revert()
      return
    }
    const novaData = paraISO(arg.event.start as Date)
    const novoInicio = evento.diaInteiro
      ? null
      : formatarHoraISO(arg.event.start as Date)

    if (precisaConfirmarMovimento(evento)) {
      // Prova recalcula pressão de prazo e risco em outras telas — não é
      // operação para acontecer por esbarrão no touch. Reverte o movimento
      // visual e devolve a decisão pra quem monta a página.
      arg.revert()
      onPedirConfirmacaoMovimento?.(evento, novaData, novoInicio)
      return
    }

    if (!onMoverEvento) {
      arg.revert()
      return
    }

    try {
      await onMoverEvento(
        evento,
        novaData,
        novoInicio,
        evento.diaInteiro || !arg.event.end
          ? null
          : formatarHoraISO(arg.event.end),
      )
    } catch {
      // A mutation já mostra o toast de erro (hooks de cada feature dona);
      // aqui só desfazemos o movimento visual, senão o bloco fica no lugar
      // novo na tela com o banco no lugar antigo até o próximo refresh.
      arg.revert()
    }
  }

  async function aoRedimensionarEvento(arg: EventResizeDoneArg) {
    const evento = eventos.find((e) => e.id === arg.event.id)
    if (!evento || !onMoverEvento || !arg.event.end) {
      arg.revert()
      return
    }
    try {
      await onMoverEvento(
        evento,
        paraISO(arg.event.start as Date),
        formatarHoraISO(arg.event.start as Date),
        formatarHoraISO(arg.event.end),
      )
    } catch {
      arg.revert()
    }
  }

  return (
    <Card>
      <CardContent className="calendario-nexus">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={vistaEfetiva}
          views={{
            [VISTA_HORAS_MOBILE]: { type: 'timeGrid', duration: { days: 3 } },
          }}
          locale={ptBrLocale}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            // Sem toggle de vista aqui — é o de cima da página agora.
            right: '',
          }}
          buttonText={{ today: 'Hoje' }}
          events={eventosFullCalendar}
          datesSet={aoMudarDatas}
          eventClick={aoClicarEvento}
          dateClick={aoClicarDia}
          eventDrop={aoSoltarEvento}
          eventResize={aoRedimensionarEvento}
          selectable={selecaoDeHorarioLigada}
          select={aoSelecionarIntervalo}
          // Feedback visual do intervalo sendo arrastado — sem isto o
          // arrasto não desenha nada até soltar o mouse.
          selectMirror={selecaoDeHorarioLigada}
          // Imã de 15 min: sem isto o arrasto grava `14:03:27` e a agenda
          // fica ilegível.
          snapDuration="00:15:00"
          // Dois blocos no mesmo horário é conflito real — a grade não deve
          // impedir o registro de uma sobreposição que existe de fato; quem
          // avisa é a detecção de conflito, não o FullCalendar.
          eventOverlap
          dayCellContent={(arg) => {
            const minutosLivres = livresPorData.get(paraISO(arg.date))
            return (
              <div className="flex w-full items-baseline justify-between gap-1 px-0.5">
                <span>{arg.dayNumberText}</span>
                {/* Tempo livre do dia (resolução 10.48.1) — omitido em zero */}
                {minutosLivres !== undefined && minutosLivres > 0 && (
                  <span className="text-muted-foreground font-mono text-[9px] tabular-nums">
                    {formatarDuracao(minutosLivres)}
                  </span>
                )}
              </div>
            )
          }}
          firstDay={0}
          height="auto"
          nowIndicator
          // Semana começa às 5h para a grade não desperdiçar espaço mostrando
          // as horas da madrugada, quando quase nunca há evento
          slotMinTime="05:00:00"
          slotMaxTime="24:00:00"
          expandRows
          dayMaxEvents={telaEstreita ? 2 : 3}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
        />
      </CardContent>
    </Card>
  )
}
