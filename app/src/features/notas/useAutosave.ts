import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from './api'
import { grafoMudou } from './grafo'
import { chaves } from './hooks'

/** O que o indicador mostra. */
export type EstadoSalvamento = 'salvo' | 'pendente' | 'salvando' | 'erro'

const ESPERA_MS = 1200

/**
 * Autosave da nota: escreve e salva sozinho, como no Notion.
 *
 * ## As duas rotas, e por que existem
 *
 * `salvarNota` re-deriva o grafo inteiro — ~6 idas ao servidor: carrega slugs,
 * grava, apaga e reinsere arestas, apaga e reinsere tópicos, resolve
 * pendentes. Chamar aquilo a cada pausa de digitação seria insustentável, e
 * desnecessário: digitar dentro de um parágrafo não mexe em aresta nenhuma.
 *
 * Então antes de gravar se pergunta a `grafoMudou`, que é puro e barato:
 *
 * - conjunto de links e tópicos igual → `salvarConteudo`, uma consulta
 * - conjunto mudou → `salvarNota`, o caminho completo
 *
 * A invariante do spec de 14/08 fica intacta: o grafo é re-derivado **sempre**
 * que o conjunto muda. O que deixou de acontecer é re-derivar quando nada mudou.
 *
 * ## Por que fala com a API direto, e não pelos hooks de mutation
 *
 * Esta é a correção de um laço infinito real, e vale registrar para não voltar.
 *
 * `useMutation` devolve um objeto NOVO a cada render. Com ele nas dependências
 * do efeito — que foi como o linter ficou satisfeito —, cada gravação virava:
 * salva → `isPending` muda → re-render → mutation com outra identidade →
 * efeito re-roda → agenda outra gravação. O indicador nunca saía de "salvando"
 * porque de fato nunca parava de salvar.
 *
 * Chamando `api` direto, as dependências são só dados. E há um segundo ganho:
 * `useSalvarNota` dá um toast a cada sucesso, o que faria escrever `[[` disparar
 * "Nota salva" no meio da frase.
 *
 * ## O que este hook não faz
 *
 * Não salva o título. Renomear muda o slug e reescreve o texto de outras notas
 * — caro demais para acontecer a cada tecla. Quem cuida disso é a página, no
 * blur do campo.
 */
export function useAutosave(
  notaId: string | undefined,
  materiaId: string | undefined,
  titulo: string | undefined,
  conteudo: string,
): EstadoSalvamento {
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState<EstadoSalvamento>('salvo')

  /*
   * O que já está no servidor. Serve a dois julgamentos: se há algo a gravar,
   * e — comparado ao texto novo — se o grafo mudou.
   */
  const gravado = useRef<string | null>(null)
  /** Qual nota o `gravado` descreve. Trocar de nota tem que zerar a base. */
  const notaDoGravado = useRef<string | null>(null)

  useEffect(() => {
    if (!notaId || !materiaId || titulo === undefined) return

    /*
     * Primeira passada nesta nota: registra a base e não grava nada. Sem isto,
     * abrir uma nota já dispararia um salvamento do texto que acabou de chegar.
     */
    if (notaDoGravado.current !== notaId) {
      notaDoGravado.current = notaId
      gravado.current = conteudo
      setEstado('salvo')
      return
    }

    if (gravado.current === conteudo) return

    setEstado('pendente')

    /*
     * O timer reinicia a cada tecla, então só grava quando se para de escrever.
     * O cleanup cancelando é o que faz isso funcionar — sem ele, digitar vinte
     * caracteres agendaria vinte gravações.
     */
    const temporizador = setTimeout(() => {
      const anterior = gravado.current ?? ''
      const atual = conteudo
      const mudouOGrafo = grafoMudou(anterior, atual)
      setEstado('salvando')

      const promessa = mudouOGrafo
        ? api.salvarNota({ id: notaId, materiaId, titulo, conteudo: atual })
        : api.salvarConteudo(notaId, atual)

      void promessa
        .then(() => {
          gravado.current = atual

          /*
           * Só invalida quando o grafo mudou, e só o que depende dele: backlink
           * e tópico da OUTRA ponta. Invalidar a cada gravação refetcharia esta
           * nota e devolveria o texto do servidor por cima do que se escreve.
           */
          if (mudouOGrafo) {
            void queryClient.invalidateQueries({ queryKey: chaves.topicos() })
            void queryClient.invalidateQueries({
              queryKey: chaves.quebrados(notaId),
            })
          }

          /*
           * Só volta para "salvo" se nada foi digitado enquanto gravava. Sem
           * esta comparação, o indicador diria "salvo" com texto pendente na
           * tela — a mentira mais cara que um autosave pode contar.
           */
          setEstado((anteriorEstado) =>
            anteriorEstado === 'salvando' ? 'salvo' : anteriorEstado,
          )
        })
        .catch((erro: Error) => {
          setEstado('erro')
          toast.error(erro.message)
        })
    }, ESPERA_MS)

    return () => clearTimeout(temporizador)
    /*
     * `queryClient` é estável (vem do contexto) e `api` é módulo. As
     * dependências são só dados — foi ter posto objetos de mutation aqui que
     * criou o laço infinito.
     */
  }, [conteudo, notaId, materiaId, titulo, queryClient])

  return estado
}
