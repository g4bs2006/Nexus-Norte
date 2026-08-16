import { useEffect, useState } from 'react'
import { Check, Plus } from 'lucide-react'
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
  useAtualizarSessaoPlanejada,
  useCriarSessaoPlanejada,
  useExcluirSessaoPlanejada,
  useMarcarSessaoComoFeita,
} from '../hooks'
import type { Materia } from '../types'

/** O suficiente da planejada pra preencher o formulário em modo edição. */
interface PlanejadaParaEditar {
  id: string
  materia_id: string
  data: string
  hora_inicio: string | null
  duracao_minutos: number
}

interface DialogAgendarSessaoProps {
  materias: readonly Materia[]
  /** Data pré-preenchida, ISO. Sem ela, começa em hoje. Ignorado em edição. */
  dataInicial?: string
  /** Se passado, o dialog abre em modo de edição — com excluir no rodapé. */
  planejada?: PlanejadaParaEditar
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
    materiaId: '',
    data: dataInicial ?? paraISO(new Date()),
    hora: '',
    duracao: '60',
  }
}

/**
 * Agenda uma sessão de estudo numa data concreta (chat 2026-08-14), ou
 * edita/exclui uma já agendada — mesmo padrão de `DialogAgendarTreino` (prop
 * `planejada?` liga o modo edição).
 *
 * "Agendar" aqui é intenção ("vou estudar Cálculo terça, 19h, 90 min"), não
 * fato — a sessão de verdade (o que aconteceu) continua sendo registrada em
 * `AbaSessoes`, sem repetição nenhuma por trás: cada agendamento é uma linha
 * de `sessoes_estudo_planejadas` com data própria.
 */
export function DialogAgendarSessao({
  materias,
  dataInicial,
  planejada,
  open,
  onOpenChange,
  trigger,
  onCriado,
}: DialogAgendarSessaoProps) {
  const modoEdicao = Boolean(planejada)
  const [abertoInterno, setAbertoInterno] = useState(false)
  const aberto = open ?? abertoInterno
  const setAberto = onOpenChange ?? setAbertoInterno

  const criar = useCriarSessaoPlanejada()
  const atualizar = useAtualizarSessaoPlanejada()
  const excluir = useExcluirSessaoPlanejada()
  const marcarComoFeita = useMarcarSessaoComoFeita()

  const [materiaId, setMateriaId] = useState('')
  const [data, setData] = useState(dataInicial ?? paraISO(new Date()))
  const [hora, setHora] = useState('')
  const [duracao, setDuracao] = useState('60')

  // Preenche da planejada ao abrir em edição; volta ao vazio ao abrir sem uma.
  useEffect(() => {
    if (!aberto) return
    if (planejada) {
      setMateriaId(planejada.materia_id)
      setData(planejada.data)
      setHora(planejada.hora_inicio ? planejada.hora_inicio.slice(0, 5) : '')
      setDuracao(String(planejada.duracao_minutos))
    } else {
      const vazio = paraVazio(dataInicial)
      setMateriaId(vazio.materiaId)
      setData(vazio.data)
      setHora(vazio.hora)
      setDuracao(vazio.duracao)
    }
  }, [aberto, planejada, dataInicial])

  const pendente = criar.isPending || atualizar.isPending
  const minutos = Number(duracao)
  const duracaoValida = Number.isInteger(minutos) && minutos > 0

  async function submeter() {
    if (materiaId === '' || !duracaoValida) return
    const dados = {
      materia_id: materiaId,
      data,
      hora_inicio: hora === '' ? null : `${hora}:00`,
      duracao_minutos: minutos,
    }
    if (modoEdicao && planejada) {
      await atualizar.mutateAsync({ id: planejada.id, dados })
    } else {
      await criar.mutateAsync(dados)
    }
    setAberto(false)
    onCriado?.()
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm" variant="secondary" disabled={materias.length === 0}>
              <Plus className="size-4" />
              Agendar sessão
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modoEdicao ? 'Editar sessão planejada' : 'Agendar sessão de estudo'}
          </DialogTitle>
          <DialogDescription>
            Marca a intenção nesta data — sem repetir nas semanas seguintes.
            Registrar o que de fato aconteceu continua em Estudos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Matéria</Label>
            <Select value={materiaId} onValueChange={setMateriaId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {materias.map((materia) => (
                  <SelectItem key={materia.id} value={materia.id}>
                    {materia.nome}
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
              <Label htmlFor="sessao-planejada-hora">Hora (opcional)</Label>
              <Input
                id="sessao-planejada-hora"
                type="time"
                value={hora}
                onChange={(evento) => setHora(evento.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sessao-planejada-duracao">Duração (min)</Label>
              <Input
                id="sessao-planejada-duracao"
                type="number"
                min={1}
                step={5}
                value={duracao}
                onChange={(evento) => setDuracao(evento.target.value)}
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
          {modoEdicao && planejada && (
            <div className="flex items-center gap-2">
              <DialogConfirmarExclusao
                titulo="Remover sessão da agenda"
                mensagem="Some do calendário e da lista de planejadas. Não há como desfazer."
                onConfirmar={async () => {
                  await excluir.mutateAsync(planejada.id)
                  setAberto(false)
                }}
                pendente={excluir.isPending}
                trigger={
                  <Button type="button" variant="outline">
                    Excluir
                  </Button>
                }
              />
              <Button
                type="button"
                variant="secondary"
                disabled={marcarComoFeita.isPending}
                onClick={async () => {
                  await marcarComoFeita.mutateAsync(planejada)
                  setAberto(false)
                }}
              >
                <Check className="size-4" />
                Marcar como feita
              </Button>
            </div>
          )}
          <Button onClick={() => void submeter()} disabled={pendente}>
            {pendente ? 'Salvando…' : modoEdicao ? 'Salvar' : 'Agendar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
