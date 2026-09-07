import { differenceInCalendarDays } from 'date-fns'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EIXO, ESTILO_TOOLTIP } from '@/components/Grafico'
import { deISO, formatarMoeda, rotuloMes } from '@/lib/datas'
import { agregarHorizonteMensal, fimHorizonteMensal, projetarHorizonteDiario, type ParametrosHorizonte } from '../horizonte'

function projetarMeses(params: ParametrosHorizonte, meses = 6) {
  return agregarHorizonteMensal(projetarHorizonteDiario({ ...params, dias: differenceInCalendarDays(deISO(fimHorizonteMensal(params.hoje, meses)), deISO(params.hoje)) + 1 }))
}
export function ProjecaoCaixa({ params, pessimista, meses = 6 }: { params: ParametrosHorizonte; pessimista?: number; meses?: number }) {
  const pontos = projetarMeses(params, meses)
  const ruins = projetarMeses({ ...params, orcamentoMensalVariavel: pessimista ?? params.orcamentoMensalVariavel }, meses)
  const negativo = pontos.find(p => p.saldoAcumulado < 0)
  const negativoRuim = !negativo && ruins.find(p => p.saldoAcumulado < 0)
  const dados = pontos.map((p, i) => ({ mes: rotuloMes(p.mes), saldo: p.saldoAcumulado, pessimista: ruins[i]?.saldoAcumulado }))
  return <Card><CardHeader><CardTitle>Próximos {meses} meses</CardTitle><p className="text-muted-foreground text-xs">O mês atual inclui apenas o período de hoje em diante. O saldo acumulado parte da referência informada.</p></CardHeader><CardContent className="space-y-4">
    {negativo && <p className="text-status-risco text-sm">Saldo negativo em {rotuloMes(negativo.mes)}: {formatarMoeda(negativo.saldoAcumulado)}.</p>}
    {negativoRuim && <p className="text-status-atencao text-sm">Se o variável repetir o pior mês, o saldo fica negativo em {rotuloMes(negativoRuim.mes)}.</p>}
    <ResponsiveContainer width="100%" height={190}><LineChart data={dados}><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="mes" tick={EIXO.tick} stroke={EIXO.stroke} /><YAxis tick={EIXO.tick} stroke={EIXO.stroke} width={60} /><Tooltip contentStyle={ESTILO_TOOLTIP} formatter={v => formatarMoeda(Number(v))} /><Line name="Saldo previsto" dataKey="saldo" stroke="var(--financeiro)" strokeWidth={2} strokeDasharray="5 3" dot={false} />{pessimista !== undefined && <Line name="Pior mês variável" dataKey="pessimista" stroke="var(--status-atencao)" dot={false} strokeDasharray="2 4" />}</LineChart></ResponsiveContainer>
    <div className="space-y-2">{pontos.map(p => <div key={p.mes} className="grid grid-cols-2 gap-2 border-t pt-3 text-sm sm:grid-cols-4"><p>{rotuloMes(p.mes)}<span className="text-muted-foreground block text-xs">{p.fonte === 'misto' ? 'Registrado + previsto' : p.fonte === 'real' ? 'Registrado' : 'Projetado'}</span></p><p className="text-right tabular-nums"><span className="text-muted-foreground block text-xs">Entradas</span>{formatarMoeda(p.receitaPrevista)}</p><p className="text-right tabular-nums"><span className="text-muted-foreground block text-xs">Saídas</span>{formatarMoeda(p.comprometido + p.variavelEstimado)}</p><p className="text-right font-medium tabular-nums"><span className="text-muted-foreground block text-xs">Saldo acumulado</span>{formatarMoeda(p.saldoAcumulado)}</p></div>)}</div>
  </CardContent></Card>
}
