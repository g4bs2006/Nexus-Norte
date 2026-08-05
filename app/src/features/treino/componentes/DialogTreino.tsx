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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useAtualizarTreino,
  useCriarTipoTreino,
  useCriarTreino,
  useTiposTreino,
} from '../hooks'
import type { TreinoComTipo } from '../types'

/** Valor sentinela do Select: `SelectItem` não aceita value vazio. */
const SEM_TIPO = 'sem-tipo'

interface DialogTreinoProps {
  /** Se passado, o dialog abre em modo de edição. */
  treino?: TreinoComTipo
}

/** Cadastro e edição de treino. Os exercícios são adicionados depois, no card do treino. */
export function DialogTreino({ treino }: DialogTreinoProps = {}) {
  const modoEdicao = Boolean(treino)
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [tipoId, setTipoId] = useState<string>(SEM_TIPO)
  const [criandoTipo, setCriandoTipo] = useState(false)
  const [novoTipo, setNovoTipo] = useState('')

  const criar = useCriarTreino()
  const atualizar = useAtualizarTreino()
  const criarTipo = useCriarTipoTreino()
  const tipos = useTiposTreino()

  useEffect(() => {
    if (!aberto) return
    setCriandoTipo(false)
    setNovoTipo('')

    if (treino) {
      setNome(treino.nome)
      setTipoId(treino.tipo_id ?? SEM_TIPO)
    } else {
      setNome('')
      setTipoId(SEM_TIPO)
    }
  }, [aberto, treino])

  const pendente = criar.isPending || atualizar.isPending

  /** Cria o tipo e já seleciona, sem fechar o diálogo do treino. */
  async function criarESelecionarTipo() {
    if (novoTipo.trim() === '') return
    const novo = await criarTipo.mutateAsync({ nome: novoTipo.trim() })
    setTipoId(novo.id)
    setCriandoTipo(false)
    setNovoTipo('')
  }

  async function submeter() {
    if (nome.trim() === '') return
    const dados = {
      nome: nome.trim(),
      tipo_id: tipoId === SEM_TIPO ? null : tipoId,
    }

    if (modoEdicao && treino) {
      await atualizar.mutateAsync({ id: treino.id, dados })
    } else {
      await criar.mutateAsync(dados)
    }
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
          {criandoTipo ? (
            <div className="border-border space-y-3 rounded-md border border-dashed p-3">
              <div className="space-y-1.5">
                <Label htmlFor="novo-tipo">Novo tipo de treino</Label>
                <Input
                  id="novo-tipo"
                  autoFocus
                  placeholder="Ex: Força, Resistência"
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void criarESelecionarTipo()
                    }
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => void criarESelecionarTipo()}
                  disabled={criarTipo.isPending}
                >
                  {criarTipo.isPending ? 'Criando…' : 'Criar e usar'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCriandoTipo(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label>Tipo</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-auto py-0.5 text-xs"
                  onClick={() => setCriandoTipo(true)}
                >
                  <Plus className="size-3" />
                  Novo tipo
                </Button>
              </div>
              <Select value={tipoId} onValueChange={setTipoId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_TIPO}>Sem tipo</SelectItem>
                  {(tipos.data ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
