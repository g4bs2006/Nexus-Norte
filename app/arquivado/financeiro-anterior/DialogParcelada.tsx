import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { CampoDecimal } from '@/components/CampoDecimal'
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
import { useCriarParcelada } from '../hooks'
import { schemaParcelada, type FormularioParcelada } from '../schemas'
import type { Categoria } from '../types'

interface DialogParceladaProps {
  categorias: readonly Categoria[]
  /** Pré-preenche a partir de uma simulação confirmada (resolução 10.44). */
  valoresIniciais?: Partial<FormularioParcelada>
  trigger?: React.ReactNode
}

const VAZIO: FormularioParcelada = {
  descricao: '',
  categoria_id: '',
  valor_total: Number.NaN,
  numero_parcelas: Number.NaN,
  data_primeira_parcela: '',
  juros_mensal: 0,
}

/** Registro de compra parcelada (resolução 10.44). */
export function DialogParcelada({
  categorias,
  valoresIniciais,
  trigger,
}: DialogParceladaProps) {
  const [aberto, setAberto] = useState(false)
  const criar = useCriarParcelada()

  const form = useForm<FormularioParcelada>({
    resolver: zodResolver(schemaParcelada),
    defaultValues: { ...VAZIO, ...valoresIniciais },
  })

  async function submeter(valores: FormularioParcelada) {
    await criar.mutateAsync(valores)
    form.reset(VAZIO)
    setAberto(false)
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(novoEstado) => {
        setAberto(novoEstado)
        if (novoEstado) form.reset({ ...VAZIO, ...valoresIniciais })
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="secondary">
            <Plus className="size-4" />
            Compra parcelada
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compra parcelada</DialogTitle>
          <DialogDescription>
            Cada parcela entra na projeção no mês em que cai.
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
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
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
                      {categorias
                        .filter((c) => c.natureza === 'despesa')
                        .map((categoria) => (
                          <SelectItem key={categoria.id} value={categoria.id}>
                            {categoria.nome}
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
                name="valor_total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor total</FormLabel>
                    <FormControl>
                      <CampoDecimal
                        placeholder="0,00"
                        valor={field.value}
                        onValorChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numero_parcelas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parcelas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={Number.isNaN(field.value) ? '' : field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="data_primeira_parcela"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primeira parcela</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="juros_mensal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Juros mensal (%)</FormLabel>
                  <FormControl>
                    <CampoDecimal
                      placeholder="0"
                      valor={field.value}
                      onValorChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px]">
                    0 = sem juros (padrão do cartão).
                  </FormDescription>
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
