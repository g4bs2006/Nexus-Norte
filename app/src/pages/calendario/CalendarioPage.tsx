import { Suspense, lazy, useCallback, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addDays, addWeeks, endOfMonth, format, startOfMonth } from 'date-fns'
import {
  Briefcase,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  History,
  Layers,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deISO, inicioSemana, paraISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import {
  COR_CAMADA,
  ROTULO_CAMADA,
  construirEventos,
  type CamadaCalendario,
  type EventoCalendario,
} from '@/features/calendario/eventos'
import { cargaPorDia, formatarCarga, type DiaCarga } from '@/features/calendario/carga'
import type { EventoLivre } from '@/features/eventos/api'
import { useFontesCalendario } from '@/features/calendario/hooks'
import {
  detectarConflitos,
  detectarFalhas,
  detectarSobrecarga,
  sugerirRealocacao,
} from '@/features/calendario/planejador'
import { Agenda } from '@/features/calendario/componentes/Agenda'
import { FaixaCarga } from '@/features/calendario/componentes/FaixaCarga'
import { CardPressaoPrazos } from '@/features/calendario/componentes/CardPressaoPrazos'

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

/**
 * `'grade'` é a mesma `GradeMes` de `'mes'`, só nascendo em `timeGridWeek`
 * (resolução "criar eventos", ago/2026) — a "planilha de dias e horas" que
 * faltava, sem duplicar componente: o FullCalendar já tinha as duas vistas,
 * só a segunda vivia escondida dentro do toggle interno do "Mês".
 */
type Vista = 'agenda' | 'mes' | 'grade'

/** "Horas" e não "Semana em grade": o botão precisa caber sem quebrar linha. */
const ROTULO_VISTA: Record<Vista, string> = {
  agenda: 'Semana',
  mes: 'Mês',
  grade: 'Horas',
}

export default function CalendarioPage() {
  const hoje = useMemo(() => new Date(), [])
  const navegar = useNavigate()

  const [vista, setVista] = useState<Vista>('agenda')
  const [visiveis, setVisiveis] = useState<Set<CamadaCalendario>>(
    () => new Set(CAMADAS),
  )

  /** Domingo da semana visível na agenda. */
  const [ancora, setAncora] = useState(() => inicioSemana(hoje))
  const [diaFocado, setDiaFocado] = useState(() => paraISO(hoje))

  /**
   * Dia clicado na grade de mês, para o card de detalhe. A grade de mês
   * mostra no máximo 2-3 eventos por célula (`dayMaxEvents`) e nem o horário
   * de cada um — o card reaproveita `Agenda` com um único dia, em vez de um
   * layout novo, para não divergir de como a agenda semanal já apresenta o
   * mesmo dado.
   */
  const [diaDetalhado, setDiaDetalhado] = useState<string | null>(null)

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
    () => construirEventos(fontes, intervalo),
    [fontes, intervalo],
  )

  /** Camadas escondidas saem de tudo: da faixa, da agenda e da grade. */
  const visiveisFiltrados = useMemo(
    () => eventos.filter((evento) => visiveis.has(evento.camada)),
    [eventos, visiveis],
  )

  /** Conflito e sobrecarga (resolução 10.48.7) — sobre o período visível. */
  const conflitos = useMemo(() => detectarConflitos(eventos), [eventos])

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

  const sobrecarga = useMemo(
    () => detectarSobrecarga(dias.filter((dia) => !dia.ehPassado)),
    [dias],
  )

  /**
   * Realocação do que falhou (resolução 10.48.6). `descartadas` é estado só
   * de sessão — dispensar uma sugestão não precisa de tabela nova, o mesmo
   * raciocínio de "propõe, não agenda" da 10.48.5.
   */
  const [descartadas, setDescartadas] = useState<Set<string>>(() => new Set())
  const falhas = useMemo(
    () =>
      detectarFalhas(eventos, new Set(carga.conclusoes), hojeISO).filter(
        (falha) => !descartadas.has(`${falha.fluxogramaId}@${falha.data}`),
      ),
    [eventos, carga.conclusoes, hojeISO, descartadas],
  )
  const sugestoesRealocacao = useMemo(
    () => sugerirRealocacao(falhas, dias.filter((dia) => !dia.ehPassado)),
    [falhas, dias],
  )

  const eventosPorData = useMemo(() => {
    const mapa = new Map<string, EventoCalendario[]>()
    /*
     * Fora da agenda, sono não é desenhado (mesmo filtro de `GradeMes`) — e
     * `DialogDia`, aberto a partir da grade de Mês/Horas, usa este mapa para
     * montar o detalhe do dia. Sem o filtro aqui, o dia clicado mostrava sono
     * que a própria grade por trás dele não mostra.
     */
    for (const evento of visiveisFiltrados) {
      if (vista !== 'agenda' && evento.camada === 'sono') continue
      const data = evento.inicio.slice(0, 10)
      const lista = mapa.get(data)
      if (lista) lista.push(evento)
      else mapa.set(data, [evento])
    }
    return mapa
  }, [visiveisFiltrados, vista])

  /** Índice por id para o clique na grade resolver a rota sem varrer a lista. */
  const rotaPorId = useMemo(
    () =>
      new Map(
        eventos.flatMap((e) => (e.rota ? [[e.id, e.rota] as const] : [])),
      ),
    [eventos],
  )

  /** Registro completo dos eventos avulsos, para a edição inline (Agenda). */
  const eventosLivresPorId = useMemo(
    () => new Map(fontes.eventosLivres.map((e) => [e.id, e])),
    [fontes.eventosLivres],
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

  /*
   * Sono não é desenhado nas vistas de Mês e Horas (nem na grade, nem no
   * detalhe do dia que ela abre) — o toggle não teria nada para governar
   * ali, por isso só aparece no menu quando a vista é agenda.
   */
  const camadasDoMenu = useMemo(
    () => (vista === 'agenda' ? CAMADAS : CAMADAS.filter((c) => c !== 'sono')),
    [vista],
  )

  const escondidas = camadasDoMenu.filter(
    (camada) => !visiveis.has(camada),
  ).length

  return (
    <>
      <PageHeader
        titulo="Calendário"
        descricao="Provas, contas e marcos sobre a rotina da semana."
        pilar="sono"
        icone={CalendarDays}
        acoes={
          <div className="flex items-center gap-2">
            {/*
              No celular os três links viram um menu só. Com quatro ações o
              cabeçalho já tinha estourado a largura da tela — foi o motivo de
              os rótulos sumirem no mobile — e "Blocos fixos" seria a quinta.
              De `sm:` para cima sobra espaço e eles voltam a ser botões.
            */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="sm:hidden"
                  aria-label="Ir para"
                >
                  <CalendarCheck className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/calendario/semana">
                    <CalendarCheck className="size-4" />
                    Ritual de domingo
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/calendario/historico">
                    <History className="size-4" />
                    Histórico
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/calendario/blocos">
                    <Briefcase className="size-4" />
                    Blocos fixos
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              asChild
              variant="secondary"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link to="/calendario/semana">
                <CalendarCheck className="size-4" />
                Ritual de domingo
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link to="/calendario/historico">
                <History className="size-4" />
                Histórico
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link to="/calendario/blocos">
                <Briefcase className="size-4" />
                Blocos fixos
              </Link>
            </Button>

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
                {camadasDoMenu.map((camada) => (
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

            {/* Alternador de vista: três estados, então botões e não um menu */}
            <div className="border-border flex items-center rounded-md border p-0.5">
              {(['agenda', 'mes', 'grade'] as const).map((opcao) => (
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
                  {ROTULO_VISTA[opcao]}
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

      {/*
        O calendário em si vem primeiro — os avisos (pressão, conflito,
        realocação) ficam depois. Antes eram três cards acima da agenda: no
        celular isso empurrava o próprio calendário pra fora da primeira
        dobra, o mesmo erro já corrigido antes na lista de lançamentos
        (resolução 10.27) — a tela cujo propósito é mostrar o calendário não
        pode abrir mostrando avisos sobre ele.
      */}
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
                eventosLivresPorId={eventosLivresPorId}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="surgir-grupo">
          <Suspense fallback={<Skeleton className="h-[32rem] w-full" />}>
            <GradeMes
              // Remonta ao trocar de vista: `initialView` só é lido na
              // montagem do FullCalendar.
              key={vista}
              initialView={vista === 'grade' ? 'timeGridWeek' : 'dayGridMonth'}
              eventos={visiveisFiltrados}
              dias={dias}
              onMudarDatas={(de, ate) =>
                setIntervaloMes((atual) =>
                  atual.de === de && atual.ate === ate ? atual : { de, ate },
                )
              }
              onClicarEvento={(id) => {
                const rota = rotaPorId.get(id)
                if (rota) {
                  navegar(rota)
                  return
                }
                /*
                 * Evento avulso não tem rota — não há para onde navegar. Abre
                 * o detalhe do dia, de onde dá para editar (mesmo caminho do
                 * clique no número do dia).
                 */
                const evento = eventos.find((e) => e.id === id)
                if (evento?.camada === 'evento') {
                  setDiaDetalhado(evento.inicio.slice(0, 10))
                }
              }}
              onClicarDia={setDiaDetalhado}
            />
          </Suspense>
        </div>
      )}

      <div className="surgir-grupo mt-4 space-y-4">
        <CardPressaoPrazos hoje={hojeISO} />

        {(conflitos.length > 0 || sobrecarga.length > 0) && (
          <Card className="border-status-atencao/40">
            <CardContent className="text-status-atencao space-y-1 text-sm">
              {conflitos.map((conflito) => (
                <p key={`${conflito.eventoA.id}-${conflito.eventoB.id}`}>
                  Conflito em {format(deISO(conflito.data), 'dd/MM')}:{' '}
                  {conflito.eventoA.titulo} e {conflito.eventoB.titulo} se
                  sobrepõem.
                </p>
              ))}
              {sobrecarga.map((dia) => (
                <p key={dia.data}>
                  {format(deISO(dia.data), 'dd/MM')} sem folga nenhuma na rotina.
                </p>
              ))}
            </CardContent>
          </Card>
        )}

        {sugestoesRealocacao.length > 0 && (
          <Card>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium">Ficou pra trás</p>
              {sugestoesRealocacao.map((item) => (
                <div
                  key={`${item.fluxogramaId}@${item.data}`}
                  className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2"
                >
                  <p className="text-muted-foreground">
                    {item.titulo} —{' '}
                    {item.motivo === 'cancelado' ? 'cancelado' : 'sem check'} em{' '}
                    {format(deISO(item.data), 'dd/MM')}.{' '}
                    {item.sugestao.length > 0 ? (
                      <>
                        Quer remarcar pra{' '}
                        {item.sugestao
                          .map(
                            (b) =>
                              `${format(deISO(b.data), 'dd/MM')} (${formatarCarga(b.minutos)})`,
                          )
                          .join(', ')}
                        ?
                      </>
                    ) : (
                      'Sem folga na semana pra sugerir um novo horário.'
                    )}
                  </p>
                  {/* h-9 no mobile — 44px é o alvo, h-7 (28px) só volta a
                      valer a partir de sm:, onde há mouse (resolução 10.28). */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground h-9 self-end sm:h-7 sm:shrink-0 sm:self-auto"
                    onClick={() =>
                      setDescartadas(
                        (atual) =>
                          new Set(atual).add(`${item.fluxogramaId}@${item.data}`),
                      )
                    }
                  >
                    Descartar
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <DialogDia
        data={diaDetalhado}
        dias={dias}
        eventosPorData={eventosPorData}
        eventosLivresPorId={eventosLivresPorId}
        onOpenChange={(aberto) => {
          if (!aberto) setDiaDetalhado(null)
        }}
      />
    </>
  )
}

interface DialogDiaProps {
  /** `null` = fechado. */
  data: string | null
  dias: readonly DiaCarga[]
  eventosPorData: ReadonlyMap<string, readonly EventoCalendario[]>
  eventosLivresPorId: ReadonlyMap<string, EventoLivre>
  onOpenChange: (aberto: boolean) => void
}

/**
 * Card de detalhe do dia, aberto ao clicar no número do dia na grade de mês.
 *
 * Reaproveita `Agenda` com um array de um dia só — a mesma leitura (rotina em
 * filete, prazo em bloco sólido, feito/cancelado) que a vista semanal já usa,
 * em vez de um segundo componente que divergiria dela na primeira mudança.
 *
 * O "+" (resolução 10.48.2, agora também alcançável daqui) é o mesmo
 * `DialogCriarNoDia` da agenda semanal — a grade de mês nunca teve como criar
 * porque `Agenda` era a única superfície com o botão embutido.
 */
function DialogDia({
  data,
  dias,
  eventosPorData,
  eventosLivresPorId,
  onOpenChange,
}: DialogDiaProps) {
  const dia = data ? dias.find((item) => item.data === data) : undefined

  return (
    <Dialog open={data !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="capitalize">
            {data ? format(deISO(data), "EEEE, d 'de' MMMM") : ''}
          </DialogTitle>
        </DialogHeader>
        {dia && (
          <Agenda
            dias={[dia]}
            eventosPorData={eventosPorData}
            eventosLivresPorId={eventosLivresPorId}
          />
        )}
      </DialogContent>
    </Dialog>
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
