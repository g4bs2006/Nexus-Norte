import { type ReactNode, useEffect, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useAtualizarAtividade,
  useCriarAtividade,
  useMaterias,
} from '../hooks'
import {
  schemaAtividade,
  textoOuNulo,
  type FormularioAtividade,
} from '../schemas'
import type { Atividade } from '../types'

interface DialogAtividadeProps {
  atividade?: Atividade
  /** Trava a matéria — usado quando o diálogo abre de dentro dela. */
  materiaId?: string
  /** Data pré-preenchida, para criar a partir de um dia do calendário. */
  dataPadrao?: string
  trigger?: ReactNode
}

/**
 * Formulário único de criar e editar entrega ("um editor, não dois").
 *
 * RHF + Zod como todo `Dialog*` do projeto. O design técnico da feature sugeria
 * estado manual, com o argumento de que os schemas de Estudos estariam mortos —
 * não estão: `schemaMateria` e `schemaFluxograma` são usados pelos diálogos
 * irmãos, e o formulário manual é padrão das abas inline, não dos diálogos.
 */
export function DialogAtividade({
  atividade,
  materiaId,
  dataPadrao,
  trigger,
}: DialogAtividadeProps) {
  const modoEdicao = Boolean(atividade)
  const [aberto, setAberto] = useState(false)
  const criar = useCriarAtividade()
  const atualizar = useAtualizarAtividade()
  const { data: materias } = useMaterias()

  const materiaTravada = materiaId ?? atividade?.materia_id

  const form = useForm<FormularioAtividade>({
    resolver: zodResolver(schemaAtividade),
    defaultValues: {
      materia_id: materiaTravada ?? '',
      titulo: '',
      descricao: '',
      data_entrega: dataPadrao ?? '',
      hora_entrega: '',
    },
  })

  useEffect(() => {
    if (!aberto) return
    form.reset(
      atividade
        ? {
            materia_id: atividade.materia_id,
            titulo: atividade.titulo,
            descricao: atividade.descricao ?? '',
            data_entrega: atividade.data_entrega,
            // A coluna é `time`, então volta como `HH:MM:SS`; o input quer HH:MM.
            hora_entrega: atividade.hora_entrega?.slice(0, 5) ?? '',
          }
        : {
            materia_id: materiaTravada ?? '',
            titulo: '',
            descricao: '',
            data_entrega: dataPadrao ?? '',
            hora_entrega: '',
          },
    )
  }, [aberto, atividade, materiaTravada, dataPadrao, form])

  async function aoSubmeter(dados: FormularioAtividade) {
    const limpo = {
      materia_id: dados.materia_id,
      titulo: dados.titulo.trim(),
      descricao: textoOuNulo(dados.descricao),
      data_entrega: dados.data_entrega,
      hora_entrega: textoOuNulo(dados.hora_entrega),
    }

    if (modoEdicao && atividade) {
      await atualizar.mutateAsync({ id: atividade.id, dados: limpo })
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
          <Button size="sm" className="gap-1.5 text-xs">
            {modoEdicao ? (
              <Pencil className="size-3.5" />
            ) : (
              <Plus className="size-3.5" />
            )}
            <span>{modoEdicao ? 'Editar' : 'Nova entrega'}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {modoEdicao ? 'Editar entrega' : 'Nova entrega'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Trabalho, relatório, lista para entregar — o que tem prazo. A nota,
            se houver, continua na aba Avaliações.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(aoSubmeter)}
            className="space-y-4 pt-1"
          >
            {materiaTravada === undefined && (
              <FormField
                control={form.control}
                name="materia_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Matéria</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Escolha a matéria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(materias ?? []).map((materia) => (
                          <SelectItem key={materia.id} value={materia.id}>
                            {materia.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Título</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Trabalho de Sinais, Relatório 2…"
                      className="text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="data_entrega"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Data de entrega</FormLabel>
                    <FormControl>
                      <Input type="date" className="text-xs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hora_entrega"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Hora (opcional)</FormLabel>
                    <FormControl>
                      <Input type="time" className="text-xs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Descrição (opcional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="O que precisa ser entregue, link do portal…"
                      className="min-h-16 text-xs"
                      {...field}
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
                {modoEdicao ? 'Salvar alterações' : 'Criar entrega'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
