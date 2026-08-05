import { useState } from 'react'
import { CalendarClock, EllipsisVertical, Undo2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCancelarOcorrencia, useLimparExcecao } from '../hooks'
import { DialogRemarcar } from './DialogRemarcar'

interface MenuOcorrenciaProps {
  fluxogramaId: string
  /**
   * Data da exceção — sempre a ORIGINAL. Numa ocorrência remarcada é a data de
   * onde ela saiu, não onde está sendo exibida: é essa que identifica a linha
   * em `excecoes_fluxograma`.
   */
  data: string
  rotulo: string
  horarioInicio: string
  horarioFim: string
  /** True quando esta ocorrência já é resultado de uma remarcação. */
  remarcada: boolean
}

/**
 * Ações pontuais sobre uma ocorrência do fluxograma (resolução 10.19).
 *
 * O menu existe para separar "não vai acontecer nesta data" de "não acontece
 * mais": editar o padrão semanal por causa de uma viagem apagaria o horário de
 * todas as semanas seguintes. Fica ao lado do check porque é ali que se percebe
 * que o dia não vai sair como planejado.
 */
export function MenuOcorrencia({
  fluxogramaId,
  data,
  rotulo,
  horarioInicio,
  horarioFim,
  remarcada,
}: MenuOcorrenciaProps) {
  const [remarcando, setRemarcando] = useState(false)
  const cancelar = useCancelarOcorrencia()
  const limpar = useLimparExcecao()

  const pendente = cancelar.isPending || limpar.isPending

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground size-9 shrink-0 sm:size-7"
            aria-label={`Opções de ${rotulo}`}
            disabled={pendente}
          >
            <EllipsisVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRemarcando(true)}>
            <CalendarClock className="size-4" />
            {remarcada ? 'Remarcar de novo' : 'Remarcar…'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => cancelar.mutate({ fluxogramaId, data })}
          >
            <X className="size-4" />
            Não vai acontecer
          </DropdownMenuItem>

          {remarcada && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => limpar.mutate({ fluxogramaId, data })}
              >
                <Undo2 className="size-4" />
                Voltar ao padrão
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogRemarcar
        aberto={remarcando}
        onAbertoChange={setRemarcando}
        fluxogramaId={fluxogramaId}
        data={data}
        rotulo={rotulo}
        horarioInicio={horarioInicio}
        horarioFim={horarioFim}
      />
    </>
  )
}
