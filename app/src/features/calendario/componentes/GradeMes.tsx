import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import type { DateClickArg } from '@fullcalendar/interaction'
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core'
import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { paraISO } from '@/lib/datas'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { formatarCarga, type DiaCarga } from '../carga'
import { COR_CAMADA, ehImportante, type EventoCalendario } from '../eventos'

interface GradeMesProps {
  eventos: readonly EventoCalendario[]
  /** Pra mostrar o tempo livre do dia na célula (resolução 10.48.1). */
  dias: readonly DiaCarga[]
  onMudarDatas: (de: string, ate: string) => void
  onClicarEvento: (id: string) => void
  /** Clique no número do dia (não num evento) — abre o detalhe daquele dia. */
  onClicarDia: (data: string) => void
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

/**
 * A grade de mês, agora secundária.
 *
 * Em módulo próprio para o `React.lazy` da página conseguir separá-la do bundle:
 * o FullCalendar é o maior pedaço do app (67 kB gzip) e a vista padrão passou a
 * ser a agenda, que não precisa dele. Quem nunca abrir "Mês" nunca baixa.
 *
 * Mantém o mesmo peso de dois níveis da agenda: prazo com preenchimento sólido,
 * rotina só com a borda. Antes tudo era bloco cheio, e a prova pesava igual à
 * terceira aula da semana.
 */
export function GradeMes({
  eventos,
  dias,
  onMudarDatas,
  onClicarEvento,
  onClicarDia,
  initialView = 'dayGridMonth',
}: GradeMesProps) {
  const telaEstreita = useMediaQuery('(width < 40rem)')

  const vistaEfetiva =
    initialView === 'timeGridWeek' && telaEstreita
      ? VISTA_HORAS_MOBILE
      : initialView

  const livresPorData = useMemo(
    () => new Map(dias.map((dia) => [dia.data, dia.minutosLivres])),
    [dias],
  )

  const eventosFullCalendar = eventos.map((evento) => {
    const cor = COR_CAMADA[evento.camada]
    const prazo = ehImportante(evento)

    return {
      id: evento.id,
      title: evento.titulo,
      start: evento.inicio,
      ...(evento.fim ? { end: evento.fim } : {}),
      allDay: evento.diaInteiro,
      // Prazo preenche; rotina fica só com a borda e o texto na cor do tema
      backgroundColor: prazo ? cor : 'transparent',
      borderColor: cor,
      textColor: prazo ? '#ffffff' : 'var(--foreground)',
      // Sono é contexto de fundo, não compromisso — não deve competir
      // visualmente com aulas e treinos na grade semanal.
      display: evento.camada === 'sono' ? 'background' : 'auto',
      classNames: evento.rota ? ['evento-clicavel'] : [],
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
          dayCellContent={(arg) => {
            const minutosLivres = livresPorData.get(paraISO(arg.date))
            return (
              <div className="flex w-full items-baseline justify-between gap-1 px-0.5">
                <span>{arg.dayNumberText}</span>
                {/* Tempo livre do dia (resolução 10.48.1) — omitido em zero */}
                {minutosLivres !== undefined && minutosLivres > 0 && (
                  <span className="text-muted-foreground font-mono text-[9px] tabular-nums">
                    {formatarCarga(minutosLivres)}
                  </span>
                )}
              </div>
            )
          }}
          firstDay={0}
          height="auto"
          nowIndicator
          // Semana começa às 5h para a grade não desperdiçar espaço na
          // madrugada, mas sem cortar o bloco de sono
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
