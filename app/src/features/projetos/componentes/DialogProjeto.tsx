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
import { useCriarProjeto } from '../hooks'
import { ROTULOS_STATUS_PROJETO, type StatusProjeto } from '../types'

const STATUS = Object.keys(ROTULOS_STATUS_PROJETO) as StatusProjeto[]

interface DialogProjetoProps {
  hoje: Date
}

export function DialogProjeto({ hoje }: DialogProjetoProps) {
  const [aberto, setAberto] = useState(false)
  const criar = useCriarProjeto()

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [status, setStatus] = useState<StatusProjeto>('planejamento')
  const [dataInicio, setDataInicio] = useState(paraISO(hoje))
  const [prazo, setPrazo] = useState('')

  const prazoInvalido = prazo !== '' && prazo < dataInicio

  async function submeter() {
    if (nome.trim() === '' || prazoInvalido) return
    await criar.mutateAsync({
      nome: nome.trim(),
      descricao: descricao.trim() === '' ? null : descricao.trim(),
      status,
      data_inicio: dataInicio,
      prazo_alvo: prazo === '' ? null : prazo,
    })
    setNome('')
    setDescricao('')
    setPrazo('')
    setStatus('planejamento')
    setAberto(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Novo projeto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo projeto</DialogTitle>
          <DialogDescription>
            Os marcos e o log de progresso são adicionados na página do projeto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="projeto-nome">Nome</Label>
            <Input
              id="projeto-nome"
              autoFocus
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="projeto-descricao">Descrição</Label>
            <Input
              id="projeto-descricao"
              placeholder="Opcional"
              value={descricao}
              onChange={(evento) => setDescricao(evento.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(valor) => setStatus(valor as StatusProjeto)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS.map((valor) => (
                  <SelectItem key={valor} value={valor}>
                    {ROTULOS_STATUS_PROJETO[valor]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="projeto-inicio">Início</Label>
              <Input
                id="projeto-inicio"
                type="date"
                value={dataInicio}
                onChange={(evento) => setDataInicio(evento.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="projeto-prazo">Prazo alvo</Label>
              <Input
                id="projeto-prazo"
                type="date"
                value={prazo}
                onChange={(evento) => setPrazo(evento.target.value)}
              />
            </div>
          </div>
          {prazoInvalido && (
            <p className="text-destructive text-xs">
              O prazo não pode ser antes do início.
            </p>
          )}
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
