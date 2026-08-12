import { type ReactNode, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus } from 'lucide-react'
import { CampoDecimal } from '@/components/CampoDecimal'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { useCategorias } from '@/features/financeiro/hooks'
import { useMaterias } from '@/features/estudos/hooks'
import { useTiposTreino } from '@/features/treino/hooks'
import { useProjetos } from '@/features/projetos/hooks'
import { useAtualizarMeta, useCriarMeta } from '../hooks'
import {
  PILARES_LINK,
  schemaMeta,
  textoOuNulo,
  type FormularioMeta,
} from '../schemas'
import {
  pilarDaMeta,
  ROTULOS_PILAR_LINK,
  ROTULOS_TIPO_META,
  type Meta,
  type PilarMeta,
  type TipoMeta,
} from '../types'

const TIPOS = Object.keys(ROTULOS_TIPO_META) as TipoMeta[]

/**
 * Sentinela de "sem vínculo".
 *
 * `SelectItem` do Radix recusa valor vazio, então o vazio do formulário
 * precisa de um representante — o mesmo padrão usado em `DialogLancamento`.
 */
const SEM_VINCULO = 'nenhum'

const VAZIO: FormularioMeta = {
  tipo: 'numerica',
  titulo: '',
  descricao: '',
  data_alvo: '',
  pilarLink: '',
  entidadeId: '',
  valor_alvo: Number.NaN,
  unidade: '',
  frequencia_alvo: Number.NaN,
  diaria: false,
}

interface DialogMetaProps {
  /** Se passado, abre o dialog em modo de edição. */
  meta?: Meta
  /** Elemento que dispara a abertura. Se omitido, usa um botão padrão (+ ou lápis). */
  trigger?: ReactNode
}

