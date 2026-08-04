import { useState } from 'react'
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
import { useCriarFluxograma } from '../hooks'
import { schemaFluxograma, type FormularioFluxograma } from '../schemas'
import type { Materia } from '../types'

/** Segunda a domingo na exibição, mantendo 0 = domingo no valor. */
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0] as const

interface DialogFluxogramaProps {
  materias: readonly Materia[]
}

/** Adiciona uma aula recorrente ao fluxograma semanal (plano 3.3). */
export function DialogFluxograma({ materias }: DialogFluxogramaProps) {
  const [aberto, setAberto] = useState(false)
  const criar = useCriarFluxograma()

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

  async function submeter(valores: FormularioFluxograma) {
    await criar.mutateAsync(valores)
    form.reset(vazio)
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" disabled={materias.length === 0}>
          <Plus className="size-4" />
          Horário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aula no fluxograma</DialogTitle>
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
              <Button type="submit" disabled={criar.isPending}>
                {criar.isPending ? 'Salvando…' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
