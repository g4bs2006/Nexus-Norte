import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FolderPlus, Pencil } from 'lucide-react'
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
import { SeletorCor } from '@/components/SeletorCor'
import { CORES_DISPONIVEIS } from '@/lib/cores'
import {
  useAtualizarCategoriaMeta,
  useCategoriasMetas,
  useCriarCategoriaMeta,
} from '../hooks'
import { schemaCategoriaMeta, type FormularioCategoriaMeta } from '../schemas'
import type { CategoriaMeta } from '../types'

/** Primeira cor da paleta — só o ponto de partida de uma categoria nova.
 * `''` (sem cor) é estado válido, então serve de rede caso a paleta esvazie. */
const COR_INICIAL = CORES_DISPONIVEIS[0]?.valor ?? ''

interface DialogCategoriaMetaProps {
  categoria?: CategoriaMeta
  trigger?: React.ReactNode
}

export function DialogCategoriaMeta({
  categoria,
  trigger,
}: DialogCategoriaMetaProps) {
  const modoEdicao = Boolean(categoria)
  const [aberto, setAberto] = useState(false)
  const criarCategoria = useCriarCategoriaMeta()
  const atualizarCategoria = useAtualizarCategoriaMeta()
  // Já está em cache (o painel de metas lista as categorias); serve só para
  // saber qual é o fim da fila ao criar.
  const { data: categorias } = useCategoriasMetas()

  const form = useForm<FormularioCategoriaMeta>({
    resolver: zodResolver(schemaCategoriaMeta),
    defaultValues: { nome: '', cor: COR_INICIAL },
  })

  useEffect(() => {
    if (!aberto) return
    form.reset(
      categoria
        ? { nome: categoria.nome, cor: categoria.cor }
        : { nome: '', cor: COR_INICIAL },
    )
  }, [aberto, categoria, form])

  async function aoSubmeter(dados: FormularioCategoriaMeta) {
    if (modoEdicao && categoria) {
      await atualizarCategoria.mutateAsync({
        id: categoria.id,
        dados: { nome: dados.nome, cor: dados.cor },
      })
    } else {
      // Categoria nova entra no fim. Antes ia sempre com `ordem: 0`, o que
      // deixava a coluna inútil e a ordenação caindo na data de criação.
      await criarCategoria.mutateAsync({
        ...dados,
        ordem: (categorias ?? []).length,
      })
    }
    setAberto(false)
  }

  const pendente = criarCategoria.isPending || atualizarCategoria.isPending

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            {modoEdicao ? (
              <Pencil className="size-3.5" />
            ) : (
              <FolderPlus className="size-3.5" />
            )}
            <span>{modoEdicao ? 'Editar' : 'Nova categoria'}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {modoEdicao ? 'Editar categoria' : 'Nova categoria de metas'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Agrupe metas por área e escolha uma cor para identificá-la.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(aoSubmeter)}
            className="space-y-4 pt-2"
          >
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Nome da categoria</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Tirar CNH, Projetos 2026…"
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
              name="cor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Cor</FormLabel>
                  <FormControl>
                    <SeletorCor
                      valor={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
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
                {modoEdicao ? 'Salvar alterações' : 'Criar categoria'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
