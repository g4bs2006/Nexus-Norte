import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { carregarParaExportar } from '../api'
import { montarArquivos } from '../exportacao'

/**
 * Baixa a base de notas como `.zip` (spec 14/08, seção 10).
 *
 * **É a única rede de segurança contra perda de dado que o sistema tem.** Não
 * há autenticação nem backup (resolução 10.0), então um `.zip` de `.md`
 * legíveis é o que faz cinco anos de curso sobreviverem ao Nexus, ao Supabase
 * e a uma troca de editor.
 *
 * O `fflate` entra por `import()` dinâmico: quem nunca exporta não baixa um
 * compactador junto da página.
 */
export function BotaoExportar() {
  const [gerando, setGerando] = useState(false)

  async function exportar() {
    setGerando(true)
    try {
      const { notas, desenhos } = await carregarParaExportar()
      const arquivos = montarArquivos(notas, desenhos)

      if (arquivos.length === 0) {
        toast.info('Não há nota nenhuma para exportar ainda.')
        return
      }

      const { zipSync, strToU8 } = await import('fflate')
      const entradas: Record<string, Uint8Array> = {}
      for (const arquivo of arquivos) {
        entradas[arquivo.caminho] = strToU8(arquivo.texto)
      }

      baixar(
        // `zipSync` e não `zip`: numa base de uma pessoa o dump é pequeno, e
        // a versão assíncrona pediria um worker para valer a pena.
        new Blob([zipSync(entradas) as BlobPart], { type: 'application/zip' }),
        `notas-${new Date().toISOString().slice(0, 10)}.zip`,
      )
      toast.success(`${notas.length} notas exportadas`)
    } catch (falha) {
      toast.error(
        falha instanceof Error ? falha.message : 'Não consegui exportar',
      )
    } finally {
      setGerando(false)
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={gerando}
      onClick={() => void exportar()}
    >
      <Download className="size-4" />
      {gerando ? 'Preparando…' : 'Exportar'}
    </Button>
  )
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  link.click()
  // Sem o revoke o blob fica na memória até a aba fechar, e um dump de notas
  // com desenhos não é pequeno.
  URL.revokeObjectURL(url)
}
