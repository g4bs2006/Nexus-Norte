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
import { useCriarExercicio } from '../hooks'

interface DialogExercicioProps {
  treinoId: string
  treinoNome: string
}

export function DialogExercicio({ treinoId, treinoNome }: DialogExercicioProps) {
  const [aberto, setAberto] = useState(false)
  const criar = useCriarExercicio()

  const [nome, setNome] = useState('')
  const [grupo, setGrupo] = useState('')
  const [series, setSeries] = useState('3')
  const [reps, setReps] = useState('')
  const [carga, setCarga] = useState('')
  const [descanso, setDescanso] = useState('')

  function numeroOuNulo(valor: string): number | null {
    const numero = Number(valor)
    return valor.trim() !== '' && Number.isFinite(numero) ? numero : null
  }

  async function submeter() {
    const seriesNumero = Number(series)
    if (nome.trim() === '' || !Number.isInteger(seriesNumero) || seriesNumero <= 0) {
      return
    }

    await criar.mutateAsync({
      treino_id: treinoId,
      nome: nome.trim(),
      // grupo_muscular alimenta volume_grupo_muscular (resolução 10.1)
      grupo_muscular: grupo.trim() === '' ? null : grupo.trim().toLowerCase(),
      series: seriesNumero,
      reps_alvo: numeroOuNulo(reps),
      carga_alvo: numeroOuNulo(carga),
      descanso_segundos: numeroOuNulo(descanso),
    })

    setNome('')
    setGrupo('')
    setSeries('3')
    setReps('')
    setCarga('')
    setDescanso('')
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-xs">
          <Plus className="size-3.5" />
          Exercício
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exercício em {treinoNome}</DialogTitle>
          <DialogDescription>
            Carga e reps alvo pré-preenchem o registro da execução.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ex-nome">Nome</Label>
              <Input
                id="ex-nome"
                autoFocus
                placeholder="Ex: Supino reto"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-grupo">Grupo muscular</Label>
              <Input
                id="ex-grupo"
                placeholder="Ex: peito"
                value={grupo}
                onChange={(evento) => setGrupo(evento.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ex-series">Séries</Label>
              <Input
                id="ex-series"
                type="number"
                min="1"
                step="1"
                className="tabular-nums"
                value={series}
                onChange={(evento) => setSeries(evento.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-reps">Reps</Label>
              <Input
                id="ex-reps"
                type="number"
                min="1"
                step="1"
                placeholder="—"
                className="tabular-nums"
                value={reps}
                onChange={(evento) => setReps(evento.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-carga">Carga</Label>
              <Input
                id="ex-carga"
                type="number"
                min="0"
                step="0.5"
                placeholder="—"
                className="tabular-nums"
                value={carga}
                onChange={(evento) => setCarga(evento.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-descanso">Descanso (s)</Label>
              <Input
                id="ex-descanso"
                type="number"
                min="0"
                step="15"
                placeholder="—"
                className="tabular-nums"
                value={descanso}
                onChange={(evento) => setDescanso(evento.target.value)}
              />
            </div>
          </div>
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
