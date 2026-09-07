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
import { useCartoes, useEventosFinanceiros } from '../caixa-hooks'
import { calcularDataCaixa, expandirEventos } from '../horizonte'
import { addMonths } from 'date-fns'

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
  const cartoes = useCartoes()
  const eventos = useEventosFinanceiros()

  const valoresPadrao: FormularioLancamento = {
    cartao_id: '', evento_id: '', competencia_evento: '',
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
        cartao_id: lancamento.cartao_id ?? '', evento_id: lancamento.evento_id ?? '', competencia_evento: lancamento.competencia_evento ?? '',
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
  const credito = form.watch('forma_pagamento') === 'credito'
  const cartao = cartoes.data?.find(c => c.id === form.watch('cartao_id'))
  const dataLancamento = form.watch('data')
  const eventoId = form.watch('evento_id')
  const eventoSelecionado = eventos.data?.find(e => e.id === eventoId)
  const ocorrencias = eventoSelecionado ? expandirEventos([eventoSelecionado], eventoSelecionado.data_inicio, paraISO(addMonths(hoje, 120))) : []
  const premissasIguais = lancamento && lancamento.data === dataLancamento && lancamento.cartao_id === (credito ? cartao?.id : null) && lancamento.forma_pagamento === textoOuNulo(form.watch('forma_pagamento'))
  const dataCaixa = premissasIguais ? lancamento.data_caixa : credito && cartao && dataLancamento ? calcularDataCaixa(dataLancamento, cartao) : dataLancamento

  async function submeter(valores: FormularioLancamento) {
    const dados = {
      cartao_id: credito ? valores.cartao_id : null,
      evento_id: textoOuNulo(valores.evento_id),
      competencia_evento: textoOuNulo(valores.competencia_evento),
      valor: valores.valor,
      categoria_id: valores.categoria_id,
      data: valores.data,
      descricao: textoOuNulo(valores.descricao),
      forma_pagamento: textoOuNulo(valores.forma_pagamento),
      data_vencimento: mostrarVencimento
        ? textoOuNulo(valores.data_vencimento)
        : null,
    }

    try {
      if (modoEdicao && lancamento) {
        await atualizar.mutateAsync({ id: lancamento.id, dados })
      } else {
        await criar.mutateAsync(dados)
      }
    } catch {
      // A mutation apresenta o erro; mantenha os campos para correção.
      return
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
                    <CampoDecimal
                      autoFocus
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
              name="categoria_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select value={field.value} onValueChange={v => { field.onChange(v); form.setValue('evento_id', ''); form.setValue('competencia_evento', '') }}>
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

            {credito && <FormField control={form.control} name="cartao_id" render={({ field }) => <FormItem>
              <FormLabel>Cartão</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Selecione o cartão" /></SelectTrigger></FormControl>
                <SelectContent>{cartoes.data?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select>
              {cartoes.isError && <p role="alert">Não foi possível carregar os cartões.</p>}
              {!cartoes.isPending && cartoes.data?.length === 0 && <p className="text-muted-foreground text-xs">Cadastre seu cartão em Financeiro → Planejamento.</p>}
              <FormMessage /></FormItem>} />}
            <p className="text-muted-foreground text-xs">{credito ? 'Vencimento da fatura' : 'Data de caixa'}: {dataCaixa || '—'}. A categoria continua contabilizada na data da compra.</p>
            <FormField control={form.control} name="evento_id" render={({ field }) => <FormItem>
              <FormLabel>Vincular a evento previsto</FormLabel>
              <Select value={field.value || 'nenhum'} onValueChange={v => { field.onChange(v === 'nenhum' ? '' : v); form.setValue('competencia_evento', '') }}>
                <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent><SelectItem value="nenhum">Sem vínculo</SelectItem>{eventos.data?.filter(e => e.categoria_id === categoriaSelecionada?.id).map(e => <SelectItem key={e.id} value={e.id}>{e.descricao}</SelectItem>)}</SelectContent>
              </Select><FormMessage /></FormItem>} />
            {eventoId && <FormField control={form.control} name="competencia_evento" render={({ field }) => <FormItem>
              <FormLabel>Ocorrência que está sendo paga</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Vencimento original" /></SelectTrigger></FormControl>
                <SelectContent>{ocorrencias.map(o => <SelectItem key={o.data} value={o.data}>{o.data} · R$ {o.valor.toFixed(2)}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />}
            {eventos.isError && <p role="alert" className="text-status-risco text-xs">Não foi possível carregar eventos para vincular: {eventos.error.message}</p>}
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
