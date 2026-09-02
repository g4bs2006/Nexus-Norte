import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { DialogConfirmarExclusao } from '@/components/DialogConfirmarExclusao'
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
import { deISO } from '@/lib/datas'
import {
  useAtualizarFluxogramaLivre,
  useCriarFluxogramaLivre,
  useExcluirFluxogramaLivre,
} from '../hooks'
import { schemaBlocoAvulso, type FormularioBlocoAvulso } from '../schemas'
import type { BlocoAvulso } from '../api'

interface DialogBlocoAvulsoProps {
  /** Se passado, o dialog abre em modo de edição — com excluir no rodapé. */
  bloco?: BlocoAvulso
  /**
   * Controle externo do aberto/fechado — usado quando este diálogo nasce de
   * dentro de outro (ex.: clique no evento, no Calendário). Sem eles, o
   * diálogo controla o próprio estado com o gatilho padrão.
   */
  open?: boolean
  onOpenChange?: (aberto: boolean) => void
  /** `null` esconde o gatilho padrão — quem abre de fora não precisa dele. */
  trigger?: React.ReactNode | null
}

function paraVazio(): FormularioBlocoAvulso {
  return { rotulo: '', data: '', horario_inicio: '09:00', horario_fim: '18:00' }
}

/**
 * Bloco de trabalho — ou qualquer outro rótulo livre — numa data concreta
 * (chat 2026-09-02), irmão avulso de `DialogFluxogramaLivre`. Nasce da
 * correção do defeito em que todo bloco criado pelo calendário virava padrão
 * recorrente: quem cria daqui grava com `data` preenchida, e a linha vale só
 * para aquele dia, sem repetir nas semanas seguintes.
 *
 * Mesmo padrão de `DialogAgendarTreino`/`DialogEventoLivre`: edição e exclusão
 * num só diálogo, disparado pelo clique no evento já criado.
 */
export function DialogBlocoAvulso({
  bloco,
  open,
  onOpenChange,
  trigger,
}: DialogBlocoAvulsoProps) {
  const modoEdicao = Boolean(bloco)
  const [abertoInterno, setAbertoInterno] = useState(false)
  const aberto = open ?? abertoInterno
  const setAberto = onOpenChange ?? setAbertoInterno

  const criar = useCriarFluxogramaLivre()
  const atualizar = useAtualizarFluxogramaLivre()
  const excluir = useExcluirFluxogramaLivre()

  const form = useForm<FormularioBlocoAvulso>({
    resolver: zodResolver(schemaBlocoAvulso),
    defaultValues: paraVazio(),
  })

  useEffect(() => {
    if (aberto && bloco) {
      form.reset({
        rotulo: bloco.rotulo,
        data: bloco.data,
        horario_inicio: bloco.horario_inicio.slice(0, 5),
        horario_fim: bloco.horario_fim.slice(0, 5),
      })
    } else if (aberto && !bloco) {
      form.reset(paraVazio())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, bloco])

  const pendente = criar.isPending || atualizar.isPending

  async function submeter(valores: FormularioBlocoAvulso) {
    // dia_semana é NOT NULL na tabela — deriva da própria data para o bloco
    // continuar se agrupando corretamente se um dia virar recorrente (editado
    // para perder a data em outro fluxo futuro).
    const dados = {
      rotulo: valores.rotulo,
      data: valores.data,
      dia_semana: deISO(valores.data).getDay(),
      horario_inicio: valores.horario_inicio,
      horario_fim: valores.horario_fim,
    }
    if (modoEdicao && bloco) {
      await atualizar.mutateAsync({ id: bloco.id, dados })
    } else {
      await criar.mutateAsync(dados)
    }
    form.reset(paraVazio())
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      {trigger !== null && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modoEdicao ? 'Editar bloco' : 'Novo bloco'}</DialogTitle>
          <DialogDescription>
            Vale só para esta data, não toda semana. Para um compromisso fixo
            recorrente, use "Blocos fixos".
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

            <DialogFooter className="gap-2 sm:justify-between">
              {modoEdicao && bloco && (
                <DialogConfirmarExclusao
                  titulo={`Remover ${bloco.rotulo}`}
                  mensagem="Some do calendário. Não há como desfazer."
                  onConfirmar={async () => {
                    await excluir.mutateAsync(bloco.id)
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
