import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core'
import { Card, CardContent } from '@/components/ui/card'
import { paraISO } from '@/lib/datas'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { COR_CAMADA, ehImportante, type EventoCalendario } from '../eventos'

interface GradeMesProps {
  eventos: readonly EventoCalendario[]
  onMudarDatas: (de: string, ate: string) => void
  onClicarEvento: (id: string) => void
}

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
  onMudarDatas,
  onClicarEvento,
}: GradeMesProps) {
  const telaEstreita = useMediaQuery('(width < 40rem)')

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

  return (
    <Card>
      <CardContent className="calendario-nexus">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="dayGridMonth"
          locale={ptBrLocale}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek',
          }}
          buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana' }}
          events={eventosFullCalendar}
          datesSet={aoMudarDatas}
          eventClick={aoClicarEvento}
          firstDay={1}
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
