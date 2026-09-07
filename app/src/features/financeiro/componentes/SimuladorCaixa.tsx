import { useState } from 'react'
import { addMonths, differenceInCalendarDays, differenceInCalendarMonths } from 'date-fns'
import { CampoDecimal } from '@/components/CampoDecimal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useDebounced } from '@/hooks/useDebounced'
import { deISO, formatarMoeda, paraISO } from '@/lib/datas'
import { dadosEvento, schemaEventoFinanceiro, type FormularioEventoFinanceiro } from '../caixa-schemas'
import { expandirEventos, fimHorizonteMensal, projetarHorizonteDiario, type ParametrosHorizonte } from '../horizonte'
import type { Categoria } from '../types'
import { DialogEventoFinanceiro } from './DialogEventoFinanceiro'
import { ProjecaoCaixa } from './ProjecaoCaixa'

export function SimuladorCaixa({ params, categorias, mediaPorCategoria }: { params: ParametrosHorizonte; categorias: readonly Categoria[]; mediaPorCategoria: Record<string, number> }) {
  const [v, setV] = useState<FormularioEventoFinanceiro>({ descricao: 'Cenário', categoria_id: '', data_inicio: params.hoje, dia_mes: Number(params.hoje.slice(8,10)), termino_tipo: 'parcelas', data_fim: '', valor: Number.NaN, numero_parcelas: 3, juros_mensal: 0 })
  const [cortesBrutos, setCortes] = useState<Record<string, number>>({})
  const cortes = useDebounced(cortesBrutos, 150)
  const categoria = categorias.find(c => c.id === v.categoria_id)
  const validacao = schemaEventoFinanceiro.refine(evento => evento.data_inicio >= params.hoje).safeParse(v)
  const simulado = validacao.success && categoria ? { id: 'hipotetico', created_at: '', ...dadosEvento(validacao.data), categoria_natureza: categoria.natureza, categoria_nome: categoria.nome, categoria_cor: categoria.cor } : undefined
  const fim = !validacao.success ? params.hoje : v.termino_tipo === 'parcelas' ? paraISO(addMonths(deISO(v.data_inicio), Math.max(6, v.numero_parcelas))) : v.data_fim || params.hoje
  const meses = Math.min(601, Math.max(6, differenceInCalendarMonths(deISO(fim), deISO(params.hoje)) + 1))
  const dias = differenceInCalendarDays(deISO(fimHorizonteMensal(params.hoje, Number.isFinite(meses) ? meses : 6)), deISO(params.hoje)) + 1
  const corte = Object.entries(mediaPorCategoria).reduce((s, [id, media]) => s + media * (cortes[id] ?? 0) / 100, 0)
  const cenario = { ...params, dias, orcamentoMensalVariavel: Math.max(0, params.orcamentoMensalVariavel - corte), eventoHipotetico: simulado }
  const cenarios = [{ nome: 'Base', evento: undefined }, { nome: 'Cenário', evento: simulado }, ...(simulado?.termino_tipo === 'parcelas' ? [{ nome: 'À vista', evento: { ...simulado, numero_parcelas: 1, juros_mensal: 0 } }, { nome: '6x', evento: { ...simulado, numero_parcelas: 6 } }] : [])]
  const atualizar = <K extends keyof FormularioEventoFinanceiro>(key: K, valor: FormularioEventoFinanceiro[K]) => setV({ ...v, [key]: valor })
  return <Dialog><DialogTrigger asChild><Button variant="outline" size="sm">Simular evento</Button></DialogTrigger><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>E se…</DialogTitle><DialogDescription>Compare a compra, assinatura ou renda extra antes de registrar.</DialogDescription></DialogHeader>
    <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1"><Label htmlFor="sim-descricao">Descrição</Label><Input id="sim-descricao" value={v.descricao} onChange={e => atualizar('descricao', e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="sim-categoria">Categoria</Label><select id="sim-categoria" className="bg-background h-9 w-full rounded border px-2 text-sm" value={v.categoria_id} onChange={e => atualizar('categoria_id', e.target.value)}><option value="">Selecione</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome} · {c.natureza}</option>)}</select></div>
      <div className="space-y-1"><Label htmlFor="sim-tipo">Duração</Label><select id="sim-tipo" className="bg-background h-9 w-full rounded border px-2 text-sm" value={v.termino_tipo} onChange={e => atualizar('termino_tipo', e.target.value as FormularioEventoFinanceiro['termino_tipo'])}><option value="parcelas">Parcelas</option><option value="indefinido">Mensal sem término</option><option value="data">Mensal até uma data</option></select></div>
      <div className="space-y-1"><Label htmlFor="sim-valor">{v.termino_tipo === 'parcelas' ? 'Valor total' : 'Valor mensal'}</Label><CampoDecimal id="sim-valor" valor={v.valor} onValorChange={n => atualizar('valor', n)} /></div>
      <div className="space-y-1"><Label htmlFor="sim-inicio">{v.termino_tipo === 'parcelas' ? 'Primeira parcela' : 'Início'}</Label><Input id="sim-inicio" type="date" min={params.hoje} value={v.data_inicio} onChange={e => atualizar('data_inicio', e.target.value)} /></div>
      {v.termino_tipo === 'parcelas' ? <><div className="space-y-1"><Label htmlFor="sim-parcelas">Parcelas</Label><Input id="sim-parcelas" type="number" min={1} max={600} value={v.numero_parcelas} onChange={e => atualizar('numero_parcelas', e.target.valueAsNumber)} /></div><div className="space-y-1"><Label htmlFor="sim-juros">Juros mensais (%)</Label><CampoDecimal id="sim-juros" valor={v.juros_mensal} onValorChange={n => atualizar('juros_mensal', n)} /></div></> : <div className="space-y-1"><Label htmlFor="sim-dia">Dia de caixa</Label><Input id="sim-dia" type="number" min={1} max={31} value={v.dia_mes} onChange={e => atualizar('dia_mes', e.target.valueAsNumber)} /></div>}
      {v.termino_tipo === 'data' && <div className="space-y-1"><Label htmlFor="sim-fim">Término</Label><Input id="sim-fim" type="date" min={v.data_inicio} value={v.data_fim} onChange={e => atualizar('data_fim', e.target.value)} /></div>}
    </div>
    {Object.entries(mediaPorCategoria).filter(([, media]) => media > 0).map(([id]) => <div key={id}><label className="flex justify-between text-xs" htmlFor={`corte-${id}`}><span>Reduzir {categorias.find(c => c.id === id)?.nome}</span><span>{cortesBrutos[id] ?? 0}%</span></label><input id={`corte-${id}`} type="range" min={0} max={100} step={5} className="w-full" value={cortesBrutos[id] ?? 0} onChange={e => setCortes({ ...cortesBrutos, [id]: Number(e.target.value) })} /></div>)}
    {!simulado ? <p className="text-muted-foreground text-sm">Preencha os campos com valores válidos para comparar.</p> : <>
      <p className="text-sm">{(() => { const ocorrencias = expandirEventos([simulado], params.hoje, fimHorizonteMensal(params.hoje, meses)); return `${formatarMoeda(ocorrencias[0]?.valor ?? 0)} por ocorrência${simulado.termino_tipo === 'parcelas' ? ` · ${simulado.numero_parcelas} parcelas` : ''}.` })()}</p>
      <div className="grid gap-2 sm:grid-cols-2">{cenarios.map(c => { const resultado = projetarHorizonteDiario({ ...cenario, orcamentoMensalVariavel: c.nome === 'Base' ? params.orcamentoMensalVariavel : cenario.orcamentoMensalVariavel, eventoHipotetico: c.evento }); const menor = resultado.reduce((a,b) => b.saldoFinal < a.saldoFinal ? b : a, resultado[0]!); return <div className="rounded border p-3" key={c.nome}><p className="font-medium">{c.nome}</p><p className="text-xs">{menor.saldoFinal < 0 ? 'Não cabe nesta projeção' : params.saldoReferencia ? 'Saldo não fica negativo' : 'Saldo relativo; informe a referência'}</p><p className="mt-1 text-sm tabular-nums">Mínimo {formatarMoeda(menor.saldoFinal)} · {menor.data}</p>{c.evento && <p className="text-muted-foreground text-xs">Total na janela: {formatarMoeda(expandirEventos([c.evento], params.hoje, fimHorizonteMensal(params.hoje, meses)).reduce((s,o) => s + o.valor,0))}</p>}</div> })}</div>
      <ProjecaoCaixa params={cenario} meses={meses} />
      <DialogEventoFinanceiro categorias={categorias} inicial={v} trigger={<Button>Registrar este evento de verdade</Button>} />
    </>}
    </div>
  </DialogContent></Dialog>
}
