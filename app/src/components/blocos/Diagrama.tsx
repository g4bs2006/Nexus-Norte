import { useEffect, useId, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { resolverTema, useUIStore } from '@/stores/ui'

interface DiagramaProps {
  /** Corpo da cerca ```mermaid, sem os delimitadores. */
  codigo: string
}

/**
 * Diagrama Mermaid — cerca ```` ```mermaid ````.
 *
 * Primeiro dos quatro blocos por decisão do spec (14/08, seção 7): é o mais
 * simples, e serve para validar o mecanismo de bloco customizado antes de
 * mermaid, plot, desenho e geometria disputarem o mesmo caminho.
 *
 * Cobre máquina de estados e fluxo de processo, que é o que aparece em
 * Engenharia — e por ser texto, versiona junto com a nota e é rápido de
 * escrever.
 */
export default function Diagrama({ codigo }: DiagramaProps) {
  const tema = resolverTema(useUIStore((estado) => estado.tema))
  const [svg, setSvg] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  /* `useId` dá o id único que o mermaid exige para não colidir entre diagramas. */
  const id = useId().replace(/:/g, '')
  const vivo = useRef(true)

  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [])

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      // Acompanha o tema do app: um diagrama claro no modo escuro é ilegível.
      theme: tema === 'escuro' ? 'dark' : 'default',
      securityLevel: 'strict',
      fontFamily: 'inherit',
    })

    mermaid
      .render(`mermaid-${id}`, codigo)
      .then((resultado) => {
        if (!vivo.current) return
        setSvg(resultado.svg)
        setErro(null)
      })
      .catch((falha: Error) => {
        if (!vivo.current) return
        /*
         * Diagrama meio escrito é o estado normal de quem está escrevendo. O
         * erro fica no lugar do diagrama, e a nota continua legível — o mesmo
         * princípio do `throwOnError: false` do KaTeX.
         */
        setErro(falha.message)
        setSvg('')
      })
  }, [codigo, tema, id])

  if (erro !== null) {
    return (
      <pre className="border-status-risco/40 text-muted-foreground my-2 overflow-x-auto rounded-md border border-dashed p-3 text-xs">
        {codigo}
        {'\n\n'}
        {erro}
      </pre>
    )
  }

  return (
    <div
      className="my-2 flex justify-center overflow-x-auto"
      // SVG produzido pelo mermaid com securityLevel 'strict', que já remove
      // script e handler inline do que vem do texto da nota.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
