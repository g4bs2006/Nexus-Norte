import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { paraISO } from '@/lib/datas'
import {
  useAtualizarTreinoAgendado,
  useCriarTreinoAgendado,
  useExcluirTreinoAgendado,
} from '../hooks'
import type { Treino } from '../types'

/** O suficiente do agendado para preencher o formulário em modo edição. */
interface AgendadoParaEditar {
  id: string
  treino_id: string
  data: string
  horario_inicio: string
  horario_fim: string
}

interface DialogAgendarTreinoProps {
  treinos: readonly Treino[]
  /** Data pré-preenchida, ISO. Sem ela, começa em hoje. Ignorado em edição. */
  dataInicial?: string
  /** Se passado, o dialog abre em modo de edição — com excluir no rodapé. */
  agendado?: AgendadoParaEditar
  /**
   * Controle externo do aberto/fechado — usado quando este diálogo nasce de
   * dentro de outro (ex.: clique no evento, no Calendário). Sem eles, o
   * diálogo controla o próprio estado com o gatilho padrão.
   */
  open?: boolean
  onOpenChange?: (aberto: boolean) => void
  /** `null` esconde o gatilho padrão — quem abre de fora não precisa dele. */
  trigger?: React.ReactNode | null
  onCriado?: () => void
}

function paraVazio(dataInicial?: string) {
  return {
    treinoId: '',
    data: dataInicial ?? paraISO(new Date()),
    inicio: '18:00',
    fim: '19:30',
  }
}

/**
 * Agenda um treino numa data concreta (chat 2026-08-14), ou edita/exclui um
 * já agendado — mesmo padrão de `DialogEventoLivre` (prop `evento?` liga o
 * modo edição).
 *
 * Antes disto o treino nascia no fluxograma semanal (dia_semana) e se
 * repetia toda semana, sem jeito de marcar só um dia. Aqui cada agendamento é
 * uma linha de `treinos_agendados` com data própria — repetir significa abrir
 * este diálogo de novo, não uma regra recorrente por baixo.
 */
export function DialogAgendarTreino({
  treinos,
  dataInicial,
  agendado,
  open,
  onOpenChange,
  trigger,
  onCriado,
}: DialogAgendarTreinoProps) {
  const modoEdicao = Boolean(agendado)
  const [abertoInterno, setAbertoInterno] = useState(false)
  const aberto = open ?? abertoInterno
  const setAberto = onOpenChange ?? setAbertoInterno

  const criar = useCriarTreinoAgendado()
  const atualizar = useAtualizarTreinoAgendado()
  const excluir = useExcluirTreinoAgendado()

  const [treinoId, setTreinoId] = useState('')
  const [data, setData] = useState(dataInicial ?? paraISO(new Date()))
  const [inicio, setInicio] = useState('18:00')
  const [fim, setFim] = useState('19:30')

  // Preenche do agendado ao abrir em edição; volta ao vazio ao abrir sem um.
  useEffect(() => {
    if (!aberto) return
    if (agendado) {
      setTreinoId(agendado.treino_id)
      setData(agendado.data)
      setInicio(agendado.horario_inicio.slice(0, 5))
      setFim(agendado.horario_fim.slice(0, 5))
    } else {
      const vazio = paraVazio(dataInicial)
      setTreinoId(vazio.treinoId)
      setData(vazio.data)
      setInicio(vazio.inicio)
      setFim(vazio.fim)
    }
  }, [aberto, agendado, dataInicial])

  const pendente = criar.isPending || atualizar.isPending

  async function submeter() {
    if (treinoId === '' || fim <= inicio) return
    if (modoEdicao && agendado) {
      await atualizar.mutateAsync({
        id: agendado.id,
        dados: {
          treino_id: treinoId,
          data,
          horario_inicio: inicio,
          horario_fim: fim,
        },
      })
    } else {
      await criar.mutateAsync({
        treino_id: treinoId,
        data,
        horario_inicio: inicio,
        horario_fim: fim,
      })
    }
    setAberto(false)
    onCriado?.()
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm" variant="secondary" disabled={treinos.length === 0}>
              <Plus className="size-4" />
              Agendar
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modoEdicao ? 'Editar treino agendado' : 'Agendar treino'}</DialogTitle>
          <DialogDescription>
            Marca o treino só nesta data — sem repetir nas semanas seguintes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Treino</Label>
            <Select value={treinoId} onValueChange={setTreinoId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {treinos.map((treino) => (
                  <SelectItem key={treino.id} value={treino.id}>
                    {treino.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="agenda-inicio">Início</Label>
              <Input
                id="agenda-inicio"
                type="time"
                value={inicio}
                onChange={(evento) => setInicio(evento.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agenda-fim">Fim</Label>
              <Input
                id="agenda-fim"
                type="time"
                value={fim}
                onChange={(evento) => setFim(evento.target.value)}
              />
            </div>
          </div>
          {fim <= inicio && (
            <p className="text-destructive text-xs">
              O fim deve ser depois do início.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {modoEdicao && agendado && (
            <DialogConfirmarExclusao
              titulo="Remover treino da agenda"
              mensagem="Some do calendário e da agenda de treino. Não há como desfazer."
              onConfirmar={async () => {
                await excluir.mutateAsync(agendado.id)
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
          <Button onClick={() => void submeter()} disabled={pendente}>
            {pendente ? 'Salvando…' : modoEdicao ? 'Salvar' : 'Agendar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
