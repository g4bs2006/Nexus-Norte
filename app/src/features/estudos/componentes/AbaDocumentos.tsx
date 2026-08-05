import { useRef, useState } from 'react'
import { Download, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { urlDocumento } from '../api'
import { useEnviarDocumento, useExcluirDocumento } from '../hooks'
import {
  ROTULOS_TIPO_DOCUMENTO,
  type Documento,
  type TipoDocumento,
} from '../types'

const TIPOS = Object.keys(ROTULOS_TIPO_DOCUMENTO) as TipoDocumento[]
const TODOS = 'todos'

interface AbaDocumentosProps {
  materiaId: string
  documentos: readonly Documento[]
}

export function AbaDocumentos({ materiaId, documentos }: AbaDocumentosProps) {
  const enviar = useEnviarDocumento()
  const excluir = useExcluirDocumento()
  const inputArquivo = useRef<HTMLInputElement>(null)

  const [tipo, setTipo] = useState<TipoDocumento>('lista')
  const [filtro, setFiltro] = useState<string>(TODOS)

  const visiveis =
    filtro === TODOS
      ? documentos
      : documentos.filter((documento) => documento.tipo === filtro)

  async function selecionar(arquivo: File | undefined) {
    if (!arquivo) return
    await enviar.mutateAsync({ materiaId, tipo, arquivo })
    // Permite reenviar o mesmo arquivo depois de excluí-lo
    if (inputArquivo.current) inputArquivo.current.value = ''
  }

  /** Bucket privado: gera URL assinada no momento do clique. */
  async function abrir(documento: Documento) {
    try {
      const url = await urlDocumento(documento.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : 'Falha ao abrir')
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo do arquivo</Label>
            <Select
              value={tipo}
              onValueChange={(valor) => setTipo(valor as TipoDocumento)}
            >
              <SelectTrigger size="sm" className="w-[11rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((valor) => (
                  <SelectItem key={valor} value={valor}>
                    {ROTULOS_TIPO_DOCUMENTO[valor]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <input
            ref={inputArquivo}
            type="file"
            className="hidden"
            onChange={(evento) => void selecionar(evento.target.files?.[0])}
          />
          <Button
            size="sm"
            onClick={() => inputArquivo.current?.click()}
            disabled={enviar.isPending}
          >
            <Upload className="size-4" />
            {enviar.isPending ? 'Enviando…' : 'Enviar arquivo'}
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Label className="text-muted-foreground text-xs">Filtrar</Label>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger size="sm" className="w-[11rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os tipos</SelectItem>
            {TIPOS.map((valor) => (
              <SelectItem key={valor} value={valor}>
                {ROTULOS_TIPO_DOCUMENTO[valor]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visiveis.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="text-muted-foreground text-sm">
            {documentos.length === 0
              ? 'Nenhum documento enviado.'
              : 'Nenhum documento deste tipo.'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-border divide-y">
              {visiveis.map((documento) => (
                <li
                  key={documento.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{documento.nome}</p>
                    <p className="text-muted-foreground text-xs">
                      {ROTULOS_TIPO_DOCUMENTO[documento.tipo]}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground size-9 sm:size-7"
                      aria-label={`Abrir ${documento.nome}`}
                      onClick={() => void abrir(documento)}
                    >
                      <Download className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-status-risco size-9 sm:size-7"
                      aria-label={`Excluir ${documento.nome}`}
                      onClick={() =>
                        excluir.mutate({
                          id: documento.id,
                          storagePath: documento.storage_path,
                        })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
