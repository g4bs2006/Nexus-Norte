import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FolderPlus, Palette, Pencil } from 'lucide-react'
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
import { useAtualizarCategoriaMeta, useCriarCategoriaMeta } from '../hooks'
import { schemaCategoriaMeta, type FormularioCategoriaMeta } from '../schemas'
import type { CategoriaMeta } from '../types'

const PALETA_CORES = [
  { nome: 'Azul Estudos', cor: '#4a87c4' },
  { nome: 'Verde Financeiro', cor: '#4f9d69' },
  { nome: 'Laranja Treino', cor: '#d0764b' },
  { nome: 'Roxo Projetos', cor: '#8b6bb5' },
  { nome: 'Rosa Neon', cor: '#e056fd' },
  { nome: 'Coral', cor: '#ff6b6b' },
  { nome: 'Amarelo Ouro', cor: '#f1c40f' },
  { nome: 'Ciano', cor: '#00cec9' },
  { nome: 'Esmeralda', cor: '#10b981' },
  { nome: 'Índigo', cor: '#6c5ce7' },
  { nome: 'Magenta', cor: '#e84393' },
  { nome: 'Cinza Muted', cor: '#a1a1aa' },
]

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

  const form = useForm<FormularioCategoriaMeta>({
    resolver: zodResolver(schemaCategoriaMeta),
    defaultValues: {
      nome: '',
      cor: '#4a87c4',
      ordem: 0,
    },
  })

  useEffect(() => {
    if (!aberto) return
    if (categoria) {
      form.reset({
        nome: categoria.nome,
        cor: categoria.cor,
        ordem: categoria.ordem,
      })
    } else {
      form.reset({
        nome: '',
        cor: '#4a87c4',
        ordem: 0,
      })
    }
  }, [aberto, categoria, form])

  async function aoSubmeter(dados: FormularioCategoriaMeta) {
    if (modoEdicao && categoria) {
      await atualizarCategoria.mutateAsync({
        id: categoria.id,
        dados: { nome: dados.nome, cor: dados.cor },
      })
    } else {
      await criarCategoria.mutateAsync(dados)
    }
    setAberto(false)
  }

  const pendente = criarCategoria.isPending || atualizarCategoria.isPending

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            {modoEdicao ? <Pencil className="size-3.5" /> : <FolderPlus className="size-3.5" />}
            <span>{modoEdicao ? 'Editar' : 'Nova Categoria'}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {modoEdicao ? 'Editar Categoria' : 'Nova Categoria de Metas'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Agrupe suas metas por áreas personalizadas e escolha uma cor para identificá-la.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(aoSubmeter)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Nome da Categoria</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Tirar CNH, Projetos 2026..."
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
                  <FormLabel className="text-xs">Cor / Identidade</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      {/* Paleta de cores predefinidas */}
                      <div className="grid grid-cols-6 gap-2">
                        {PALETA_CORES.map((c) => (
                          <button
                            key={c.cor}
                            type="button"
                            title={c.nome}
                            onClick={() => field.onChange(c.cor)}
                            className={`size-7 rounded-full transition-transform ${
                              field.value === c.cor
                                ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
                                : 'opacity-70 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: c.cor }}
                          />
                        ))}
                      </div>

                      {/* Seletor de cor personalizada (Color Picker + Hex Input) */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="relative flex items-center justify-center shrink-0">
                          <input
                            type="color"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="size-7 cursor-pointer opacity-0 absolute inset-0"
                            title="Escolher cor personalizada"
                          />
                          <div
                            className="size-7 rounded-md border border-border flex items-center justify-center"
                            style={{ backgroundColor: field.value }}
                          >
                            <Palette className="size-3.5 text-white mix-blend-difference" />
                          </div>
                        </div>
                        <Input
                          type="text"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder="#4a87c4"
                          className="h-7 text-xs font-mono w-28 uppercase"
                        />
                        <span className="text-[11px] text-muted-foreground">Cor livre</span>
                      </div>
                    </div>
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
                {modoEdicao ? 'Salvar Alterações' : 'Salvar Categoria'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
