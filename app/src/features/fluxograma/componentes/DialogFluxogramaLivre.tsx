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
import {
  useAtualizarFluxogramaLivre,
  useCriarFluxogramaLivre,
} from '../hooks'
import {
  schemaFluxogramaLivre,
  type FormularioFluxogramaLivre,
} from '../schemas'
import type { FluxogramaLivre } from '../api'

/** Segunda a domingo na exibição, mantendo 0 = domingo no valor. */
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0] as const

interface DialogFluxogramaLivreProps {
  /** Se passado, o dialog abre em modo de edição. */
  bloco?: FluxogramaLivre
  /** Dia da semana sugerido ao abrir vazio (ex.: clicado no calendário). */
  diaSemanaSugerido?: number
}

const VAZIO: FormularioFluxogramaLivre = {
  rotulo: '',
  dia_semana: 1,
  horario_inicio: '09:00',
  horario_fim: '18:00',
}

/**
 * Bloco de trabalho — ou qualquer outro rótulo livre — no fluxograma
 * (resolução 10.48.0). Terceiro modo do mesmo padrão de `DialogFluxograma`
 * (matéria) e `DialogFluxogramaTreino`, trocando o Select de entidade por um
 * campo de texto: aqui não há dono, só um rótulo.
 */
export function DialogFluxogramaLivre({
  bloco,
  diaSemanaSugerido,
}: DialogFluxogramaLivreProps) {
  const modoEdicao = Boolean(bloco)
  const [aberto, setAberto] = useState(false)
  const criar = useCriarFluxogramaLivre()
  const atualizar = useAtualizarFluxogramaLivre()

  const vazio: FormularioFluxogramaLivre = {
    ...VAZIO,
    dia_semana: diaSemanaSugerido ?? VAZIO.dia_semana,
  }

  const form = useForm<FormularioFluxogramaLivre>({
    resolver: zodResolver(schemaFluxogramaLivre),
    defaultValues: vazio,
  })

  useEffect(() => {
    if (aberto && bloco) {
      form.reset({
        rotulo: bloco.rotulo,
        dia_semana: bloco.dia_semana,
        horario_inicio: bloco.horario_inicio.slice(0, 5),
        horario_fim: bloco.horario_fim.slice(0, 5),
      })
    } else if (aberto && !bloco) {
      form.reset(vazio)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, bloco])

  const pendente = criar.isPending || atualizar.isPending

  async function submeter(valores: FormularioFluxogramaLivre) {
    if (modoEdicao && bloco) {
      await atualizar.mutateAsync({ id: bloco.id, dados: valores })
    } else {
      await criar.mutateAsync(valores)
    }
    form.reset(vazio)
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {modoEdicao ? (
          <Button size="icon" variant="ghost" className="size-8 sm:size-6">
            <Pencil className="size-3" />
          </Button>
        ) : (
          <Button size="sm" variant="secondary">
            <Plus className="size-4" />
            Bloco
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modoEdicao ? 'Editar bloco' : 'Novo bloco'}
          </DialogTitle>
          <DialogDescription>
            Trabalho ou qualquer outro compromisso fixo sem pilar próprio —
            padrão semanal recorrente, não uma data única.
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
              name="rotulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rótulo</FormLabel>
                  <FormControl>
                    <Input autoFocus placeholder="Trabalho" {...field} />
                  </FormControl>
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