export function DialogMeta({ meta, trigger }: DialogMetaProps = {}) {
  const modoEdicao = Boolean(meta)
  const [aberto, setAberto] = useState(false)
  const criar = useCriarMeta()
  const atualizar = useAtualizarMeta()

  const categorias = useCategorias()
  const materias = useMaterias()
  const tiposTreino = useTiposTreino()
  const projetos = useProjetos()

  const form = useForm<FormularioMeta>({
    resolver: zodResolver(schemaMeta),
    defaultValues: VAZIO,
  })

  useEffect(() => {
    if (aberto && meta) {
      const link = pilarDaMeta(meta)
      form.reset({
        tipo: meta.tipo,
        titulo: meta.titulo,
        descricao: meta.descricao ?? '',
        data_alvo: meta.data_alvo ?? '',
        pilarLink: link?.pilar ?? '',
        entidadeId: link?.id ?? '',
        valor_alvo: meta.valor_alvo ?? Number.NaN,
        unidade: meta.unidade ?? '',
        frequencia_alvo: meta.frequencia_alvo ?? Number.NaN,
        // 7x/semana É todo dia — não há coluna separada para "diária", então
        // uma meta salva com frequencia_alvo=7 volta a abrir com o checkbox
        // ligado, e não com "7" solto no campo numérico.
        diaria: meta.tipo === 'habito' && meta.frequencia_alvo === 7,
      })
    } else if (aberto && !meta) {
      form.reset(VAZIO)
    }
  }, [aberto, meta, form])

  const tipo = form.watch('tipo') ?? 'numerica'
  const pilarLink = form.watch('pilarLink') ?? ''
  const diaria = form.watch('diaria') ?? false
  const pendente = criar.isPending || atualizar.isPending

  const opcoesEntidade: { id: string; nome: string }[] =
    pilarLink === 'financeiro'
      ? (categorias.data ?? []).map((c) => ({ id: c.id, nome: c.nome }))
      : pilarLink === 'estudos'
        ? (materias.data ?? []).map((m) => ({ id: m.id, nome: m.nome }))
        : pilarLink === 'treino'
          ? (tiposTreino.data ?? []).map((t) => ({ id: t.id, nome: t.nome }))
          : pilarLink === 'projetos'
            ? (projetos.data ?? []).map((p) => ({ id: p.id, nome: p.nome }))
            : []

  async function submeter(valores: FormularioMeta) {
    const link = valores.pilarLink as PilarMeta | ''
    const dados = {
      tipo: valores.tipo,
      titulo: valores.titulo,
      descricao: textoOuNulo(valores.descricao),
      data_alvo: valores.data_alvo === '' ? null : valores.data_alvo,

      categoria_id: link === 'financeiro' ? valores.entidadeId : null,
      materia_id: link === 'estudos' ? valores.entidadeId : null,
      tipo_treino_id: link === 'treino' ? valores.entidadeId : null,
      projeto_id: link === 'projetos' ? valores.entidadeId : null,
      usa_peso_corporal: link === 'corporal',

      valor_alvo: Number.isNaN(valores.valor_alvo) ? null : valores.valor_alvo,
      unidade: textoOuNulo(valores.unidade),
      frequencia_alvo:
        valores.tipo === 'habito' && valores.diaria
          ? 7
          : Number.isNaN(valores.frequencia_alvo)
            ? null
            : valores.frequencia_alvo,
      frequencia_periodo: valores.tipo === 'habito' ? 'semana' : null,
    }

    if (modoEdicao && meta) {
      await atualizar.mutateAsync({ id: meta.id, dados })
    } else {
      await criar.mutateAsync(dados)
    }
    form.reset(VAZIO)
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ??
          (modoEdicao ? (
            <Button variant="ghost" size="icon" className="size-6" aria-label="Editar meta">
              <Pencil className="size-3" />
            </Button>
          ) : (
            <Button size="sm">
              <Plus className="size-4" />
              Nova meta
            </Button>
          ))}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modoEdicao ? 'Editar meta' : 'Nova meta'}</DialogTitle>
          <DialogDescription>
            Metas numéricas com link de pilar calculam o progresso a partir dos
            dados reais; sem link, você atualiza o valor manualmente.
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
                      {TIPOS.map((valor) => (
                        <SelectItem key={valor} value={valor}>
                          {ROTULOS_TIPO_META[valor]}
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
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input autoFocus placeholder="Ex: Economizar para viagem" {...field} />
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
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Opcional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data_alvo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prazo (opcional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="pilarLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vínculo (opcional)</FormLabel>
                    <Select
                      value={field.value === '' ? SEM_VINCULO : field.value}
                      onValueChange={(valor) => {
                        field.onChange(valor === SEM_VINCULO ? '' : valor)
                        form.setValue('entidadeId', '')
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PILARES_LINK.map((valor) => (
                          <SelectItem
                            key={valor}
                            value={valor === '' ? SEM_VINCULO : valor}
                          >
                            {valor === ''
                              ? 'Nenhum'
                              : ROTULOS_PILAR_LINK[valor]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {pilarLink !== '' && pilarLink !== 'corporal' && (
                <FormField
                  control={form.control}
                  name="entidadeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {opcoesEntidade.map((opcao) => (
                            <SelectItem key={opcao.id} value={opcao.id}>
                              {opcao.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {tipo === 'numerica' && (
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="valor_alvo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alvo</FormLabel>
                      <FormControl>
                        <CampoDecimal
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
                  name="unidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade</FormLabel>
                      <FormControl>
                        <Input placeholder="R$, h, kg…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {tipo === 'habito' && (
              <>
                <FormField
                  control={form.control}
                  name="diaria"
                  render={({ field }) => (
                    <FormItem className="flex flex-row-reverse items-center justify-end gap-2">
                      <FormLabel className="font-normal">
                        Meta diária (todo santo dia, sem número pra configurar)
                      </FormLabel>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checado) => {
                            const ligado = checado === true
                            field.onChange(ligado)
                            // Zera o número ao desligar: se deixasse "7" parado
                            // no campo, pareceria que o usuário escolheu 7x —
                            // desligar o diário deve pedir uma escolha explícita.
                            if (!ligado) {
                              form.setValue('frequencia_alvo', Number.NaN)
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {!diaria && (
                  <FormField
                    control={form.control}
                    name="frequencia_alvo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vezes por semana</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={Number.isNaN(field.value) ? '' : field.value}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

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
