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
import { DIAS_SEMANA } from '@/lib/constants'
import { ORDEM_DIAS_SEMANA as ORDEM_DIAS } from '@/lib/fluxograma'
import { useCriarFluxogramaTreino } from '../hooks'
import type { Treino } from '../types'

interface DialogFluxogramaTreinoProps {
  treinos: readonly Treino[]
}

/**
 * Agenda um treino recorrente no fluxograma.
 *
 * O fluxograma é a fonte única do que estava planejado na semana (resolução
 * 10.17) — é ele que alimenta o card "treino de hoje" e o cálculo de frequência.
 */
export function DialogFluxogramaTreino({
  treinos,
}: DialogFluxogramaTreinoProps) {
  const [aberto, setAberto] = useState(false)
  const criar = useCriarFluxogramaTreino()

  const [treinoId, setTreinoId] = useState('')
  const [dia, setDia] = useState('1')
  const [inicio, setInicio] = useState('18:00')
  const [fim, setFim] = useState('19:30')

  async function submeter() {
    if (treinoId === '' || fim <= inicio) return
    await criar.mutateAsync({
      treino_id: treinoId,
      dia_semana: Number(dia),
      horario_inicio: inicio,
      horario_fim: fim,
    })
    setTreinoId('')
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" disabled={treinos.length === 0}>
          <Plus className="size-4" />
          Horário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Treino no fluxograma</DialogTitle>
          <DialogDescription>
            Define o que estava previsto na semana — base do card "treino de
            hoje" e da frequência.
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
            <Label>Dia da semana</Label>
            <Select value={dia} onValueChange={setDia}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDEM_DIAS.map((valor) => (
                  <SelectItem key={valor} value={String(valor)}>
                    {DIAS_SEMANA[valor]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="flx-inicio">Início</Label>
              <Input
                id="flx-inicio"
                type="time"
                value={inicio}
                onChange={(evento) => setInicio(evento.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flx-fim">Fim</Label>
              <Input
                id="flx-fim"
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
            {criar.isPending ? 'Salvando…' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
