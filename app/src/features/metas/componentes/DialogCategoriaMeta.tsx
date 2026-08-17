import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FolderPlus } from 'lucide-react'
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
import { useCriarCategoriaMeta } from '../hooks'
import { schemaCategoriaMeta, type FormularioCategoriaMeta } from '../schemas'

const CORES_PREDEFINIDAS = [
  { nome: 'Estudos / Azul', cor: '#4a87c4' },
  { nome: 'Financeiro / Verde', cor: '#4f9d69' },
  { nome: 'Treino / Laranja', cor: '#d0764b' },
  { nome: 'Projetos / Roxo', cor: '#8b6bb5' },
  { nome: 'Pessoal / Cinza', cor: '#a1a1aa' },
]

interface DialogCategoriaMetaProps {
  trigger?: React.ReactNode
}

export function DialogCategoriaMeta({ trigger }: DialogCategoriaMetaProps) {
  const [aberto, setAberto] = useState(false)
  const criarCategoria = useCriarCategoriaMeta()

  const form = useForm<FormularioCategoriaMeta>({
    resolver: zodResolver(schemaCategoriaMeta),
    defaultValues: {
      nome: '',
      cor: '#4a87c4',
      ordem: 0,
    },
  })

  async function aoSubmeter(dados: FormularioCategoriaMeta) {
    await criarCategoria.mutateAsync(dados)
    form.reset()
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <FolderPlus className="size-3.5" />
            <span>Nova Categoria</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Nova Categoria de Metas</DialogTitle>
          <DialogDescription className="text-xs">
            Agrupe suas metas por áreas personalizadas (ex: "Metas Acadêmicas", "Tirar CNH").
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
                    <div className="flex items-center gap-2">
                      {CORES_PREDEFINIDAS.map((c) => (
                        <button
                          key={c.cor}
                          type="button"
                          title={c.nome}
                          onClick={() => field.onChange(c.cor)}
                          className={`size-6 rounded-full transition-transform ${
                            field.value === c.cor
                              ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.cor }}
                        />
                      ))}
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
              <Button
                type="submit"
                size="sm"
                disabled={criarCategoria.isPending}
              >
                Salvar Categoria
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
