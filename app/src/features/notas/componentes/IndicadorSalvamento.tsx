import { Check, CloudOff, Loader2 } from 'lucide-react'
import type { EstadoSalvamento } from '../useAutosave'

interface IndicadorSalvamentoProps {
  estado: EstadoSalvamento
}

/**
 * Diz em que pé está o salvamento, sem interromper.
 *
 * Substitui o botão "Salvar" — no Notion ninguém salva, e um botão desabilitado
 * dizendo "Salvo" ocupa espaço para não fazer nada. Mas some-lo por completo
 * seria pior: num app sem histórico de versões, "meu texto está gravado?" é
 * pergunta legítima, e quem escreve merece a resposta à vista.
 *
 * `pendente` e `salvando` mostram a mesma coisa de propósito. A diferença entre
 * "vou gravar em um segundo" e "estou gravando" não muda nada para quem lê, e
 * piscar entre dois rótulos a cada pausa de digitação seria ruído.
 *
 * `erro` é o único que grita: é o único estado em que há algo a fazer.
 */
export function IndicadorSalvamento({ estado }: IndicadorSalvamentoProps) {
  if (estado === 'erro') {
    return (
      <span className="text-status-risco flex items-center gap-1 text-xs">
        <CloudOff aria-hidden className="size-3.5" />
        Não consegui salvar
      </span>
    )
  }

  if (estado === 'salvo') {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        <Check aria-hidden className="size-3.5" />
        Salvo
      </span>
    )
  }

  return (
    <span className="text-muted-foreground flex items-center gap-1 text-xs">
      <Loader2 aria-hidden className="size-3.5 animate-spin" />
      Salvando
    </span>
  )
}
