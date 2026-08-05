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
import { useCriarLancamento, useAtualizarLancamento } from '../hooks'
import {
  schemaLancamento,
  textoOuNulo,
  type FormularioLancamento,
} from '../schemas'
import type { Categoria, Lancamento } from '../types'
import { FORMAS_PAGAMENTO, type FormaPagamento } from '@/lib/formasPagamento'

interface DialogLancamentoProps {
  categorias: readonly Categoria[]
  hoje: Date
  /** Se passado, o dialog abre em modo de edição. */
  lancamento?: Lancamento
}

/**
 * Formulário de novo/edição de lançamento — o mais usado no dia a dia, então
 * abre com data já preenchida e foco direto no valor (plano 8: reduzir fricção).
 */
/**
 * Sentinela de "não informada".
 *
 * `SelectItem` do Radix recusa valor vazio, então o vazio do formulário precisa
 * de um representante — o mesmo padrão do tipo de treino em `DialogTreino`.
 */
const SEM_FORMA = 'sem-forma'

export function DialogLancamento({
  categorias,
  hoje,
  lancamento,
}: DialogLancamentoProps) {
  const modoEdicao = Boolean(lancamento)
  const [aberto, setAberto] = useState(false)
  const criar = useCriarLancamento()
  const atualizar = useAtualizarLancamento()

  const valoresPadrao: FormularioLancamento = {
    valor: Number.NaN,
    categoria_id: '',
    data: paraISO(hoje),
    descricao: '',
    forma_pagamento: '',
    data_vencimento: '',
  }

  const form = useForm<FormularioLancamento>({
    resolver: zodResolver(schemaLancamento),
    defaultValues: valoresPadrao,
  })

  useEffect(() => {
    if (aberto && lancamento) {
      form.reset({
        valor: lancamento.valor,
        categoria_id: lancamento.categoria_id,
        data: lancamento.data,
        descricao: lancamento.descricao ?? '',
        // O CHECK do banco garante que o valor pertence ao conjunto
        forma_pagamento: (lancamento.forma_pagamento ?? '') as
          FormaPagamento | '',
        data_vencimento: lancamento.data_vencimento ?? '',
      })
    } else if (aberto && !lancamento) {
      form.reset(valoresPadrao)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, lancamento])

  const categoriaSelecionada = categorias.find(
    (c) => c.id === form.watch('categoria_id'),
  )
  // Vencimento só é oferecido para despesa fixa (resolução 10.2).
  const mostrarVencimento = categoriaSelecionada?.tipo === 'fixo'
  const pendente = criar.isPending || atualizar.isPending

  async function submeter(valores: FormularioLancamento) {
    const dados = {
      valor: valores.valor,
      categoria_id: valores.categoria_id,
      data: valores.data,
      descricao: textoOuNulo(valores.descricao),
      forma_pagamento: textoOuNulo(valores.forma_pagamento),
      data_vencimento: mostrarVencimento
        ? textoOuNulo(valores.data_vencimento)
        : null,
    }

    if (modoEdicao && lancamento) {
      await atualizar.mutateAsync({ id: lancamento.id, dados })
    } else {
      await criar.mutateAsync(dados)
    }
    form.reset(valoresPadrao)
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {modoEdicao ? (
          // Só ícone no mobile: este gatilho vive numa célula estreita da
          // tabela de lançamentos, onde "Editar" não cabe
          <Button
            size="sm"
            variant="ghost"
            className="size-9 p-0 sm:size-auto sm:px-3"
            aria-label="Editar lançamento"
          >
            <Pencil className="size-3.5" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            Novo lançamento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modoEdicao ? 'Editar lançamento' : 'Novo lançamento'}
          </DialogTitle>
          <DialogDescription>
            {modoEdicao
              ? 'Atualize os dados do lançamento.'
              : 'Registre uma entrada ou saída do dia.'}
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
                  {/*
                    Conjunto fechado em vez de texto livre (resolução 10.23):
                    digitar produzia "Débito", "debito" e "Débito " como três
                    formas distintas, e nenhum filtro agrupava direito.
                  */}
                  <Select
                    value={field.value === '' ? SEM_FORMA : field.value}
                    onValueChange={(valor) =>
                      field.onChange(valor === SEM_FORMA ? '' : valor)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* SelectItem recusa valor vazio, daí o sentinela */}
                      <SelectItem value={SEM_FORMA}>
                        <span className="text-muted-foreground">
                          Não informada
                        </span>
                      </SelectItem>
                      {FORMAS_PAGAMENTO.map((forma) => (
                        <SelectItem key={forma.valor} value={forma.valor}>
                          {forma.rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
