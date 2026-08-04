import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { paraISO } from '@/lib/datas'
import { useCriarLancamento } from '../hooks'
import { schemaLancamento, textoOuNulo, type FormularioLancamento } from '../schemas'
import type { Categoria } from '../types'

interface DialogLancamentoProps {
  categorias: readonly Categoria[]
  hoje: Date
}

/**
 * Formulário de novo lançamento — o mais usado no dia a dia, então abre com
 * data já preenchida e foco direto no valor (plano 8: reduzir fricção).
 */
export function DialogLancamento({ categorias, hoje }: DialogLancamentoProps) {
  const [aberto, setAberto] = useState(false)
  const criar = useCriarLancamento()

  const form = useForm<FormularioLancamento>({
    resolver: zodResolver(schemaLancamento),
    defaultValues: {
      valor: Number.NaN,
      categoria_id: '',
      data: paraISO(hoje),
      descricao: '',
      forma_pagamento: '',
      data_vencimento: '',
    },
  })

  const categoriaSelecionada = categorias.find(
    (c) => c.id === form.watch('categoria_id'),
  )
  // Vencimento só é oferecido para despesa fixa (resolução 10.2).
  const mostrarVencimento = categoriaSelecionada?.tipo === 'fixo'

  async function submeter(valores: FormularioLancamento) {
    await criar.mutateAsync({
      valor: valores.valor,
      categoria_id: valores.categoria_id,
      data: valores.data,
      descricao: textoOuNulo(valores.descricao),
      forma_pagamento: textoOuNulo(valores.forma_pagamento),
      data_vencimento: mostrarVencimento
        ? textoOuNulo(valores.data_vencimento)
        : null,
    })
    form.reset({
      valor: Number.NaN,
      categoria_id: '',
      data: paraISO(hoje),
      descricao: '',
      forma_pagamento: '',
      data_vencimento: '',
    })
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Novo lançamento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo lançamento</DialogTitle>
          <DialogDescription>
            Registre uma entrada ou saída do dia.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(submeter)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="valor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      autoFocus
                      placeholder="0,00"
                      value={Number.isNaN(field.value) ? '' : field.value}
                      onChange={(evento) =>
                        field.onChange(evento.target.valueAsNumber)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoria_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.id}>
                          {categoria.nome}
                          <span className="text-muted-foreground ml-1 text-xs">
                            ({categoria.tipo ?? categoria.natureza})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="data"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {mostrarVencimento && (
                <FormField
                  control={form.control}
                  name="data_vencimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vencimento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Opcional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="forma_pagamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de pagamento</FormLabel>
                  <FormControl>
                    <Input placeholder="Opcional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={criar.isPending}>
                {criar.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
