import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus } from 'lucide-react'
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
import { useAtualizarCompromisso, useCriarCompromisso } from '../hooks'
import { schemaCompromisso, type FormularioCompromisso } from '../schemas'
import type { Categoria } from '../types'
import type { CompromissoDetalhado } from '../projecao'

interface DialogCompromissoProps {
  categorias: readonly Categoria[]
  /** Se passado, o dialog abre em modo de edição. */
  compromisso?: CompromissoDetalhado
  /** Pré-preenche a partir de uma simulação confirmada (resolução 10.47.4). */
  valoresIniciais?: Partial<FormularioCompromisso>
  trigger?: React.ReactNode
}

const VAZIO: FormularioCompromisso = {
  descricao: '',
  categoria_id: '',
  valor: Number.NaN,
  dia_mes: Number.NaN,
  data_inicio: '',
  data_fim: '',
}

/**
 * Formulário de compromisso recorrente (resolução 10.43).
 *
 * A natureza (receita/despesa) não é um campo aqui — vem da categoria
 * escolhida (resolução 10.12), então o Select lista as duas juntas com o
 * grupo indicado no rótulo, em vez de duplicar a distinção.
 */
export function DialogCompromisso({
  categorias,
  compromisso,
  valoresIniciais,
  trigger,
}: DialogCompromissoProps) {
  const modoEdicao = Boolean(compromisso)
  const [aberto, setAberto] = useState(false)
  const criar = useCriarCompromisso()
  const atualizar = useAtualizarCompromisso()

  const form = useForm<FormularioCompromisso>({
    resolver: zodResolver(schemaCompromisso),
    defaultValues: { ...VAZIO, ...valoresIniciais },
  })

  useEffect(() => {
    if (aberto && compromisso) {
      form.reset({
        descricao: compromisso.descricao,
        categoria_id: compromisso.categoria_id,
        valor: compromisso.valor,
        dia_mes: compromisso.dia_mes,
        data_inicio: compromisso.data_inicio,
        data_fim: compromisso.data_fim ?? '',
      })
    } else if (aberto && !compromisso) {
      form.reset({ ...VAZIO, ...valoresIniciais })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, compromisso])

  const pendente = criar.isPending || atualizar.isPending

  async function submeter(valores: FormularioCompromisso) {
    const dados = {
      descricao: valores.descricao,
      categoria_id: valores.categoria_id,
      valor: valores.valor,
      dia_mes: valores.dia_mes,
      data_inicio: valores.data_inicio,
      data_fim: valores.data_fim === '' ? null : valores.data_fim,
    }

    if (modoEdicao && compromisso) {
      await atualizar.mutateAsync({ id: compromisso.id, dados })
    } else {
      await criar.mutateAsync(dados)
    }
    form.reset({ ...VAZIO, ...valoresIniciais })
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ??
          (modoEdicao ? (
            <Button
              size="sm"
              variant="ghost"
              className="size-11 sm:size-7"
              aria-label="Editar compromisso"
            >
              <Pencil className="size-3.5" />
            </Button>
          ) : (
            <Button size="sm" variant="secondary">
              <Plus className="size-4" />
              Compromisso
            </Button>
          ))}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modoEdicao ? 'Editar compromisso' : 'Novo compromisso'}
          </DialogTitle>
          <DialogDescription>
            Algo que ainda não aconteceu, mas que se sabe que vai acontecer
            todo mês — salário, aluguel, assinatura.
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
                    <Input autoFocus placeholder="Salário, aluguel..." {...field} />
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
                          {categoria.nome}{' '}
                          <span className="text-muted-foreground">
                            ({categoria.natureza === 'receita' ? 'receita' : 'despesa'})
                          </span>
                        </SelectItem>
                      ))}
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
              name="dia_mes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dia do mês</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={Number.isNaN(field.value) ? '' : field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px]">
                    Se o mês não tiver esse dia (ex.: 31 em fevereiro), cai no
                    último dia do mês.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="data_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim (opcional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
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
