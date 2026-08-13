import { RotateCcw } from 'lucide-react'
import { CheckDia } from '@/components/CheckDia'
import { Button } from '@/components/ui/button'
import { MenuOcorrencia } from './MenuOcorrencia'
import { useLimparExcecao } from '../hooks'

export interface ItemCheckFluxograma {
  /** Id do registro em `fluxograma_semanal`. */
  fluxogramaId: string
  rotulo: string
  /** Início, em `HH:MM`. */
  horario: string
  /** Fim, em `HH:MM`. Pré-preenche o formulário de remarcação. */
  horarioFim: string
  concluido: boolean
  remarcada: boolean
  /** Cor da matéria, quando o item é aula e a matéria tem uma escolhida. */
  cor?: string
  /**
   * Data que identifica a exceção — a ORIGINAL. Numa ocorrência remarcada é de
   * onde ela saiu, não onde está sendo exibida.
   */
  dataExcecao: string
}

export interface ItemCanceladoFluxograma {
  fluxogramaId: string
  rotulo: string
  horario: string
  data: string
}

interface ChecksFluxogramaProps {
  itens: readonly ItemCheckFluxograma[]
  /** Texto exibido quando o dia não tem nada previsto. */
  vazio: string
  onAlternar: (fluxogramaId: string, concluido: boolean) => void
  /** Ocorrências que o usuário marcou como canceladas nesta data. */
  canceladas?: readonly ItemCanceladoFluxograma[]
}

/**
 * Checks do dia derivados do fluxograma (plano 3.4 e 4.4).
 *
 * Quais itens aparecem é derivado na leitura (resolução 10.5); o estado de
 * concluído vem de `conclusoes_fluxograma` (resolução 10.15); e cada linha traz
 * o menu de exceção pontual (resolução 10.19).
 *
 * As canceladas continuam listadas, riscadas: sumir sem deixar rastro tira o
 * caminho de volta — cancelar por engano deixaria o dia sem a linha e sem como
 * restaurá-la. Aparecer riscada também é mais honesto sobre o que houve no dia.
 */
export function ChecksFluxograma({
  itens,
  vazio,
  onAlternar,
  canceladas = [],
}: ChecksFluxogramaProps) {
  const limpar = useLimparExcecao()

  if (itens.length === 0 && canceladas.length === 0) {
    return <p className="text-muted-foreground text-sm">{vazio}</p>
  }

  return (
    <div className="space-y-0.5">
      <ul className="space-y-0.5">
        {itens.map((item) => (
          <li key={item.fluxogramaId} className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <CheckDia
                id={`check-${item.fluxogramaId}`}
                marcado={item.concluido}
                onAlternar={(marcado) => onAlternar(item.fluxogramaId, marcado)}
                detalhe={item.horario}
                {...(item.remarcada ? { aviso: 'remarcado' } : {})}
                {...(item.cor ? { cor: item.cor } : {})}
              >
                {item.rotulo}
              </CheckDia>
            </div>
            <MenuOcorrencia
              fluxogramaId={item.fluxogramaId}
              data={item.dataExcecao}
              rotulo={item.rotulo}
              horarioInicio={item.horario}
              horarioFim={item.horarioFim}
              remarcada={item.remarcada}
            />
          </li>
        ))}
      </ul>

      {canceladas.length > 0 && (
        <ul className="space-y-0.5">
          {canceladas.map((item) => (
            <li
              key={item.fluxogramaId}
              className="flex items-center gap-1 py-2 pl-2 text-sm"
            >
              <span className="text-muted-foreground min-w-0 flex-1 truncate line-through">
                {item.rotulo}
                <span className="ml-1.5 font-mono text-xs tabular-nums no-underline">
                  {item.horario}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground shrink-0 text-xs"
                disabled={limpar.isPending}
                onClick={() =>
                  limpar.mutate({
                    fluxogramaId: item.fluxogramaId,
                    data: item.data,
                  })
                }
              >
                <RotateCcw className="size-3.5" />
                Restaurar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
