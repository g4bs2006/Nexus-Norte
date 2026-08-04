import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus } from 'lucide-react'
import { SeletorCor } from '@/components/SeletorCor'
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
import { useCriarCategoria, useAtualizarCategoria } from '../hooks'
import { schemaCategoria, textoOuNulo, type FormularioCategoria } from '../schemas'
import type { Categoria } from '../types'

const VAZIO: FormularioCategoria = {
  nome: '',
  natureza: 'despesa',
  tipo: 'variavel',
  meta_mensal: Number.NaN,
  meta_tipo: '',
  cor: '',
}

interface DialogCategoriaProps {
  /** Se passada, o dialog abre em modo de edição. */
  categoria?: Categoria
}

/** Cadastro e edição de categoria (plano 2.5). */
export function DialogCategoria({ categoria }: DialogCategoriaProps = {}) {
  const modoEdicao = Boolean(categoria)
  const [aberto, setAberto] = useState(false)
  const criar = useCriarCategoria()
  const atualizar = useAtualizarCategoria()

  const form = useForm<FormularioCategoria>({
    resolver: zodResolver(schemaCategoria),
    defaultValues: VAZIO,
  })

  // Quando o dialog abre em modo edição, preenche o form com os dados existentes
  useEffect(() => {
    if (aberto && categoria) {
      form.reset({
        nome: categoria.nome,
        natureza: categoria.natureza,
        tipo: categoria.tipo ?? '',
        meta_mensal: categoria.meta_mensal ?? Number.NaN,
        meta_tipo: categoria.meta_tipo ?? '',
        cor: categoria.cor ?? '',
      })
    } else if (aberto && !categoria) {
      form.reset(VAZIO)
    }
  }, [aberto, categoria, form])

  const natureza = form.watch('natureza')
  const ehReceita = natureza === 'receita'
  const pendente = criar.isPending || atualizar.isPending

  async function submeter(valores: FormularioCategoria) {
    const dados = {
      nome: valores.nome,
      natureza: valores.natureza,
      // Constraint categorias_tipo_por_natureza: receita não tem tipo.
      tipo: ehReceita ? null : valores.tipo === '' ? null : valores.tipo,
      meta_mensal: Number.isNaN(valores.meta_mensal) ? null : valores.meta_mensal,
      meta_tipo: valores.meta_tipo === '' ? null : valores.meta_tipo,
      cor: textoOuNulo(valores.cor),
    }

    if (modoEdicao && categoria) {
      await atualizar.mutateAsync({ id: categoria.id, dados })
    } else {
      await criar.mutateAsync(dados)
    }
    form.reset(VAZIO)
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {modoEdicao ? (
          <Button size="sm" variant="ghost">
            <Pencil className="size-3.5" />
            Editar
          </Button>
        ) : (
          <Button size="sm" variant="secondary">
            <Plus className="size-4" />
            Categoria
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modoEdicao ? 'Editar categoria' : 'Nova categoria'}
          </DialogTitle>
          <DialogDescription>
            Receitas não usam fixo/variável nem meta.
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
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input autoFocus placeholder="Ex: Mercado" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="natureza"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Natureza</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(valor) => {
                        field.onChange(valor)
                        // Mantém o formulário coerente com a constraint do banco
                        if (valor === 'receita') {
                          form.setValue('tipo', '')
                          form.setValue('meta_mensal', Number.NaN)
                          form.setValue('meta_tipo', '')
                        } else {
                          form.setValue('tipo', 'variavel')
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="despesa">Despesa</SelectItem>
                        <SelectItem value="receita">Receita</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!ehReceita && (
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fixo">Fixo</SelectItem>
                          <SelectItem value="variavel">Variável</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {!ehReceita && (
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="meta_mensal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          placeholder="Opcional"
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
                  name="meta_tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de meta</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sem meta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="valor">Valor em R$</SelectItem>
                          <SelectItem value="percentual_renda">
                            % da renda
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-[11px]">
                        % da renda usa a receita do mês.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="cor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <SeletorCor valor={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />

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
