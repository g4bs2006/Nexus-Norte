import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus } from 'lucide-react'
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
import {
  useCriarInvestimento,
  useAtualizarInvestimento,
  useExcluirInvestimento,
} from '../hooks'
import {
  schemaInvestimento,
  textoOuNulo,
  type FormularioInvestimento,
} from '../schemas'
import type { Investimento } from '../types'

interface DialogInvestimentoProps {
  hoje: Date
  /** Se passado, o dialog abre em modo de edição. */
  investimento?: Investimento
}

/** Aporte ou rendimento — uma linha por evento (resolução 10.4). */
export function DialogInvestimento({
  hoje,
  investimento,
}: DialogInvestimentoProps) {
  const modoEdicao = Boolean(investimento)
  const [aberto, setAberto] = useState(false)
  const criar = useCriarInvestimento()
  const atualizar = useAtualizarInvestimento()
  const excluir = useExcluirInvestimento()

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

  useEffect(() => {
    if (aberto && investimento) {
      form.reset({
        tipo: investimento.tipo,
        valor: investimento.valor,
        data: investimento.data,
        descricao: investimento.descricao ?? '',
      })
    } else if (aberto && !investimento) {
      form.reset(vazio)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, investimento])

  const tipo = form.watch('tipo')
  const pendente = criar.isPending || atualizar.isPending

  async function submeter(valores: FormularioInvestimento) {
    const dados = {
      tipo: valores.tipo,
      valor: valores.valor,
      data: valores.data,
      descricao: textoOuNulo(valores.descricao),
    }

    if (modoEdicao && investimento) {
      await atualizar.mutateAsync({ id: investimento.id, dados })
    } else {
      await criar.mutateAsync(dados)
    }
    form.reset(vazio)
    setAberto(false)
  }

  async function handleExcluir() {
    if (!investimento) return
    await excluir.mutateAsync(investimento.id)
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {modoEdicao ? (
          <Button
            size="sm"
            variant="ghost"
            className="size-7"
            aria-label="Editar investimento"
          >
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm" variant="secondary">
            <Plus className="size-4" />
            Registrar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modoEdicao ? 'Editar investimento' : 'Investimento'}
          </DialogTitle>
          <DialogDescription>
            {modoEdicao
              ? 'Atualize os dados do registro.'
              : 'Registre um aporte ou o rendimento do período.'}
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
              {modoEdicao && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void handleExcluir()}
                  disabled={excluir.isPending}
                  className="sm:mr-auto"
                >
                  {excluir.isPending ? 'Excluindo…' : 'Excluir'}
                </Button>
              )}
              <Button type="submit" disabled={pendente}>
                {pendente ? 'Salvando…' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
