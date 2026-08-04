import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Atalhos de teclado globais.
 *
 * Convenções:
 * - `Ctrl/⌘ K` abre a paleta de comando.
 * - `G` seguido de uma letra navega ("go to"), no padrão de GitHub e Linear.
 * - `?` abre a lista de atalhos.
 *
 * Teclas simples só disparam quando o foco NÃO está em campo de texto e nenhum
 * modificador está pressionado — do contrário, digitar "grande" numa descrição
 * de projeto navegaria para outra página no meio da frase.
 */

/** Janela para completar a sequência `G` + letra. */
const JANELA_SEQUENCIA_MS = 1200

const ROTA_POR_TECLA: Record<string, string> = {
  h: '/',
  f: '/financeiro',
  e: '/estudos',
  t: '/treino',
  p: '/projetos',
  c: '/calendario',
}

/** True quando o foco está em algo que recebe digitação. */
function digitando(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false
  if (alvo.isContentEditable) return true
  const tag = alvo.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export interface AcoesAtalhos {
  abrirPaleta: () => void
  abrirAjuda: () => void
}

export function useAtalhos({ abrirPaleta, abrirAjuda }: AcoesAtalhos): void {
  const navegar = useNavigate()

  // Guardado em ref para não recriar o listener a cada render
  const acoes = useRef({ abrirPaleta, abrirAjuda })
  acoes.current = { abrirPaleta, abrirAjuda }

  const aguardandoG = useRef(false)
  const timerG = useRef<number | undefined>(undefined)

  useEffect(() => {
    function limparSequencia() {
      aguardandoG.current = false
      if (timerG.current !== undefined) {
        window.clearTimeout(timerG.current)
        timerG.current = undefined
      }
    }

    function aoTeclar(evento: KeyboardEvent) {
      const tecla = evento.key.toLowerCase()

      // Ctrl/⌘ K funciona mesmo com foco em campo: é como se sai de qualquer
      // lugar para buscar.
      if (tecla === 'k' && (evento.metaKey || evento.ctrlKey)) {
        evento.preventDefault()
        limparSequencia()
        acoes.current.abrirPaleta()
        return
      }

      if (digitando(evento.target)) return
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return

      // Segundo passo de "G então tecla"
      if (aguardandoG.current) {
        const rota = ROTA_POR_TECLA[tecla]
        limparSequencia()
        if (rota) {
          evento.preventDefault()
          navegar(rota)
        }
        return
      }

      if (tecla === 'g') {
        aguardandoG.current = true
        // Expira sozinho: um "g" solto não deve capturar a próxima tecla
        // pressionada minutos depois.
        timerG.current = window.setTimeout(limparSequencia, JANELA_SEQUENCIA_MS)
        return
      }

      if (evento.key === '?') {
        evento.preventDefault()
        acoes.current.abrirAjuda()
      }
    }

    window.addEventListener('keydown', aoTeclar)
    return () => {
      window.removeEventListener('keydown', aoTeclar)
      limparSequencia()
    }
  }, [navegar])
}
