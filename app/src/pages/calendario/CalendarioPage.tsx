import { Suspense, lazy, useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDays, addWeeks, endOfMonth, format, startOfMonth } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Layers } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { inicioSemana, paraISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import {
  COR_CAMADA,
  ROTULO_CAMADA,
  construirEventos,
  type CamadaCalendario,
  type EventoCalendario,
} from '@/features/calendario/eventos'
import { cargaPorDia } from '@/features/calendario/carga'
import { useFontesCalendario } from '@/features/calendario/hooks'
import { Agenda } from '@/features/calendario/componentes/Agenda'
import { FaixaCarga } from '@/features/calendario/componentes/FaixaCarga'

/**
 * A grade de mês só é baixada por quem abre a vista de mês. É o maior pedaço do
 * bundle (67 kB gzip) e a vista padrão passou a ser a agenda, que não usa nada
 * do FullCalendar.
 */
const GradeMes = lazy(() =>
  import('@/features/calendario/componentes/GradeMes').then((modulo) => ({
    default: modulo.GradeMes,
  })),
)

const CAMADAS = Object.keys(ROTULO_CAMADA) as CamadaCalendario[]

type Vista = 'agenda' | 'mes'

export default function CalendarioPage() {
  const hoje = useMemo(() => new Date(), [])
  const navegar = useNavigate()

  const [vista, setVista] = useState<Vista>('agenda')
  const [visiveis, setVisiveis] = useState<Set<CamadaCalendario>>(
    () => new Set(CAMADAS),
  )

  /** Segunda-feira da semana visível na agenda. */
  const [ancora, setAncora] = useState(() => inicioSemana(hoje))
  const [diaFocado, setDiaFocado] = useState(() => paraISO(hoje))

  /**
   * Intervalo do mês, controlado pelo próprio FullCalendar via `datesSet`. Fica
   * separado do da agenda porque as duas vistas navegam sozinhas — trocar de
   * vista não deve arrastar a outra para o período errado.
   */
  const [intervaloMes, setIntervaloMes] = useState(() => ({
    de: paraISO(startOfMonth(hoje)),
    ate: paraISO(endOfMonth(hoje)),
  }))

  const semana = useMemo(
    () => ({ de: paraISO(ancora), ate: paraISO(addDays(ancora, 6)) }),
    [ancora],
  )

  const intervalo = vista === 'agenda' ? semana : intervaloMes

  const { fontes, carga, carregando, erro } = useFontesCalendario(
    intervalo.de,
    intervalo.ate,
    { comCarga: true },
  )

  const hojeISO = paraISO(hoje)

  const eventos = useMemo(
    () => construirEventos(fontes, intervalo, hojeISO),
    [fontes, intervalo, hojeISO],
  )

  /** Camadas escondidas saem de tudo: da faixa, da agenda e da grade. */
  const visiveisFiltrados = useMemo(
    () => eventos.filter((evento) => visiveis.has(evento.camada)),
    [eventos, visiveis],
  )

  const dias = useMemo(
    () =>
      cargaPorDia(
        visiveisFiltrados,
        intervalo,
        hoje,
        fontes.planejamentoSono,
        carga.sonoRealizado,
        carga.conclusoes,
      ),
    [visiveisFiltrados, intervalo, hoje, fontes.planejamentoSono, carga],
  )

  const eventosPorData = useMemo(() => {
    const mapa = new Map<string, EventoCalendario[]>()
    for (const evento of visiveisFiltrados) {
      const data = evento.inicio.slice(0, 10)
      const lista = mapa.get(data)
      if (lista) lista.push(evento)
      else mapa.set(data, [evento])
    }
    return mapa
  }, [visiveisFiltrados])

  /** Índice por id para o clique na grade resolver a rota sem varrer a lista. */
  const rotaPorId = useMemo(
    () =>
      new Map(
        eventos.flatMap((e) => (e.rota ? [[e.id, e.rota] as const] : [])),
      ),
    [eventos],
  )

  const refsDia = useRef(new Map<string, HTMLLIElement>())

  const registrarDia = useCallback(
    (data: string, elemento: HTMLLIElement | null) => {
      if (elemento) refsDia.current.set(data, elemento)
      else refsDia.current.delete(data)
    },
    [],
  )

  /** Clicar na faixa leva a agenda ao dia — é o que liga as duas metades. */
  function focarDia(data: string) {
    setDiaFocado(data)
    refsDia.current.get(data)?.scrollIntoView({
      block: 'nearest',
      // A regra de movimento do sistema: sem animação que não comunique estado.
      // Aqui ela comunica de onde para onde a lista andou.
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  }

  function alternarCamada(camada: CamadaCalendario) {
    setVisiveis((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(camada)) proximo.delete(camada)
      else proximo.add(camada)
      return proximo
    })
  }

  function irParaHoje() {
    setAncora(inicioSemana(hoje))
    setDiaFocado(paraISO(hoje))
  }

  const rotuloSemana = useMemo(() => {
    const fim = addDays(ancora, 6)
    const mesmoMes = ancora.getMonth() === fim.getMonth()
    return mesmoMes
      ? `${format(ancora, 'd')}–${format(fim, "d 'de' MMMM")}`
      : `${format(ancora, "d 'de' MMM")} – ${format(fim, "d 'de' MMM")}`
  }, [ancora])

  const escondidas = CAMADAS.length - visiveis.size

  return (
    <>
      <PageHeader
        titulo="Calendário"
        descricao="Provas, contas e marcos sobre a rotina da semana."
        pilar="sono"
        icone={CalendarDays}
        acoes={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  <Layers className="size-4" />
                  Camadas
                  {escondidas > 0 && (
                    <span className="text-muted-foreground tabular-nums">
                      −{escondidas}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mostrar</DropdownMenuLabel>
                {CAMADAS.map((camada) => (
                  <DropdownMenuCheckboxItem
                    key={camada}
                    checked={visiveis.has(camada)}
                    onCheckedChange={() => alternarCamada(camada)}
                  >
                    <span
                      aria-hidden
                      className="size-2 rounded-full"
                      style={{ backgroundColor: COR_CAMADA[camada] }}
                    />
                    {ROTULO_CAMADA[camada]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Alternador de vista: dois estados, então dois botões e não um menu */}
            <div className="border-border flex items-center rounded-md border p-0.5">
              {(['agenda', 'mes'] as const).map((opcao) => (
                <Button
                  key={opcao}
                  size="sm"
                  variant="ghost"
                  aria-pressed={vista === opcao}
                  onClick={() => setVista(opcao)}
                  className={cn(
                    'h-7 px-2.5 text-xs',
                    vista === opcao && 'bg-accent text-foreground',
                  )}
                >
                  {opcao === 'agenda' ? 'Semana' : 'Mês'}
                </Button>
              ))}
            </div>
          </div>
        }
      />

      {erro && (
        <Card className="border-status-risco/40 mb-4">
          <CardContent className="text-status-risco text-sm">
            Erro ao carregar: {erro.message}
          </CardContent>
        </Card>
      )}

      {vista === 'agenda' ? (
        <div className="surgir-grupo space-y-4">
          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium capitalize">
                  {rotuloSemana}
                  {carregando && (
                    <span className="text-muted-foreground ml-2 text-xs font-normal">
                      carregando…
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Semana anterior"
                    onClick={() => setAncora((atual) => addWeeks(atual, -1))}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={irParaHoje}
                  >
                    Hoje
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Semana seguinte"
                    onClick={() => setAncora((atual) => addWeeks(atual, 1))}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>

              <FaixaCarga
                dias={dias}
                selecionado={diaFocado}
                onSelecionar={focarDia}
              />

              <LegendaFaixa />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Agenda
                dias={dias}
                eventosPorData={eventosPorData}
                selecionado={diaFocado}
                refDia={registrarDia}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Suspense fallback={<Skeleton className="h-[32rem] w-full" />}>
          <GradeMes
            eventos={visiveisFiltrados}
            onMudarDatas={(de, ate) =>
              setIntervaloMes((atual) =>
                atual.de === de && atual.ate === ate ? atual : { de, ate },
              )
            }
            onClicarEvento={(id) => {
              const rota = rotaPorId.get(id)
              if (rota) navegar(rota)
            }}
          />
        </Suspense>
      )}
    </>
  )
}

/**
 * Legenda das duas marcas da faixa.
 *
 * Existe porque um traço e um anel de 6px não se explicam sozinhos, e a
 * alternativa — descobrir no hover — não funciona no celular, que é onde a página
 * mais é usada.
 */
function LegendaFaixa() {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="bg-muted-foreground size-1.5 rounded-full"
        />
        prazo no dia
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="bg-sono h-0.5 w-2.5 rounded-full" />
        dormiu abaixo da meta
      </span>
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="border-muted-foreground size-1.5 rounded-full border"
        />
        rotina sem check
      </span>
    </div>
  )
}
