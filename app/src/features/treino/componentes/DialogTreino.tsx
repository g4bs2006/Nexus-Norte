import { useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCriarTreino, useAtualizarTreino } from '../hooks'
import type { Treino } from '../types'

interface DialogTreinoProps {
  /** Se passado, o dialog abre em modo de edição. */
  treino?: Treino
}

/** Cadastro e edição de treino. Os exercícios são adicionados depois, no card do treino. */
export function DialogTreino({ treino }: DialogTreinoProps = {}) {
  const modoEdicao = Boolean(treino)
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('')
  const criar = useCriarTreino()
  const atualizar = useAtualizarTreino()

  useEffect(() => {
    if (aberto && treino) {
      setNome(treino.nome)
      setTipo(treino.tipo ?? '')
    } else if (aberto && !treino) {
      setNome('')
      setTipo('')
    }
  }, [aberto, treino])

  const pendente = criar.isPending || atualizar.isPending

  async function submeter() {
    if (nome.trim() === '') return
    const dados = {
      nome: nome.trim(),
      tipo: tipo.trim() === '' ? null : tipo.trim(),
    }

    if (modoEdicao && treino) {
      await atualizar.mutateAsync({ id: treino.id, dados })
    } else {
      await criar.mutateAsync(dados)
    }
    setNome('')
    setTipo('')
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {modoEdicao ? (
          <Button size="sm" variant="ghost" className="text-xs">
            <Pencil className="size-3.5" />
            Editar
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            Novo treino
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modoEdicao ? 'Editar treino' : 'Novo treino'}
          </DialogTitle>
          <DialogDescription>
            {modoEdicao
              ? 'Atualize nome e tipo do treino.'
              : 'Depois de criar, adicione os exercícios no card do treino.'}
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
          <Button onClick={() => void submeter()} disabled={pendente}>
            {pendente ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
