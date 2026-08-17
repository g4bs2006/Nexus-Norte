import { type ReactNode, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAtualizarMeta, useCategoriasMetas, useCriarMeta } from '../hooks'
import { schemaMeta, textoOuNulo, type FormularioMeta } from '../schemas'
import { ROTULOS_PILAR, type Meta, type PilarMeta } from '../types'

const PILARES: PilarMeta[] = [
  'estudos',
  'financeiro',
  'treino',
  'projetos',
  'pessoal',
]

const VAZIO: FormularioMeta = {
  titulo: '',
  descricao: '',
  categoria_meta_id: null,
  pilar: null,
  data_alvo: null,
  no_check_diario: false,
}

interface DialogMetaProps {
  meta?: Meta
  categoriaPadraoId?: string
  trigger?: ReactNode
}

export function DialogMeta({
  meta,
  categoriaPadraoId,
  trigger,
}: DialogMetaProps = {}) {
  const modoEdicao = Boolean(meta)
  const [aberto, setAberto] = useState(false)
  const criar = useCriarMeta()
  const atualizar = useAtualizarMeta()
  const { data: categorias } = useCategoriasMetas()

  const form = useForm<FormularioMeta>({
    resolver: zodResolver(schemaMeta),
    defaultValues: VAZIO,
  })

  useEffect(() => {
    if (!aberto) return
    if (meta) {
      form.reset({
        titulo: meta.titulo,
        descricao: meta.descricao ?? '',
        categoria_meta_id: meta.categoria_meta_id ?? null,
        pilar: meta.pilar ?? null,
        data_alvo: meta.data_alvo ?? null,
        no_check_diario: meta.no_check_diario,
      })
    } else {
      form.reset({
        ...VAZIO,
        categoria_meta_id: categoriaPadraoId ?? null,
      })
    }
  }, [aberto, meta, categoriaPadraoId, form])

  async function aoSubmeter(dados: FormularioMeta) {
    const limpo = {
      titulo: dados.titulo.trim(),
      descricao: textoOuNulo(dados.descricao),
      categoria_meta_id: dados.categoria_meta_id || null,
      pilar: dados.pilar || null,
      data_alvo: textoOuNulo(dados.data_alvo ?? ''),
      no_check_diario: dados.no_check_diario,
    }

    if (modoEdicao && meta) {
      await atualizar.mutateAsync({ id: meta.id, dados: limpo })
    } else {
      await criar.mutateAsync(limpo)
    }

    setAberto(false)
  }

  const pendente = criar.isPending || atualizar.isPending

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            aria-label={modoEdicao ? 'Editar meta' : 'Nova meta'}
          >
            {modoEdicao ? <Pencil className="size-3.5" /> : <Plus className="size-3.5" />}
            <span>{modoEdicao ? 'Editar' : 'Nova meta'}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {modoEdicao ? 'Editar meta' : 'Nova meta'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Metas simples para acompanhar seus objetivos com categorias e prazo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(aoSubmeter)} className="space-y-4 pt-1">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Título</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Aprender Git / GitHub, Tirar CNH..."
                      className="text-xs"
                      {...field}
                    />
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
                  <FormLabel className="text-xs">Descrição / Detalhes (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adicione observações, links ou detalhes..."
                      className="text-xs min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="categoria_meta_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Categoria</FormLabel>
                    <Select
                      value={field.value ?? 'nenhuma'}
                      onValueChange={(val) =>
                        field.onChange(val === 'nenhuma' ? null : val)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Sem categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="nenhuma">Sem categoria</SelectItem>
                        {(categorias ?? []).map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.nome}
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
                name="pilar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Pilar (Opcional)</FormLabel>
                    <Select
                      value={field.value ?? 'nenhum'}
                      onValueChange={(val) =>
                        field.onChange(val === 'nenhum' ? null : val)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="nenhum">Nenhum</SelectItem>
                        {PILARES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {ROTULOS_PILAR[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="data_alvo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Prazo limite (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="text-xs"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="no_check_diario"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel className="text-xs font-medium leading-none">
                      Exibir nos Checks Diários da Home
                    </FormLabel>
                    <p className="text-[11px] text-muted-foreground">
                      Aparecerá no bloco do topo diariamente enquanto a meta estiver ativa.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAberto(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={pendente}>
                {modoEdicao ? 'Salvar alterações' : 'Criar meta'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
