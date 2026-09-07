import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CampoDecimal } from '@/components/CampoDecimal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { paraISO } from '@/lib/datas'
import { useSalvarEventoFinanceiro } from '../caixa-hooks'
import { dadosEvento, schemaEventoFinanceiro, type FormularioEventoFinanceiro } from '../caixa-schemas'
import type { EventoFinanceiroDetalhado } from '../caixa-types'
import type { Categoria } from '../types'

export function DialogEventoFinanceiro({ categorias, evento, inicial, trigger }: { categorias: readonly Categoria[]; evento?: EventoFinanceiroDetalhado; inicial?: Partial<FormularioEventoFinanceiro>; trigger?: React.ReactNode }) {
  const [aberto, setAberto] = useState(false)
  const salvar = useSalvarEventoFinanceiro()
  const padrao: FormularioEventoFinanceiro = evento ? { descricao: evento.descricao, categoria_id: evento.categoria_id, data_inicio: evento.data_inicio, dia_mes: evento.dia_mes, termino_tipo: evento.termino_tipo, data_fim: evento.data_fim ?? '', valor: evento.valor ?? evento.valor_total ?? 0, numero_parcelas: evento.numero_parcelas ?? 1, juros_mensal: evento.juros_mensal ?? 0 } : { descricao: '', categoria_id: '', data_inicio: paraISO(new Date()), dia_mes: new Date().getDate(), termino_tipo: 'indefinido', data_fim: '', valor: Number.NaN, numero_parcelas: 1, juros_mensal: 0, ...inicial }
  const form = useForm<FormularioEventoFinanceiro>({ resolver: zodResolver(schemaEventoFinanceiro), defaultValues: padrao })
  const tipo = useWatch({ control: form.control, name: 'termino_tipo' })
  const input = (name: 'descricao' | 'data_inicio' | 'data_fim', label: string, type = 'text') => <FormField control={form.control} name={name} render={({ field }) => <FormItem><FormLabel>{label}</FormLabel><FormControl><Input type={type} {...field} /></FormControl><FormMessage /></FormItem>} />
  const numero = (name: 'valor' | 'dia_mes' | 'numero_parcelas' | 'juros_mensal', label: string, decimal = false) => <FormField control={form.control} name={name} render={({ field }) => <FormItem><FormLabel>{label}</FormLabel><FormControl>{decimal ? <CampoDecimal valor={field.value} onValorChange={field.onChange} /> : <Input type="number" min={1} value={field.value} onChange={e => field.onChange(e.target.valueAsNumber)} />}</FormControl><FormMessage /></FormItem>} />
  return <Dialog open={aberto} onOpenChange={v => { if (v) form.reset(padrao); setAberto(v) }}>
    <DialogTrigger asChild>{trigger ?? <Button size="sm" variant={evento ? 'outline' : 'default'}>{evento ? 'Editar' : 'Novo evento'}</Button>}</DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>{evento ? 'Editar evento previsto' : 'Novo evento previsto'}</DialogTitle><DialogDescription>Receitas e despesas previstas nas datas em que entram ou saem da conta.</DialogDescription></DialogHeader>
      <Form {...form}><form className="space-y-4" onSubmit={form.handleSubmit(async v => { try { await salvar.mutateAsync({ ...dadosEvento(v), ...(evento ? { id: evento.id } : {}) }); setAberto(false) } catch { /* toast da mutation */ } })}>
        {input('descricao', 'Descrição')}
        <FormField control={form.control} name="categoria_id" render={({ field }) => <FormItem><FormLabel>Categoria</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent>{categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} · {c.natureza}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
        <FormField control={form.control} name="termino_tipo" render={({ field }) => <FormItem><FormLabel>Duração</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="indefinido">Mensal, sem término</SelectItem><SelectItem value="data">Mensal, até uma data</SelectItem><SelectItem value="parcelas">Número de parcelas</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
        {numero('valor', tipo === 'parcelas' ? 'Valor total' : 'Valor por mês', true)}
        {input('data_inicio', tipo === 'parcelas' ? 'Primeira parcela (data de caixa)' : 'Início', 'date')}
        {tipo !== 'parcelas' && numero('dia_mes', 'Dia do mês')}
        {tipo === 'data' && input('data_fim', 'Última data', 'date')}
        {tipo === 'parcelas' && <div className="grid grid-cols-2 gap-3">{numero('numero_parcelas', 'Parcelas')}{numero('juros_mensal', 'Juros mensais (%)', true)}</div>}
        <p className="text-muted-foreground text-xs">Registrar um lançamento vinculado substitui esta previsão. Pagamentos parciais mantêm o restante pendente.</p>
        <DialogFooter><Button disabled={salvar.isPending} type="submit">{salvar.isPending ? 'Salvando…' : 'Salvar evento'}</Button></DialogFooter>
      </form></Form>
    </DialogContent>
  </Dialog>
}
