import { useEffect, useState, type ReactNode } from 'react'
import { NotebookPen } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAtualizarSessao, useExcluirSessao } from '../hooks'
import { DialogVincularNota } from '@/features/notas/componentes/DialogVincularNota'

interface DialogSessaoRealizadaProps {
  sessao?: {
    id: string
    materia_id: string
    data: string
    hora_inicio?: string | null
    duracao_minutos: number
  } | null
  nomeMateria: string
  open?: boolean
  onOpenChange?: (aberto: boolean) => void
  trigger?: ReactNode | null
}

/**
 * Diálogo de detalhes e edição de uma sessão de estudo realizada.
 *
 * Exibe a matéria, data, horário e duração da sessão. Permite editar os dados,
 * excluir o registro ou acessar/criar a nota de estudo vinculada.
 */
export function DialogSessaoRealizada({
  sessao,
  nomeMateria,
  open,
  onOpenChange,
  trigger,
}: DialogSessaoRealizadaProps) {
  const [abertoInterno, setAbertoInterno] = useState(false)
  const aberto = open ?? abertoInterno
  const setAberto = onOpenChange ?? setAbertoInterno

  const atualizar = useAtualizarSessao()
  const excluir = useExcluirSessao()

  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [duracao, setDuracao] = useState('')

  useEffect(() => {
    if (!aberto || !sessao) return
    setData(sessao.data)
    setHora(sessao.hora_inicio ? sessao.hora_inicio.slice(0, 5) : '')
    setDuracao(String(sessao.duracao_minutos))
  }, [aberto, sessao])

  if (!sessao) return null

  const minutos = Number(duracao)
  const duracaoValida = Number.isInteger(minutos) && minutos > 0
  const pendente = atualizar.isPending || excluir.isPending

  async function salvar() {
    if (!sessao || !duracaoValida) return
    await atualizar.mutateAsync({
      id: sessao.id,
      dados: {
        data,
        hora_inicio: hora === '' ? null : `${hora}:00`,
        duracao_minutos: minutos,
      },
    })
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm" variant="secondary">
              Ver sessão
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sessão de estudo realizada</DialogTitle>
          <DialogDescription>
            {nomeMateria} — registrada no histórico de estudos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sessao-realizada-hora">Hora (opcional)</Label>
              <Input
                id="sessao-realizada-hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sessao-realizada-duracao">Duração (min)</Label>
              <Input
                id="sessao-realizada-duracao"
                type="number"
                min={1}
                step={5}
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
              />
            </div>
          </div>
          {!duracaoValida && (
            <p className="text-destructive text-xs">
              Informe uma duração maior que zero.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            <DialogConfirmarExclusao
              titulo="Remover sessão de estudo"
              mensagem="Este registro de estudo será excluído. Não há como desfazer."
              onConfirmar={async () => {
                await excluir.mutateAsync(sessao.id)
                setAberto(false)
              }}
              pendente={excluir.isPending}
              trigger={
                <Button type="button" variant="outline">
                  Excluir
                </Button>
              }
            />
            <DialogVincularNota
              sessaoId={sessao.id}
              materiaId={sessao.materia_id}
              sessaoData={sessao.data}
              trigger={
                <Button type="button" variant="secondary">
                  <NotebookPen className="size-4" />
                  Anotações
                </Button>
              }
            />
          </div>
          <Button onClick={() => void salvar()} disabled={pendente}>
            {pendente ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
