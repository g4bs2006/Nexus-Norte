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
  FormDescription,
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
import { useCriarInvestimento } from '../hooks'
import {
  schemaInvestimento,
  textoOuNulo,
  type FormularioInvestimento,
} from '../schemas'

interface DialogInvestimentoProps {
  hoje: Date
}

/** Aporte ou rendimento — uma linha por evento (resolução 10.4). */
export function DialogInvestimento({ hoje }: DialogInvestimentoProps) {
  const [aberto, setAberto] = useState(false)
  const criar = useCriarInvestimento()

  const vazio: FormularioInvestimento = {
    tipo: 'aporte',
    valor: Number.NaN,
    data: paraISO(hoje),
    descricao: '',
  }

  const form = useForm<FormularioInvestimento>({
    resolver: zodResolver(schemaInvestimento),
    defaultValues: vazio,
  })

  const tipo = form.watch('tipo')

  async function submeter(valores: FormularioInvestimento) {
    await criar.mutateAsync({
      tipo: valores.tipo,
      valor: valores.valor,
      data: valores.data,
      descricao: textoOuNulo(valores.descricao),
    })
    form.reset(vazio)
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus className="size-4" />
          Registrar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Investimento</DialogTitle>
          <DialogDescription>
            Registre um aporte ou o rendimento do período.
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
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="aporte">Aporte</SelectItem>
                      <SelectItem value="rendimento">Rendimento</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      inputMode="decimal"
                      autoFocus
                      placeholder="0,00"
                      value={Number.isNaN(field.value) ? '' : field.value}
                      onChange={(evento) =>
                        field.onChange(evento.target.valueAsNumber)
                      }
                    />
                  </FormControl>
                  {tipo === 'rendimento' && (
                    <FormDescription className="text-[11px]">
                      Pode ser negativo se o período fechou no prejuízo.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

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
