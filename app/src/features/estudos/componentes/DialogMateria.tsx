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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useCriarMateria } from '../hooks'
import {
  numeroOuNulo,
  schemaMateria,
  textoOuNulo,
  type FormularioMateria,
} from '../schemas'

const VAZIO: FormularioMateria = {
  nome: '',
  professor: '',
  carga_horaria_total: Number.NaN,
  limite_faltas: 0,
  semestre: '',
}

export function DialogMateria() {
  const [aberto, setAberto] = useState(false)
  const criar = useCriarMateria()

  const form = useForm<FormularioMateria>({
    resolver: zodResolver(schemaMateria),
    defaultValues: VAZIO,
  })

  async function submeter(valores: FormularioMateria) {
    await criar.mutateAsync({
      nome: valores.nome,
      professor: textoOuNulo(valores.professor),
      carga_horaria_total: numeroOuNulo(valores.carga_horaria_total),
      limite_faltas: valores.limite_faltas,
      semestre: textoOuNulo(valores.semestre),
    })
    form.reset(VAZIO)
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Nova matéria
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova matéria</DialogTitle>
          <DialogDescription>
            O limite de faltas alimenta o semáforo de risco.
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
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input autoFocus placeholder="Ex: Cálculo II" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="professor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Professor</FormLabel>
                  <FormControl>
                    <Input placeholder="Opcional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="limite_faltas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite de faltas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={Number.isNaN(field.value) ? '' : field.value}
                        onChange={(evento) =>
                          field.onChange(evento.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormDescription className="text-[11px]">
                      0 = não controlar
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="carga_horaria_total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carga horária</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="—"
                        value={Number.isNaN(field.value) ? '' : field.value}
                        onChange={(evento) =>
                          field.onChange(evento.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="semestre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semestre</FormLabel>
                    <FormControl>
                      <Input placeholder="2026.2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={criar.isPending}>
                {criar.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
