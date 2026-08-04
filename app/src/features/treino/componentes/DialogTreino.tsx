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
import { useCriarTreino } from '../hooks'

/** Cadastro de treino. Os exercícios são adicionados depois, no card do treino. */
export function DialogTreino() {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('')
  const criar = useCriarTreino()

  async function submeter() {
    if (nome.trim() === '') return
    await criar.mutateAsync({
      nome: nome.trim(),
      tipo: tipo.trim() === '' ? null : tipo.trim(),
    })
    setNome('')
    setTipo('')
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Novo treino
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo treino</DialogTitle>
          <DialogDescription>
            Depois de criar, adicione os exercícios no card do treino.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="treino-nome">Nome</Label>
            <Input
              id="treino-nome"
              autoFocus
              placeholder="Ex: Treino A — Peito e tríceps"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="treino-tipo">Tipo</Label>
            <Input
              id="treino-tipo"
              placeholder="Opcional — ex: hipertrofia"
              value={tipo}
              onChange={(evento) => setTipo(evento.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => void submeter()} disabled={criar.isPending}>
            {criar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
