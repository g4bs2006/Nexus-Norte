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
import { DIAS_SEMANA } from '@/lib/constants'
import { ORDEM_DIAS_SEMANA as ORDEM_DIAS } from '@/lib/fluxograma'
import {
  useCriarFluxograma,
  useAtualizarFluxograma,
  useExcluirFluxograma,
} from '../hooks'
import { schemaFluxograma, type FormularioFluxograma } from '../schemas'
import type { FluxogramaAula, Materia } from '../types'

interface DialogFluxogramaProps {
  materias: readonly Materia[]
  /** Se passado, o dialog abre em modo de edição. */
  fluxograma?: FluxogramaAula
}

/** Adiciona ou edita uma aula recorrente ao fluxograma semanal (plano 3.3). */
export function DialogFluxograma({
  materias,
  fluxograma,
}: DialogFluxogramaProps) {
  const modoEdicao = Boolean(fluxograma)
  const [aberto, setAberto] = useState(false)
  const criar = useCriarFluxograma()
  const atualizar = useAtualizarFluxograma()
  const excluir = useExcluirFluxograma()

  const vazio: FormularioFluxograma = {
    materia_id: '',
    dia_semana: 1,
    horario_inicio: '08:00',
    horario_fim: '10:00',
  }

  const form = useForm<FormularioFluxograma>({
    resolver: zodResolver(schemaFluxograma),
    defaultValues: vazio,
  })

  useEffect(() => {
    if (aberto && fluxograma) {
      form.reset({
        materia_id: fluxograma.materia_id,
        dia_semana: fluxograma.dia_semana,
        horario_inicio: fluxograma.horario_inicio.slice(0, 5),
        horario_fim: fluxograma.horario_fim.slice(0, 5),
      })
    } else if (aberto && !fluxograma) {
      form.reset(vazio)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, fluxograma])

  const pendente = criar.isPending || atualizar.isPending

  async function submeter(valores: FormularioFluxograma) {
    if (modoEdicao && fluxograma) {
      await atualizar.mutateAsync({ id: fluxograma.id, dados: valores })
    } else {
      await criar.mutateAsync(valores)
    }
    form.reset(vazio)
    setAberto(false)
  }

  async function handleExcluir() {
    if (!fluxograma) return
    await excluir.mutateAsync(fluxograma.id)
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {modoEdicao ? (
          // 24px era o menor alvo de toque do app
          <Button size="icon" variant="ghost" className="size-8 sm:size-6">
            <Pencil className="size-3" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={materias.length === 0}
          >
            <Plus className="size-4" />
            Horário
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modoEdicao ? 'Editar aula no fluxograma' : 'Aula no fluxograma'}
          </DialogTitle>
          <DialogDescription>
            Padrão semanal recorrente — não é uma data única.
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
              name="materia_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Matéria</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {materias.map((materia) => (
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

            <FormField
              control={form.control}
              name="dia_semana"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dia da semana</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(valor) => field.onChange(Number(valor))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ORDEM_DIAS.map((dia) => (
                        <SelectItem key={dia} value={String(dia)}>
                          {DIAS_SEMANA[dia]}
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
                name="horario_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="horario_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              {modoEdicao && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void handleExcluir()}
                  disabled={excluir.isPending}
                  className="sm:mr-auto"
                >
                  {excluir.isPending ? 'Excluindo…' : 'Excluir'}
                </Button>
              )}
              <Button type="submit" disabled={pendente}>
                {pendente ? 'Salvando…' : modoEdicao ? 'Salvar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
