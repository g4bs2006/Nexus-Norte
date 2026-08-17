import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
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
import { useMaterias } from '@/features/estudos/hooks'
import { useSalvarNota } from '../hooks'
import { schemaNota, type FormularioNota } from '../schemas'

const VAZIO: FormularioNota = { titulo: '', conteudo: '' }

interface DialogNotaProps {
  materiaId: string
  /** Sessão a que a nota se refere, quando ela nasce de uma sessão de estudo. */
  sessaoId?: string
  /**
   * Gatilho próprio, para os pontos de entrada fora da aba Notas — o card da
   * matéria na listagem e a linha da sessão. Sem ele, cai no botão padrão.
   */
  trigger?: ReactNode
  /** Sugestão de título quando a nota nasce de outro contexto. */
  tituloInicial?: string
}

/**
 * Criação de nota. **Só criação.**
 *
 * Este diálogo já foi o lugar onde se escrevia — e era o defeito que o spec de
 * 14/08 (nota como página) veio corrigir: `DialogContent` tem 384px, mais
 * estreito que um celular deitado, e ali dentro se esperava escrever fórmula,
 * diagrama e desenho.
 *
 * Agora ele faz o que um diálogo faz bem: pergunta o mínimo e sai da frente.
 * Pede o título, cria a nota e **navega para `/notas/:slug`**, que é a
 * superfície de escrita de verdade. Não há campo de conteúdo aqui, e não há
 * modo de edição — editar é abrir a nota.
 *
 * O título é o mínimo porque dele sai o slug, que é a identidade do wikilink.
 * Nota sem título seria nota sem endereço.
 */
export function DialogNota({
  materiaId,
  sessaoId,
  trigger,
  tituloInicial,
}: DialogNotaProps) {
  const [aberto, setAberto] = useState(false)
  const salvar = useSalvarNota()
  const navigate = useNavigate()
  const materias = useMaterias()

  const form = useForm<FormularioNota>({
    resolver: zodResolver(schemaNota),
    defaultValues: VAZIO,
  })

  useEffect(() => {
    if (!aberto) return
    form.reset({ ...VAZIO, titulo: tituloInicial ?? '' })
  }, [aberto, tituloInicial, form])

  async function submeter(valores: FormularioNota) {
    const idMateriaAlvo = materiaId ?? materias.data?.[0]?.id ?? ''
    const nota = await salvar.mutateAsync({
      materiaId: idMateriaAlvo,
      titulo: valores.titulo,
      // Nasce vazia de propósito: escrever é na página, não aqui.
      conteudo: '',
      ...(sessaoId ? { sessaoId } : {}),
    })
    form.reset(VAZIO)
    setAberto(false)
    navigate(`/notas/${nota.slug}`)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-4" />
            Nova nota
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova nota</DialogTitle>
          <DialogDescription>
            {sessaoId
              ? 'Fica vinculada à sessão de estudo, e aparece junto dela.'
              : 'Dê um nome e comece a escrever.'}
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
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Fórmulas da P2"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px]">
                    É de onde sai o endereço da nota. Renomear depois reescreve
                    quem aponta para ela.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={salvar.isPending}>
                {salvar.isPending ? 'Criando…' : 'Criar e escrever'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
