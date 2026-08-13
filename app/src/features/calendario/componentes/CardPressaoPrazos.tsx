import { useMemo } from 'react'
import { addDays } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { paraISO } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { formatarCarga } from '../carga'
import { cargaPorDia } from '../carga'
import { construirEventos } from '../eventos'
import { useFontesCalendario } from '../hooks'
import { alocarSugestao, pressaoDosPrazos, type SugestaoAlocacao } from '../planejador'
import { useMetas } from '@/features/metas/hooks'
import { deISO } from '@/lib/datas'
import { format } from 'date-fns'

const HORIZONTE_DIAS = 30

/**
 * Pressão até o prazo (resolução 10.48.4) — cruza prazo, rotina e sono, os
 * três já existentes no sistema e que nunca tinham se falado.
 *
 * Busca independente do resto da página: a agenda mostra a semana ou o mês
 * visível, mas uma prova daqui a três semanas precisa da folga entre agora e
 * ela, não só do que está na tela.
 *
 * Meta e progresso vêm de `metas` (tipo `numerica`, vinculada à matéria) —
 * o sistema não tem uma meta semanal recorrente estruturada, então a meta
 * usada aqui é a mesma que a página de Metas já mostra. Sem meta cadastrada,
 * o cartão mostra só a folga — não inventa um alvo.
 */
export function CardPressaoPrazos({ hoje }: { hoje: string }) {
  const janela = useMemo(
    () => ({ de: hoje, ate: paraISO(addDays(new Date(hoje), HORIZONTE_DIAS)) }),
    [hoje],
  )

  const { fontes, carga } = useFontesCalendario(janela.de, janela.ate, {
    comCarga: true,
  })
  const metas = useMetas()

  const pressoes = useMemo(() => {
    const eventos = construirEventos(fontes, janela)
    const dias = cargaPorDia(
      eventos,
      janela,
      new Date(hoje),
      fontes.planejamentoSono,
      carga.sonoRealizado,
      carga.conclusoes,
    )

    const metaPorMateria = new Map<string, number>()
    for (const meta of metas.data ?? []) {
      if (meta.tipo === 'numerica' && meta.materia_id && meta.valor_alvo) {
        metaPorMateria.set(meta.materia_id, meta.valor_alvo)
      }
    }

    const estudadoPorMateria = new Map<string, number>()
    for (const sessao of fontes.sessoesEstudo) {
      estudadoPorMateria.set(
        sessao.materia_id,
        (estudadoPorMateria.get(sessao.materia_id) ?? 0) + sessao.duracao_minutos,
      )
    }

    const lista = pressaoDosPrazos(
      fontes.avaliacoes.filter((a) => a.data !== null && a.data <= janela.ate),
      hoje,
      dias,
      metaPorMateria,
      estudadoPorMateria,
    )

    /*
     * Sugestão de alocação (10.48.5) para cada prazo com meta, na mesma
     * ordem cronológica em que `pressaoDosPrazos` já devolve — é isso que
     * garante que a prova mais próxima reserva o slot primeiro, e a
     * seguinte não disputa o mesmo dia.
     */
    const comprometido = new Map<string, number>()
    const comSugestao = lista.map((pressao) => {
      if (pressao.minutosMetaRestante === undefined) {
        return { pressao, sugestao: [] as SugestaoAlocacao[] }
      }
      const diasAteAVespera = dias.filter(
        (dia) => dia.data >= hoje && dia.data < pressao.data,
      )
      const sugestao = alocarSugestao(
        pressao.minutosMetaRestante,
        diasAteAVespera,
        comprometido,
      )
      for (const bloco of sugestao) {
        comprometido.set(bloco.data, (comprometido.get(bloco.data) ?? 0) + bloco.minutos)
      }
      return { pressao, sugestao }
    })

    return comSugestao
  }, [fontes, carga, metas.data, janela, hoje])

  if (pressoes.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pressão até o prazo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {pressoes.map(({ pressao, sugestao }) => (
          <Link
            key={pressao.avaliacaoId}
            to={`/estudos/${pressao.materiaId}`}
            className="hover:bg-accent/50 flex items-start gap-2 rounded-md p-1.5 text-sm"
          >
            {pressao.status === 'risco' ? (
              <AlertTriangle className="text-status-risco mt-0.5 size-4 shrink-0" />
            ) : (
              /* Sem risco, o lugar do ícone marca de que matéria é a prova —
                 a lista mistura matérias e só o texto as separava. */
              <span
                aria-hidden
                className="mt-1.5 size-2 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    fontes.corPorMateria?.get(pressao.materiaId) ??
                    'var(--estudos)',
                }}
              />
            )}
            <div className="min-w-0">
              <p className="truncate">
                <strong>{pressao.nome}</strong> em {pressao.diasRestantes}{' '}
                {pressao.diasRestantes === 1 ? 'dia' : 'dias'}
              </p>
              <p
                className={cn(
                  'text-muted-foreground text-xs',
                  pressao.status === 'risco' && 'text-status-risco',
                )}
              >
                Você tem {formatarCarga(pressao.minutosLivresAte)} livres até lá
                {pressao.minutosMetaRestante !== undefined &&
                  ` · meta: ${formatarCarga(pressao.minutosMetaRestante)} restantes`}
              </p>
              {/* Alocação sugerida (10.48.5) — propõe, não agenda */}
              {sugestao.length > 0 && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Sugestão:{' '}
                  {sugestao
                    .map(
                      (bloco) =>
                        `${format(deISO(bloco.data), 'EEE')} ${formatarCarga(bloco.minutos)}`,
                    )
                    .join(', ')}
                </p>
              )}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
