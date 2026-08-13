import { useRemarcarOcorrencia } from '@/features/fluxograma/hooks'
import {
  useAtualizarAvaliacao,
  useAtualizarSessao,
} from '@/features/estudos/hooks'
import { useAtualizarEventoLivre } from '@/features/eventos/hooks'
import { useAtualizarMarco } from '@/features/projetos/hooks'
import { idRealEntidade, type EventoCalendario } from '../eventos'

/**
 * Despacho de "mover evento arrastado" por tipo (spec 2026-08-13, seção 2).
 *
 * Cada tipo tem entidade dona e mutation própria — todas já existem e já
 * invalidam `['calendario']`, então este hook não grava nada, só decide qual
 * mutation chamar. Mesmo padrão de `DialogCriarNoDia.tsx`, que já importa
 * estas quatro features de dentro de `features/calendario`.
 *
 * Eventos sem `movimento` (conta, sono, o rastro de remarcação, treino
 * realizado) nunca chegam aqui: `GradeMes` os marca `editable: false` antes
 * do FullCalendar emitir `eventDrop`.
 */
export function useMoverEvento() {
  const remarcarOcorrencia = useRemarcarOcorrencia()
  const atualizarSessao = useAtualizarSessao()
  const atualizarAvaliacao = useAtualizarAvaliacao()
  const atualizarEventoLivre = useAtualizarEventoLivre()
  const atualizarMarco = useAtualizarMarco()

  const pendente =
    remarcarOcorrencia.isPending ||
    atualizarSessao.isPending ||
    atualizarAvaliacao.isPending ||
    atualizarEventoLivre.isPending ||
    atualizarMarco.isPending

  async function mover(
    evento: EventoCalendario,
    novaData: string,
    novoInicio: string | null,
    novoFim: string | null,
  ): Promise<void> {
    switch (evento.tipo) {
      case 'aula':
      case 'treino':
      case 'trabalho':
        // `origemId` é o id da regra do fluxograma; a data de origem é a do
        // próprio evento antes do arrasto, não `novaData`.
        await remarcarOcorrencia.mutateAsync({
          fluxogramaId: evento.origemId as string,
          data: evento.inicio.slice(0, 10),
          novaData,
          novoHorarioInicio: novoInicio,
          novoHorarioFim: novoFim,
        })
        return
      case 'estudo':
        await atualizarSessao.mutateAsync({
          id: idRealEntidade(evento),
          dados: { data: novaData, hora_inicio: novoInicio },
        })
        return
      case 'evento':
        await atualizarEventoLivre.mutateAsync({
          id: idRealEntidade(evento),
          dados: {
            data: novaData,
            hora_inicio: novoInicio,
            hora_fim: novoFim,
          },
        })
        return
      case 'marco':
        await atualizarMarco.mutateAsync({
          id: idRealEntidade(evento),
          dados: { data_prevista: novaData },
        })
        return
      case 'prova':
        await atualizarAvaliacao.mutateAsync({
          id: idRealEntidade(evento),
          dados: { data: novaData },
        })
        return
      default:
        // conta, sono, remarcado-na-origem, treino realizado — `GradeMes` já
        // não deveria emitir arrasto para estes; chegar aqui é bug de fiação.
        throw new Error(`Tipo "${evento.tipo}" não é arrastável`)
    }
  }

  return { mover, pendente }
}
