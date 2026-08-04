import { useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import type { DatesSetArg } from '@fullcalendar/core'
import { CalendarDays } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { paraISO } from '@/lib/datas'
import { endOfMonth, startOfMonth } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  COR_CAMADA,
  ROTULO_CAMADA,
  construirEventos,
  type CamadaCalendario,
} from '@/features/calendario/eventos'
import { useFontesCalendario } from '@/features/calendario/hooks'

const CAMADAS = Object.keys(ROTULO_CAMADA) as CamadaCalendario[]

export default function CalendarioPage() {
  const hoje = useMemo(() => new Date(), [])

  /**
   * Intervalo visível. Começa no mês atual e é atualizado pelo `datesSet` do
   * FullCalendar — é o que delimita a expansão da recorrência (resolução 10.5),
   * evitando gerar ocorrências fora da tela.
   */
  const [intervalo, setIntervalo] = useState(() => ({
    de: paraISO(startOfMonth(hoje)),
    ate: paraISO(endOfMonth(hoje)),
  }))

  const [visiveis, setVisiveis] = useState<Set<CamadaCalendario>>(
    () => new Set(CAMADAS),
  )

  const { fontes, carregando, erro } = useFontesCalendario(
    intervalo.de,
    intervalo.ate,
  )

  const eventos = useMemo(
    () => construirEventos(fontes, intervalo),
    [fontes, intervalo],
  )

  const eventosFullCalendar = useMemo(
    () =>
      eventos
        .filter((evento) => visiveis.has(evento.camada))
        .map((evento) => ({
          id: evento.id,
          title: evento.titulo,
          start: evento.inicio,
          ...(evento.fim ? { end: evento.fim } : {}),
          allDay: evento.diaInteiro,
          backgroundColor: COR_CAMADA[evento.camada],
          borderColor: COR_CAMADA[evento.camada],
          // Sono é contexto de fundo, não compromisso — não deve competir
          // visualmente com aulas e treinos na grade semanal.
          display: evento.camada === 'sono' ? 'background' : 'auto',
        })),
    [eventos, visiveis],
  )

  function alternarCamada(camada: CamadaCalendario) {
    setVisiveis((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(camada)) proximo.delete(camada)
      else proximo.add(camada)
      return proximo
    })
  }

  function aoMudarDatas(arg: DatesSetArg) {
    const de = paraISO(arg.start)
    // `end` do FullCalendar é exclusivo; recuar um dia evita buscar um dia extra
    const ate = paraISO(new Date(arg.end.getTime() - 86_400_000))
    setIntervalo((atual) =>
      atual.de === de && atual.ate === ate ? atual : { de, ate },
    )
  }

  return (
    <>
      <PageHeader
        titulo="Calendário"
        descricao="Provas, aulas, treinos, vencimentos, marcos e sono em uma só grade."
        pilar="sono"
        icone={CalendarDays}
      />

      {erro && (
        <Card className="border-status-risco/40 mb-4">
          <CardContent className="text-status-risco text-sm">
            Erro ao carregar: {erro.message}
          </CardContent>
        </Card>
      )}

      {/* Filtro de camadas (plano 6.2) */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CAMADAS.map((camada) => {
          const ativa = visiveis.has(camada)
          return (
            <button
              key={camada}
              type="button"
              onClick={() => alternarCamada(camada)}
              aria-pressed={ativa}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                ativa
                  ? 'border-border bg-card text-foreground'
                  : 'border-transparent bg-muted text-muted-foreground',
              )}
            >
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{
                  backgroundColor: ativa ? COR_CAMADA[camada] : 'currentColor',
                  opacity: ativa ? 1 : 0.4,
                }}
              />
              {ROTULO_CAMADA[camada]}
            </button>
          )
        })}
        {carregando && (
          <span className="text-muted-foreground text-xs">carregando…</span>
        )}
      </div>

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
            firstDay={1}
            height="auto"
            nowIndicator
            // Semana começa às 6h para a grade não desperdiçar espaço na
            // madrugada, mas sem cortar o bloco de sono
            slotMinTime="05:00:00"
            slotMaxTime="24:00:00"
            expandRows
            dayMaxEvents={3}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
          />
        </CardContent>
      </Card>
    </>
  )
}
