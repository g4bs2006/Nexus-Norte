import { useMemo, useState } from 'react'
import { format, subDays } from 'date-fns'
import { History } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { deISO, paraISO } from '@/lib/datas'
import { cargaPorDia } from '@/features/calendario/carga'
import {
  ROTULO_CAMADA,
  construirEventos,
  corDoEvento,
  type CamadaCalendario,
} from '@/features/calendario/eventos'
import { useFontesCalendario } from '@/features/calendario/hooks'
import {
  construirTimeline,
  correlacaoSonoAderencia,
} from '@/features/calendario/planejador'
import { horasEntre } from '@/features/sono/calculos'

const TODAS = 'todas'
const CAMADAS_FILTRO = Object.keys(ROTULO_CAMADA) as CamadaCalendario[]
/**
 * Três meses, não um ano: o heatmap de consistência (10.48.8) saiu daqui —
 * com poucos dias de app instalado, uma grade de 365 quadrados é praticamente
 * só vermelho antes de ontem, que é ruído, não informação. Sono×aderência e
 * a timeline não precisam de janela tão larga; noventa dias já dá espaço de
 * sobra pros grupos de sono comparados (mínimo de 3 dias cada).
 */
const DIAS_JANELA = 90

/**
 * Histórico (resoluções 10.48.9/10): o calendário como memória, não só
 * planejador. Uma página própria porque a pergunta aqui é retrospectiva —
 * "o que aconteceu" — diferente de tudo que `CalendarioPage` responde.
 *
 * Busca independente: nenhuma das outras telas do Calendário carrega uma
 * janela tão larga, e forçar isso na página principal deixaria a agenda do
 * dia a dia mais pesada por uma pergunta que só se faz de vez em quando.
 */
export default function HistoricoPage() {
  const hoje = useMemo(() => new Date(), [])
  const hojeISO = paraISO(hoje)
  const [camada, setCamada] = useState<CamadaCalendario | typeof TODAS>(TODAS)

  const intervalo = useMemo(
    () => ({ de: paraISO(subDays(hoje, DIAS_JANELA)), ate: hojeISO }),
    [hoje, hojeISO],
  )

  const { fontes, carga } = useFontesCalendario(intervalo.de, intervalo.ate, {
    comCarga: true,
  })

  const eventos = useMemo(
    () => construirEventos(fontes, intervalo),
    [fontes, intervalo],
  )

  const eventosFiltrados = useMemo(
    () =>
      camada === TODAS ? eventos : eventos.filter((e) => e.camada === camada),
    [eventos, camada],
  )

  const dias = useMemo(
    () =>
      cargaPorDia(
        eventosFiltrados,
        intervalo,
        hoje,
        fontes.planejamentoSono,
        carga.sonoRealizado,
        carga.conclusoes,
      ),
    [eventosFiltrados, intervalo, hoje, fontes.planejamentoSono, carga],
  )

  const horasDormidasPorDia = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const registro of carga.sonoRealizado) {
      if (registro.horas_calculadas !== null) {
        mapa.set(registro.data, registro.horas_calculadas)
      }
    }
    return mapa
  }, [carga.sonoRealizado])

  const metaHorasPorDiaSemana = useMemo(() => {
    const mapa = new Map<number, number>()
    for (const plano of fontes.planejamentoSono) {
      mapa.set(
        plano.dia_semana,
        horasEntre(plano.hora_dormir_alvo, plano.hora_acordar_alvo),
      )
    }
    return mapa
  }, [fontes.planejamentoSono])

  const correlacao = useMemo(
    () => correlacaoSonoAderencia(dias, horasDormidasPorDia, metaHorasPorDiaSemana),
    [dias, horasDormidasPorDia, metaHorasPorDiaSemana],
  )

  const timeline = useMemo(() => {
    const itens = eventos
      .filter((e) => e.estado === 'feito')
      .map((e) => ({
        data: e.inicio.slice(0, 10),
        texto: e.tipo === 'estudo' ? e.titulo : `Treino: ${e.titulo}`,
        cor: corDoEvento(e),
      }))
    return construirTimeline(itens).slice(0, 30)
  }, [eventos])

  return (
    <>
      <PageHeader
        titulo="Histórico"
        descricao="O calendário como memória — o que aconteceu, não o que vem."
        pilar="sono"
        icone={History}
        acoes={
          <Select value={camada} onValueChange={(v) => setCamada(v as typeof camada)}>
            <SelectTrigger size="sm" className="w-[10rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas as camadas</SelectItem>
              {CAMADAS_FILTRO.map((c) => (
                <SelectItem key={c} value={c}>
                  {ROTULO_CAMADA[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="surgir-grupo space-y-4">
        {(correlacao.percentualFalhaComSonoBaixo !== undefined ||
          correlacao.percentualFalhaComSonoOk !== undefined) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sono × aderência</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              <p>
                Nos dias em que o sono ficou abaixo da meta,{' '}
                <strong className="text-foreground">
                  {correlacao.percentualFalhaComSonoBaixo ?? '—'}%
                </strong>{' '}
                tiveram algum check pendente. Nos dias com sono na meta ou
                acima, foram{' '}
                <strong className="text-foreground">
                  {correlacao.percentualFalhaComSonoOk ?? '—'}%
                </strong>
                .
              </p>
              <p className="mt-2 text-xs">
                Observação, não causa: são poucos meses de dado — não é base
                para concluir que dormir mal causa o resto do dia desandar.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linha do tempo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {timeline.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nada registrado ainda neste período.
              </p>
            ) : (
              timeline.map((dia) => (
                <div key={dia.data}>
                  <p className="text-muted-foreground text-xs font-medium">
                    {format(deISO(dia.data), 'dd/MM/yyyy')}
                  </p>
                  <ul className="text-sm">
                    {dia.itens.map((item, indice) => (
                      <li key={indice} className="flex items-center gap-1.5">
                        {item.cor && (
                          <span
                            aria-hidden
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.cor }}
                          />
                        )}
                        <span className="min-w-0 truncate">{item.texto}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
