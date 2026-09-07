import { useState } from 'react'
import { ChevronDown, Settings2 } from 'lucide-react'
import { CampoDecimal } from '@/components/CampoDecimal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatarMoeda } from '@/lib/datas'
import { useDadosHorizonte } from '../horizonte-hooks'
import { useSalvarSaldoReferencia } from '../caixa-hooks'
import { menorSaldoAteProximaReceita, projetarHorizonteDiario, type DiaHorizonte, type StatusHorizonte } from '../horizonte'

const COR: Record<StatusHorizonte, string> = { critico: 'var(--status-risco)', atencao: 'var(--status-atencao)', ok: 'var(--status-ok)', otimo: 'var(--status-otimo)' }
const ROTULO: Record<StatusHorizonte, string> = { critico: 'Negativo', atencao: 'Atenção', ok: 'Dentro do mínimo', otimo: 'Confortável' }
const dataCurta = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`

function DialogSaldo({ hoje }: { hoje: string }) {
  const [aberto, setAberto] = useState(false)
  const [data, setData] = useState(hoje)
  const [valor, setValor] = useState(Number.NaN)
  const [observacao, setObservacao] = useState('')
  const salvar = useSalvarSaldoReferencia()
  return <Dialog open={aberto} onOpenChange={setAberto}><DialogTrigger asChild><Button size="sm" variant="outline">Informar saldo</Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>Saldo no início do dia</DialogTitle><DialogDescription>Informe o saldo antes das movimentações dessa data. Lançamentos anteriores já estarão incluídos. Previsões vencidas antes desta referência ficam fora da projeção; registre-as novamente se ainda estiverem pendentes.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={async e => { e.preventDefault(); if (!Number.isFinite(valor) || !data || data > hoje) return; try { await salvar.mutateAsync({ data, valor, observacao: observacao.trim() || null }); setAberto(false) } catch { /* toast */ } }}>
        <div className="space-y-2"><Label htmlFor="saldo-data">Data</Label><Input id="saldo-data" type="date" value={data} max={hoje} required onChange={e => setData(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="saldo-valor">Saldo de abertura</Label><CampoDecimal id="saldo-valor" valor={valor} onValorChange={setValor} /></div>
        <div className="space-y-2"><Label htmlFor="saldo-observacao">Observação</Label><Input id="saldo-observacao" value={observacao} onChange={e => setObservacao(e.target.value)} /></div>
        <DialogFooter><Button disabled={salvar.isPending || !Number.isFinite(valor)}>Salvar saldo</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

function DetalheDia({ dia }: { dia: DiaHorizonte }) {
  return <div className="space-y-3 border-t pt-4"><div className="flex justify-between"><h3 className="font-medium">{dataCurta(dia.data)}</h3><span className="text-muted-foreground text-xs">{dia.fonte === 'real' ? 'Movimentos registrados' : dia.fonte === 'misto' ? 'Registrado e previsto' : 'Projetado'}</span></div>
    <p className="text-muted-foreground text-sm">Saldo inicial {formatarMoeda(dia.saldoInicial)}</p>
    {dia.movimentos.length === 0 && <p className="text-muted-foreground text-sm">Sem movimentos neste dia.</p>}
    <ul className="divide-y">{dia.movimentos.map(m => <li key={m.id} className="py-2 text-sm"><div className="flex justify-between gap-3"><span>{m.descricao}{m.vencido && <span className="text-status-atencao"> · vencido em {dataCurta(m.dataOriginal!)}</span>}</span><span className="shrink-0 tabular-nums">{m.natureza === 'receita' ? '+' : '−'}{formatarMoeda(m.valor)}</span></div><p className="text-muted-foreground text-xs">{m.origem === 'real' ? 'Registrado' : m.origem === 'previsto' ? 'Previsto' : m.origem === 'simulacao' ? 'Simulação' : 'Estimativa variável'}</p>{m.itens && <details className="mt-1"><summary className="cursor-pointer text-xs">{m.itens.length} compras na fatura</summary><ul className="space-y-1 pl-3 pt-2">{m.itens.map(l => <li key={l.id} className="flex justify-between gap-2 text-xs"><span>{l.descricao ?? 'Compra'} · {dataCurta(l.data)}</span><span>{formatarMoeda(l.valor)}</span></li>)}</ul></details>}</li>)}</ul>
    <p className="flex justify-between border-t pt-2 font-medium"><span>Saldo final</span><span className="tabular-nums">{formatarMoeda(dia.saldoFinal)}</span></p>
  </div>
}

export function HorizonteFinanceiro() {
  const dados = useDadosHorizonte()
  const { params, config } = dados
  const [expandido, setExpandido] = useState(false)
  const [selecionada, setSelecionada] = useState(params.hoje)
  const [retirada, setRetirada] = useState(0)
  const [dataRetirada, setDataRetirada] = useState(params.hoje)
  const [simulando, setSimulando] = useState(false)
  const dias = projetarHorizonteDiario({ ...params, retiradaHipotetica: simulando && retirada > 0 && Number.isFinite(retirada) ? { data: dataRetirada, valor: retirada } : undefined })
  const proximaReceita = dias.find(d => d.data > params.hoje && d.entradas > 0)?.data ?? null
  const menor = menorSaldoAteProximaReceita(dias, proximaReceita)
  const dia = dias.find(d => d.data === selecionada) ?? dias[0]
  const semReferencia = !params.saldoReferencia
  const confortoConfigurado = config.confortavel > config.minimo && config.minimo >= 0
  if (dados.carregando) return <Card><CardContent>Carregando Horizonte…</CardContent></Card>
  if (dados.erro) return <Card><CardContent role="alert" className="text-status-risco">Não foi possível carregar o Horizonte: {dados.erro.message}</CardContent></Card>
  return <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Horizonte de Saldos{simulando && ' · simulação'}</CardTitle><div className="flex gap-2"><DialogSaldo hoje={params.hoje} />
    <Dialog><DialogTrigger asChild><Button size="icon" variant="ghost" aria-label="Configurar Horizonte"><Settings2 className="size-4" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Configurar Horizonte</DialogTitle><DialogDescription>Valores salvos neste navegador. A média histórica é uma referência; você pode informar um orçamento próprio.</DialogDescription></DialogHeader>
      <div className="space-y-4"><Label htmlFor="orcamento">Orçamento variável mensal</Label><CampoDecimal id="orcamento" valor={params.orcamentoMensalVariavel} onValorChange={v => { if (Number.isFinite(v) && v >= 0) config.alterar({ orcamentoManual: v }) }} /><Button variant="outline" onClick={() => config.alterar({ orcamentoManual: null })}>Usar média: {formatarMoeda(dados.media)}</Button>
        <Label htmlFor="minimo">Colchão mínimo</Label><CampoDecimal id="minimo" valor={config.minimo} onValorChange={v => { if (Number.isFinite(v) && v >= 0) config.alterar({ minimo: v }) }} />
        <Label htmlFor="confortavel">Colchão confortável</Label><CampoDecimal id="confortavel" valor={config.confortavel} onValorChange={v => { if (Number.isFinite(v) && v >= 0) config.alterar({ confortavel: v }) }} />
        {!confortoConfigurado && <p className="text-status-atencao text-xs">Defina o colchão confortável acima do mínimo para ativar os quatro níveis.</p>}
      </div></DialogContent></Dialog>
    </div></div></CardHeader><CardContent className="space-y-4">
      {semReferencia && <p role="status" className="text-status-atencao text-sm">Informe seu saldo inicial para ancorar a projeção. Os valores abaixo são relativos a zero.</p>}
      <div className="grid gap-4 sm:grid-cols-2"><div><p className="text-muted-foreground text-xs">{simulando ? 'Saldo de hoje simulado' : 'Saldo ao fim de hoje'}{semReferencia && ' · relativo'}</p><p className="mt-1 text-3xl font-medium tabular-nums">{formatarMoeda(dias[0]?.saldoFinal ?? 0)}</p></div><div><p className="text-muted-foreground text-xs">Menor saldo antes da próxima receita</p><p className="mt-1 text-xl font-medium tabular-nums">{menor ? formatarMoeda(menor.saldoFinal) : '—'}</p><p className="text-muted-foreground text-xs">{menor ? `${dataCurta(menor.data)} · receita em ${dataCurta(proximaReceita!)}` : 'Sem próxima receita dentro da janela.'}</p></div></div>
      {dados.mesesHistorico < 3 && <p className="text-muted-foreground text-xs">Histórico: {dados.mesesHistorico}/3 meses. {config.orcamentoManual === null && dados.media === 0 ? 'Sem estimativa variável: informe um orçamento nas configurações.' : 'A estimativa ainda tem pouca base histórica.'}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2"><Button variant="ghost" size="sm" onClick={() => setExpandido(!expandido)} aria-expanded={expandido}>Ver dias <ChevronDown className="size-4" /></Button><label className="flex items-center gap-2 text-xs">Janela<select className="bg-background rounded border p-2" value={config.dias} onChange={e => config.alterar({ dias: Number(e.target.value) })}>{[30,60,90,180].map(n => <option key={n} value={n}>{n} dias</option>)}</select></label>
        <Dialog><DialogTrigger asChild><Button size="sm" variant="outline">Simular retirada</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Simular retirada</DialogTitle><DialogDescription>Explore o efeito sobre os dias seguintes. Esta simulação não registra uma saída.</DialogDescription></DialogHeader><div className="space-y-3"><Label htmlFor="retirada">Valor</Label><CampoDecimal id="retirada" valor={retirada} onValorChange={setRetirada} /><Label htmlFor="retirada-data">Data</Label><Input id="retirada-data" type="date" min={params.hoje} max={dias.at(-1)?.data} value={dataRetirada} onChange={e => setDataRetirada(e.target.value)} /><Button disabled={!Number.isFinite(retirada) || retirada <= 0 || dataRetirada < params.hoje || dataRetirada > (dias.at(-1)?.data ?? '')} onClick={() => setSimulando(true)}>Aplicar simulação</Button></div></DialogContent></Dialog>
        {simulando && <Button variant="ghost" onClick={() => setSimulando(false)}>Encerrar simulação</Button>}
      </div>
      <div className="flex gap-0.5" aria-label="Prévia do saldo diário">{dias.slice(0,30).map(d => <button key={d.data} className="min-w-0 flex-1 rounded-sm py-5 focus-visible:outline-2 focus-visible:outline-offset-2" style={{ background: semReferencia || !confortoConfigurado ? (d.saldoFinal < 0 ? COR.critico : 'var(--muted)') : COR[d.status] }} title={`${dataCurta(d.data)}: ${formatarMoeda(d.saldoFinal)}`} aria-label={`${dataCurta(d.data)} saldo ${formatarMoeda(d.saldoFinal)}`} onClick={() => { setSelecionada(d.data); setExpandido(true) }} />)}</div>
      {expandido && <><div className="max-h-72 overflow-auto rounded border"><table className="w-full text-left text-xs"><thead className="bg-muted sticky top-0"><tr><th className="p-2">Dia</th><th className="p-2 text-right">Entradas</th><th className="p-2 text-right">Saídas</th><th className="p-2 text-right">Saldo</th></tr></thead><tbody>{dias.map(d => <tr key={d.data} className={d.data === selecionada ? 'bg-muted/60' : ''}><td className="p-1"><button className="min-h-11 px-2 underline-offset-4 hover:underline" onClick={() => setSelecionada(d.data)}>{dataCurta(d.data)}<span className="sr-only"> ver movimentos</span></button></td><td className="p-2 text-right tabular-nums">{formatarMoeda(d.entradas)}</td><td className="p-2 text-right tabular-nums">{formatarMoeda(d.saidas)}</td><td className="p-2 text-right tabular-nums" style={{ color: d.saldoFinal < 0 ? COR.critico : undefined }}>{formatarMoeda(d.saldoFinal)}{confortoConfigurado && !semReferencia && <span className="block text-[10px]">{ROTULO[d.status]}</span>}</td></tr>)}</tbody></table></div>{dia && <DetalheDia dia={dia} />}</>}
    </CardContent></Card>
}
