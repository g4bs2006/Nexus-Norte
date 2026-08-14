import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEspiada, useSalvarNota } from '../hooks'

/** Onde o cartão aparece, em coordenadas de viewport. */
interface Alvo {
  slug: string
  esquerda: number
  topo: number
  base: number
}

interface PeekNotaProps {
  /**
   * A matéria onde uma nota faltante nasceria.
   *
   * Sem ela o cartão ainda espia, mas não oferece criar — criar exige um dono,
   * e inventar um seria pior que não oferecer.
   */
  materiaId?: string
}

const ATRASO_MS = 350
const LARGURA = 320

/**
 * O cartão que aparece ao passar o mouse num `[[wikilink]]`.
 *
 * **É a assinatura deste spec, e a ousadia foi gasta aqui.** Não compete com o
 * Check do dia, que é a assinatura da Home: aquilo é toque, isto é leitura.
 *
 * O que ele resolve: hoje um link só diz para onde vai, e descobrir o que há do
 * outro lado custa uma navegação e uma volta. Num texto com seis citações, isso
 * é seis idas e vindas para decidir qual interessa.
 *
 * E o caso mais importante é o do link **que ainda não existe**. O spec de
 * 14/08 diz que o link quebrado "é onde a próxima nota nasce" — hoje essa frase
 * é verdadeira no banco e mentira na tela, porque criar exige sair da página,
 * achar a matéria e voltar. Aqui a nota nasce sem sair do lugar.
 *
 * Escuta o documento inteiro em vez de receber props de cada link: os links do
 * editor são DOM do ProseMirror, e os da leitura são componentes React. Um
 * listener em `mouseover` alcança os dois sem que nenhum dos lados saiba deste
 * arquivo.
 */
export function PeekNota({ materiaId }: PeekNotaProps) {
  const [alvo, setAlvo] = useState<Alvo | null>(null)
  const espiada = useEspiada(alvo?.slug ?? null)
  const salvar = useSalvarNota()
  const navigate = useNavigate()

  const temporizador = useRef<number | null>(null)
  const sobreCartao = useRef(false)

  useEffect(() => {
    function cancelar() {
      if (temporizador.current !== null) {
        window.clearTimeout(temporizador.current)
        temporizador.current = null
      }
    }

    function aoEntrar(evento: MouseEvent) {
      const elemento = (evento.target as HTMLElement | null)?.closest?.(
        '[data-wikilink]',
      )
      if (!(elemento instanceof HTMLElement)) return

      const slug = elemento.dataset.wikilink
      if (!slug) return

      cancelar()
      /*
       * O atraso é o que separa "espiar" de "atrapalhar". Sem ele, passar o
       * mouse pelo texto a caminho de outra coisa abriria cartões o tempo todo.
       */
      temporizador.current = window.setTimeout(() => {
        const caixa = elemento.getBoundingClientRect()
        setAlvo({
          slug,
          esquerda: Math.min(caixa.left, window.innerWidth - LARGURA - 16),
          topo: caixa.top,
          base: caixa.bottom,
        })
      }, ATRASO_MS)
    }

    function aoSair(evento: MouseEvent) {
      const elemento = (evento.target as HTMLElement | null)?.closest?.(
        '[data-wikilink]',
      )
      if (!elemento) return
      cancelar()
      /*
       * Some com folga: fechar no instante em que o mouse sai do link tornaria
       * impossível alcançar o botão de criar, que fica dentro do cartão.
       */
      window.setTimeout(() => {
        if (!sobreCartao.current) setAlvo(null)
      }, 200)
    }

    document.addEventListener('mouseover', aoEntrar)
    document.addEventListener('mouseout', aoSair)
    return () => {
      cancelar()
      document.removeEventListener('mouseover', aoEntrar)
      document.removeEventListener('mouseout', aoSair)
    }
  }, [])

  if (!alvo) return null

  const nota = espiada.data
  const paraCima = window.innerHeight - alvo.base < 200

  async function criar() {
    if (!materiaId || !alvo) return
    const criada = await salvar.mutateAsync({
      materiaId,
      // O slug vem do título, então o título vem do slug: é o melhor palpite,
      // e renomear depois propaga sozinho.
      titulo: alvo.slug.replace(/-/g, ' '),
      conteudo: '',
    })
    setAlvo(null)
    navigate(`/notas/${criada.slug}`)
  }

  return (
    <div
      className="bg-popover border-border fixed z-50 rounded-md border p-3 shadow-md"
      style={{
        left: alvo.esquerda,
        width: LARGURA,
        ...(paraCima
          ? { bottom: window.innerHeight - alvo.topo + 6 }
          : { top: alvo.base + 6 }),
      }}
      onMouseEnter={() => {
        sobreCartao.current = true
      }}
      onMouseLeave={() => {
        sobreCartao.current = false
        setAlvo(null)
      }}
    >
      {espiada.isPending ? (
        <p className="text-muted-foreground text-xs">Carregando…</p>
      ) : nota ? (
        <>
          <p className="text-sm font-medium">{nota.titulo}</p>
          <p className="text-muted-foreground text-[11px]">
            {nota.materia_nome}
          </p>
          {nota.resumo === '' ? (
            <p className="text-muted-foreground/70 mt-2 text-xs italic">
              Sem conteúdo ainda.
            </p>
          ) : (
            <p className="text-muted-foreground mt-2 line-clamp-4 text-xs">
              {nota.resumo}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm font-medium">{alvo.slug.replace(/-/g, ' ')}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Esta nota ainda não existe. É aqui que ela nasce.
          </p>
          {materiaId && (
            <Button
              type="button"
              size="sm"
              className="mt-3 w-full"
              disabled={salvar.isPending}
              onClick={() => void criar()}
            >
              <FilePlus2 className="size-4" />
              {salvar.isPending ? 'Criando…' : 'Criar e escrever'}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
