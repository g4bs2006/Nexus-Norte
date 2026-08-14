import { useEffect, useRef, useState } from 'react'
import { grafoMudou } from './grafo'
import { useSalvarConteudo, useSalvarNota } from './hooks'

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
 * ## Por que os parâmetros são soltos, e não um objeto
 *
 * Um objeto montado no JSX de quem chama muda de identidade a cada render, e o
 * efeito reagendaria o timer sem parar — o autosave nunca dispararia. Com
 * primitivos essa armadilha não existe.
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
  const salvarConteudo = useSalvarConteudo()
  const salvarCompleto = useSalvarNota()
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
      setEstado('salvando')

      const promessa = grafoMudou(anterior, atual)
        ? salvarCompleto.mutateAsync({
            id: notaId,
            materiaId,
            titulo,
            conteudo: atual,
          })
        : salvarConteudo.mutateAsync({ id: notaId, conteudo: atual })

      void promessa
        .then(() => {
          gravado.current = atual
          /*
           * Só volta para "salvo" se nada foi digitado enquanto gravava. Sem
           * esta comparação, o indicador diria "salvo" com texto pendente na
           * tela — a mentira mais cara que um autosave pode contar.
           */
          setEstado((anteriorEstado) =>
            anteriorEstado === 'salvando' ? 'salvo' : anteriorEstado,
          )
        })
        .catch(() => setEstado('erro'))
    }, ESPERA_MS)

    return () => clearTimeout(temporizador)
  }, [
    conteudo,
    notaId,
    materiaId,
    titulo,
    salvarConteudo,
    salvarCompleto,
  ])

  return estado
}
