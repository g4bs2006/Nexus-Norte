import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRemarcarOcorrencia } from '../hooks'

interface DialogRemarcarProps {
  aberto: boolean
  onAbertoChange: (aberto: boolean) => void
  fluxogramaId: string
  /** Data original — a que sai do padrão. */
  data: string
  rotulo: string
  /** Horário do padrão, em `HH:MM`, para pré-preencher os campos. */
  horarioInicio: string
  horarioFim: string
}

/**
 * Remarca uma ocorrência do fluxograma para outra data e horário.
 *
 * O horário vem pré-preenchido com o do padrão: remarcar quase sempre é mudar o
 * dia e manter a hora, e deixar os campos vazios obrigaria a redigitar o que já
 * se sabe. Se o usuário não mexer, gravamos nulo em vez do valor repetido — daí
 * a ocorrência herda o horário do padrão, e mudar o padrão depois continua
 * valendo para ela.
 */
export function DialogRemarcar({
  aberto,
  onAbertoChange,
  fluxogramaId,
  data,
  rotulo,
  horarioInicio,
  horarioFim,
}: DialogRemarcarProps) {
  const remarcar = useRemarcarOcorrencia()

  const [novaData, setNovaData] = useState(data)
  const [inicio, setInicio] = useState(horarioInicio)
  const [fim, setFim] = useState(horarioFim)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!aberto) return
    setNovaData(data)
    setInicio(horarioInicio)
    setFim(horarioFim)
    setErro(null)
  }, [aberto, data, horarioInicio, horarioFim])

  const horarioMudou = inicio !== horarioInicio || fim !== horarioFim

  async function submeter() {
    if (novaData === '') {
      setErro('Escolha a nova data.')
      return
    }
    if (horarioMudou && (inicio === '' || fim === '')) {
      setErro('Informe início e fim, ou deixe os dois como estavam.')
      return
    }
    if (horarioMudou && fim <= inicio) {
      setErro('O fim tem de ser depois do início.')
      return
    }
    if (novaData === data && !horarioMudou) {
      setErro('Mude a data ou o horário — assim nada muda.')
      return
    }

    await remarcar.mutateAsync({
      fluxogramaId,
      data,
      novaData,
      // Nulo quando o horário não mudou: a ocorrência segue o padrão
      novoHorarioInicio: horarioMudou ? inicio : null,
      novoHorarioFim: horarioMudou ? fim : null,
    })
    onAbertoChange(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remarcar {rotulo}</DialogTitle>
          <DialogDescription>
            A ocorrência sai desta data e passa para a nova. O padrão semanal
            continua como está.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="remarcar-data">Nova data</Label>
            <Input
              id="remarcar-data"
              type="date"
              value={novaData}
              onChange={(evento) => setNovaData(evento.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="remarcar-inicio">Início</Label>
              <Input
                id="remarcar-inicio"
                type="time"
                value={inicio}
                onChange={(evento) => setInicio(evento.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="remarcar-fim">Fim</Label>
              <Input
                id="remarcar-fim"
                type="time"
                value={fim}
                onChange={(evento) => setFim(evento.target.value)}
              />
            </div>
          </div>

          <p className="text-muted-foreground text-xs">
            {horarioMudou
              ? 'Esta ocorrência guarda o horário próprio.'
              : 'Horário igual ao do padrão — não fica gravado separado.'}
          </p>

          {erro && <p className="text-status-risco text-xs">{erro}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onAbertoChange(false)}
            disabled={remarcar.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={() => void submeter()} disabled={remarcar.isPending}>
            {remarcar.isPending ? 'Salvando…' : 'Remarcar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
