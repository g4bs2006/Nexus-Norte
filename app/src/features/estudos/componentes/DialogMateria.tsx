import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus } from 'lucide-react'
import { SeletorCor } from '@/components/SeletorCor'
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
import { useCriarMateria, useAtualizarMateria } from '../hooks'
import {
  numeroOuNulo,
  schemaMateria,
  textoOuNulo,
  type FormularioMateria,
} from '../schemas'
import type { Materia } from '../types'

const VAZIO: FormularioMateria = {
  nome: '',
  professor: '',
  carga_horaria_total: Number.NaN,
  limite_faltas: 0,
  semestre: '',
  data_inicio: '',
  data_fim: '',
  local: '',
  notas_particularidades: '',
  cor: '',
}

interface DialogMateriaProps {
  /** Se passada, o dialog abre em modo de edição. */
  materia?: Materia
}

export function DialogMateria({ materia }: DialogMateriaProps = {}) {
  const modoEdicao = Boolean(materia)
  const [aberto, setAberto] = useState(false)
  const criar = useCriarMateria()
  const atualizar = useAtualizarMateria()

  const form = useForm<FormularioMateria>({
    resolver: zodResolver(schemaMateria),
    defaultValues: VAZIO,
  })

  useEffect(() => {
    if (aberto && materia) {
      form.reset({
        nome: materia.nome,
        professor: materia.professor ?? '',
        carga_horaria_total: materia.carga_horaria_total ?? Number.NaN,
        limite_faltas: materia.limite_faltas,
        semestre: materia.semestre ?? '',
        data_inicio: materia.data_inicio ?? '',
        data_fim: materia.data_fim ?? '',
        local: materia.local ?? '',
        notas_particularidades: materia.notas_particularidades ?? '',
        cor: materia.cor ?? '',
      })
    } else if (aberto && !materia) {
      form.reset(VAZIO)
    }
  }, [aberto, materia, form])

  const pendente = criar.isPending || atualizar.isPending

  async function submeter(valores: FormularioMateria) {
    const dados = {
      nome: valores.nome,
      professor: textoOuNulo(valores.professor),
      carga_horaria_total: numeroOuNulo(valores.carga_horaria_total),
      limite_faltas: valores.limite_faltas,
      semestre: textoOuNulo(valores.semestre),
      data_inicio: valores.data_inicio === '' ? null : valores.data_inicio,
      data_fim: valores.data_fim === '' ? null : valores.data_fim,
      local: textoOuNulo(valores.local),
      notas_particularidades: textoOuNulo(valores.notas_particularidades),
      cor: textoOuNulo(valores.cor),
    }

    if (modoEdicao && materia) {
      await atualizar.mutateAsync({ id: materia.id, dados })
    } else {
      await criar.mutateAsync(dados)
    }
    form.reset(VAZIO)
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {modoEdicao ? (
          <Button size="sm" variant="ghost">
            <Pencil className="size-3.5" />
            Editar
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            Nova matéria
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modoEdicao ? 'Editar matéria' : 'Nova matéria'}
          </DialogTitle>
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

            <div className="grid grid-cols-2 gap-3">
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

              <FormField
                control={form.control}
                name="local"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Bloco B, sala 204" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="cor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <SeletorCor valor={field.value} onChange={field.onChange} />
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

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="data_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início das aulas</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="data_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim das aulas</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription className="text-[11px]">
                      Opcional — sem data, a aula não vence.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/*
              As notas de estudo saíram deste formulário em 13/08: viraram
              entidade própria, editada na aba Notas da matéria. Aqui ficou só
              particularidades, que é referência estável e pertence à ficha.
            */}
            <FormField
              control={form.control}
              name="notas_particularidades"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Particularidades</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Email do professor, política de faltas…"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px]">
                    Informação estável, de referência.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={pendente}>
                {pendente ? 'Salvando…' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
