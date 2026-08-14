import { useEffect, useState, type ReactNode } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { useSalvarNota } from '../hooks'
import { schemaNota, type FormularioNota } from '../schemas'
import type { Nota } from '../types'

const VAZIO: FormularioNota = { titulo: '', conteudo: '' }

interface DialogNotaProps {
  materiaId: string
  /** Se passada, o dialog abre em modo de edição. */
  nota?: Nota
  /**
   * Sessão a que a nota se refere, quando ela nasce de uma sessão de estudo.
   * Só vale na criação — mudar o vínculo de uma nota existente não é um caso
   * que apareceu, e um seletor de sessão no formulário custaria mais do que
   * resolve.
   */
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
 * Criação e edição de nota.
 *
 * Mesmo componente para os dois modos, como `DialogMateria` — o formulário é o
 * mesmo e separar duplicaria a validação.
 *
 * O conteúdo é Markdown, escrito em `textarea` DE PROPÓSITO nesta fase (spec
 * 14/08, fase 3): o editor rico entra na fase 4, atrás do componente do kernel.
 * Escrever o editor antes do schema, dos hooks e do grafo amarraria o alicerce
 * à biblioteca; assim ele nasce como detalhe substituível.
 *
 * Toda gravação passa por `useSalvarNota` → `salvarNota`, que re-deriva links e
 * tópicos. Não há caminho aqui que escreva `conteudo` por fora (seção 3).
 */
export function DialogNota({
  materiaId,
  nota,
  sessaoId,
  trigger,
  tituloInicial,
}: DialogNotaProps) {
  const modoEdicao = Boolean(nota)
  const [aberto, setAberto] = useState(false)
  const salvar = useSalvarNota()

  const form = useForm<FormularioNota>({
    resolver: zodResolver(schemaNota),
    defaultValues: VAZIO,
  })

  useEffect(() => {
    if (!aberto) return
    if (nota) {
      form.reset({ titulo: nota.titulo, conteudo: nota.conteudo })
    } else {
      form.reset({ ...VAZIO, titulo: tituloInicial ?? '' })
    }
  }, [aberto, nota, tituloInicial, form])

  async function submeter(valores: FormularioNota) {
    await salvar.mutateAsync({
      ...(nota ? { id: nota.id } : {}),
      materiaId,
      titulo: valores.titulo,
      conteudo: valores.conteudo,
      ...(sessaoId ? { sessaoId } : {}),
    })
    form.reset(VAZIO)
    setAberto(false)
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
          <DialogTitle>{modoEdicao ? 'Editar nota' : 'Nova nota'}</DialogTitle>
          <DialogDescription>
            {sessaoId
              ? 'Fica vinculada à sessão de estudo, e aparece junto dela.'
              : 'Anotação da matéria — resumo, dúvida, o que revisar.'}
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
                    É de onde sai o endereço da nota. Renomear reescreve quem
                    aponta para ela.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="conteudo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={10}
                      placeholder="Escreva aqui…"
                      className="font-mono text-[13px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px]">
                    Markdown. <code>[[outra-nota]]</code> liga a outra nota,{' '}
                    <code>#topico</code> marca o assunto.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={salvar.isPending}>
                {salvar.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
