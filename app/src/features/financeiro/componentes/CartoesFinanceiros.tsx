import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { schemaCartao } from '../caixa-schemas'
import { useCartoes, useExcluirCartao, useSalvarCartao } from '../caixa-hooks'
import type { Cartao } from '../caixa-types'

function DialogCartao({ cartao }: { cartao?: Cartao }) {
  const [aberto, setAberto] = useState(false)
  const salvar = useSalvarCartao()
  const form = useForm<z.infer<typeof schemaCartao>>({ resolver: zodResolver(schemaCartao), defaultValues: cartao ?? { nome: '', dia_fechamento: 20, dia_vencimento: 28 } })
  return <Dialog open={aberto} onOpenChange={v => { if (v) form.reset(cartao ?? { nome: '', dia_fechamento: 20, dia_vencimento: 28 }); setAberto(v) }}>
    <DialogTrigger asChild><Button size="sm" variant="outline">{cartao ? 'Editar cartão' : 'Novo cartão'}</Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>{cartao ? 'Editar cartão' : 'Novo cartão'}</DialogTitle><DialogDescription>A fatura reúne suas compras automaticamente no vencimento. Compras no dia do fechamento entram na fatura que fecha nesse dia.</DialogDescription></DialogHeader>
      <Form {...form}><form className="space-y-4" onSubmit={form.handleSubmit(async dados => { try { await salvar.mutateAsync({ ...dados, ...(cartao ? { id: cartao.id } : {}) }); setAberto(false) } catch { /* toast */ } })}>
        <FormField control={form.control} name="nome" render={({ field }) => <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
        {(['dia_fechamento', 'dia_vencimento'] as const).map(name => <FormField key={name} control={form.control} name={name} render={({ field }) => <FormItem><FormLabel>{name === 'dia_fechamento' ? 'Dia do fechamento' : 'Dia do vencimento'}</FormLabel><FormControl><Input type="number" min={1} max={31} value={field.value} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>} />)}
        <p className="text-muted-foreground text-xs">Alterar o cartão preserva as datas de caixa dos lançamentos já registrados.</p>
        <DialogFooter><Button disabled={salvar.isPending}>Salvar cartão</Button></DialogFooter>
      </form></Form>
    </DialogContent>
  </Dialog>
}
export function CartoesFinanceiros() {
  const cartoes = useCartoes()
  const excluir = useExcluirCartao()
  return <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Cartões</CardTitle><DialogCartao /></CardHeader><CardContent>
    {cartoes.isError && <p role="alert">{cartoes.error.message}</p>}
    {cartoes.isPending ? <p>Carregando cartões…</p> : cartoes.data?.length === 0 ? <p className="text-muted-foreground text-sm">Cadastre o fechamento e vencimento antes de lançar uma compra no crédito.</p> : cartoes.data?.map(c => <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-3 last:border-0"><div><p>{c.nome}</p><p className="text-muted-foreground text-xs">Fecha dia {c.dia_fechamento} · vence dia {c.dia_vencimento}</p></div><div className="flex items-center gap-1"><DialogCartao cartao={c} /><DialogConfirmarExclusao titulo="Excluir cartão" mensagem="Cartões com lançamentos vinculados não podem ser excluídos." onConfirmar={() => excluir.mutateAsync(c.id)} pendente={excluir.isPending} /></div></div>)}
  </CardContent></Card>
}
