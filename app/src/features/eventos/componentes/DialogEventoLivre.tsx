import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus } from 'lucide-react'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  useAtualizarEventoLivre,
  useCriarEventoLivre,
  useExcluirEventoLivre,
} from '../hooks'
import { schemaEventoLivre, type FormularioEventoLivre } from '../schemas'
import type { EventoLivre } from '../api'

interface DialogEventoLivreProps {
  /** Se passado, o dialog abre em modo de edição. */
  evento?: EventoLivre
  /** Data sugerida ao abrir vazio (ex.: clicado no dia do calendário). */
  dataSugerida?: string
  /** Elemento que dispara a abertura. Se omitido, usa um botão padrão. */
  trigger?: React.ReactNode
}

function paraVazio(dataSugerida?: string): FormularioEventoLivre {
  return {
    titulo: '',
    descricao: '',
    data: dataSugerida ?? '',
    diaInteiro: false,
    hora_inicio: '',
    hora_fim: '',
  }
}

/**
 * Evento avulso sem pilar — dentista, reunião, o que não é rotina de nenhum
 * dos outros módulos (resolução "criar eventos", ago/2026). Mesmo padrão de
 * `DialogFluxogramaLivre`, mas data única em vez de recorrência semanal, e
 * com a opção de "dia inteiro" (sem horário) que um compromisso avulso pode
 * precisar e um bloco fixo de agenda não.
 */
export function DialogEventoLivre({
  evento,
  dataSugerida,
  trigger,
}: DialogEventoLivreProps) {
  const modoEdicao = Boolean(evento)
  const [aberto, setAberto] = useState(false)
  const criar = useCriarEventoLivre()
  const atualizar = useAtualizarEventoLivre()
  const excluir = useExcluirEventoLivre()

  const vazio = paraVazio(dataSugerida)

  const form = useForm<FormularioEventoLivre>({
    resolver: zodResolver(schemaEventoLivre),
    defaultValues: vazio,
  })

  useEffect(() => {
    if (aberto && evento) {
      form.reset({
        titulo: evento.titulo,
        descricao: evento.descricao ?? '',
        data: evento.data,
        diaInteiro: !evento.hora_inicio,
        hora_inicio: evento.hora_inicio?.slice(0, 5) ?? '',
        hora_fim: evento.hora_fim?.slice(0, 5) ?? '',
      })
    } else if (aberto && !evento) {
      form.reset(vazio)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, evento])

  const diaInteiro = form.watch('diaInteiro')
  const pendente = criar.isPending || atualizar.isPending

  async function submeter(valores: FormularioEventoLivre) {
    const dados = {
      titulo: valores.titulo,
      descricao: valores.descricao.length > 0 ? valores.descricao : null,
      data: valores.data,
      hora_inicio: valores.diaInteiro ? null : valores.hora_inicio,
      hora_fim: valores.diaInteiro ? null : valores.hora_fim,
    }
    if (modoEdicao && evento) {
      await atualizar.mutateAsync({ id: evento.id, dados })
    } else {
      await criar.mutateAsync(dados)
    }
    form.reset(vazio)
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ??
          (modoEdicao ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-11 shrink-0 sm:size-7"
              aria-label="Editar evento"
            >
              <Pencil className="size-3.5" />
            </Button>
          ) : (
            <Button size="sm" variant="secondary">
              <Plus className="size-4" />
              Evento
            </Button>
          ))}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modoEdicao ? 'Editar evento' : 'Novo evento'}
          </DialogTitle>
          <DialogDescription>
            Compromisso avulso sem pilar próprio — dentista, reunião, o que
            for. Data única, não uma rotina semanal.
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
                    <Input autoFocus placeholder="Dentista" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="diaInteiro"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checado) =>
                        field.onChange(checado === true)
                      }
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Dia inteiro</FormLabel>
                </FormItem>
              )}
            />

            {!diaInteiro && (
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="hora_inicio"
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
                  name="hora_fim"
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
            )}

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:justify-between">
              {modoEdicao && evento && (
                <DialogConfirmarExclusao
                  titulo="Excluir evento"
                  mensagem={`"${evento.titulo}" some do calendário. Não há como desfazer.`}
                  onConfirmar={async () => {
                    await excluir.mutateAsync(evento.id)
                    setAberto(false)
                  }}
                  pendente={excluir.isPending}
                  trigger={
                    <Button type="button" variant="outline">
                      Excluir
                    </Button>
                  }
                />
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
