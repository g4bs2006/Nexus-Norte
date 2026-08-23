import { useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CampoDecimal } from '@/components/CampoDecimal'
import { useVincularAvaliacaoAtividade } from '../hooks'
import type { Atividade, Avaliacao } from '../types'

interface DialogVincularAvaliacaoProps {
  atividade: Atividade
  avaliacoes: readonly Avaliacao[]
}

/** Peso padrão da avaliação criada — mesmo default da coluna. */
const PESO_PADRAO = 1

/**
 * Liga a entrega a uma avaliação, por dois caminhos: criar uma nova a partir
 * dela, ou apontar para uma que já existe.
 *
 * A avaliação criada nasce **sem nota**, de propósito: quem manda na média é a
 * aba Avaliações, e lançar nota aqui faria a entrega parecer dona de um número
 * que não é dela.
 */
export function DialogVincularAvaliacao({
  atividade,
  avaliacoes,
}: DialogVincularAvaliacaoProps) {
  const [aberto, setAberto] = useState(false)
  const [modo, setModo] = useState<'criar' | 'existente'>('criar')
  const [peso, setPeso] = useState<number>(PESO_PADRAO)
  const [avaliacaoId, setAvaliacaoId] = useState('')
  const vincular = useVincularAvaliacaoAtividade()

  // Só faz sentido oferecer "usar existente" se houver alguma ainda solta.
  const disponiveis = avaliacoes.filter(
    (avaliacao) => avaliacao.materia_id === atividade.materia_id,
  )

  useEffect(() => {
    if (!aberto) return
    setModo(disponiveis.length > 0 ? 'existente' : 'criar')
    setPeso(PESO_PADRAO)
    setAvaliacaoId('')
  }, [aberto, disponiveis.length])

  async function confirmar() {
    await vincular.mutateAsync({
      atividade,
      alvo:
        modo === 'existente'
          ? { avaliacaoId }
          : { criar: { peso: Number.isFinite(peso) ? peso : PESO_PADRAO } },
    })
    setAberto(false)
  }

  const podeConfirmar = modo === 'criar' || avaliacaoId !== ''

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-7 gap-1 px-1.5 text-xs"
        >
          <Link2 className="size-3" />
          <span>Vincular avaliação…</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Vincular avaliação</DialogTitle>
          <DialogDescription className="text-xs">
            A nota de "{atividade.titulo}" vai morar numa avaliação — é ela que
            entra na média da matéria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="flex gap-1">
            {disponiveis.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant={modo === 'existente' ? 'secondary' : 'ghost'}
                className="text-xs"
                onClick={() => setModo('existente')}
              >
                Usar existente
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant={modo === 'criar' ? 'secondary' : 'ghost'}
              className="text-xs"
              onClick={() => setModo('criar')}
            >
              Criar nova
            </Button>
          </div>

          {modo === 'existente' ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Avaliação desta matéria</Label>
              <Select value={avaliacaoId} onValueChange={setAvaliacaoId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Escolha a avaliação" />
                </SelectTrigger>
                <SelectContent>
                  {disponiveis.map((avaliacao) => (
                    <SelectItem key={avaliacao.id} value={avaliacao.id}>
                      {avaliacao.nome}
                      {avaliacao.nota === null
                        ? ' (sem nota)'
                        : ` — ${avaliacao.nota}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs leading-relaxed">
                Cria uma avaliação chamada{' '}
                <strong className="text-foreground">{atividade.titulo}</strong>,
                com a data da entrega e <strong>sem nota</strong> — a nota é
                lançada na aba Avaliações.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="vincular-peso">
                  Peso na média
                </Label>
                <CampoDecimal
                  id="vincular-peso"
                  className="h-8 text-xs"
                  valor={peso}
                  onValorChange={setPeso}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAberto(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!podeConfirmar || vincular.isPending}
            onClick={() => void confirmar()}
          >
            {vincular.isPending ? 'Vinculando…' : 'Vincular'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
