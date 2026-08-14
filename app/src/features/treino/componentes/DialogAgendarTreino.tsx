import { useState } from 'react'
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
import { useCriarTreinoAgendado } from '../hooks'
import type { Treino } from '../types'

interface DialogAgendarTreinoProps {
  treinos: readonly Treino[]
  /** Data pré-preenchida, ISO. Sem ela, começa em hoje. */
  dataInicial?: string
  /**
   * Controle externo do aberto/fechado — usado quando este diálogo nasce de
   * dentro de outro (ex.: "Adicionar ao dia" do Calendário). Sem eles, o
   * diálogo controla o próprio estado com o gatilho padrão.
   */
  open?: boolean
  onOpenChange?: (aberto: boolean) => void
  /** `null` esconde o gatilho padrão — quem abre de fora não precisa dele. */
  trigger?: React.ReactNode | null
  onCriado?: () => void
}

/**
 * Agenda um treino numa data concreta (chat 2026-08-14).
 *
 * Antes disto o treino nascia no fluxograma semanal (dia_semana) e se
 * repetia toda semana, sem jeito de marcar só um dia. Aqui cada agendamento é
 * uma linha de `treinos_agendados` com data própria — repetir significa abrir
 * este diálogo de novo, não uma regra recorrente por baixo.
 */
export function DialogAgendarTreino({
  treinos,
  dataInicial,
  open,
  onOpenChange,
  trigger,
  onCriado,
}: DialogAgendarTreinoProps) {
  const [abertoInterno, setAbertoInterno] = useState(false)
  const aberto = open ?? abertoInterno
  const setAberto = onOpenChange ?? setAbertoInterno

  const criar = useCriarTreinoAgendado()

  const [treinoId, setTreinoId] = useState('')
  const [data, setData] = useState(dataInicial ?? paraISO(new Date()))
  const [inicio, setInicio] = useState('18:00')
  const [fim, setFim] = useState('19:30')

  function abrir(novoEstado: boolean) {
    setAberto(novoEstado)
    if (novoEstado) setData(dataInicial ?? paraISO(new Date()))
  }

  async function submeter() {
    if (treinoId === '' || fim <= inicio) return
    await criar.mutateAsync({
      treino_id: treinoId,
      data,
      horario_inicio: inicio,
      horario_fim: fim,
    })
    setTreinoId('')
    setAberto(false)
    onCriado?.()
  }

  return (
    <Dialog open={aberto} onOpenChange={abrir}>
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
          <DialogTitle>Agendar treino</DialogTitle>
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

        <DialogFooter>
          <Button onClick={() => void submeter()} disabled={criar.isPending}>
            {criar.isPending ? 'Salvando…' : 'Agendar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
