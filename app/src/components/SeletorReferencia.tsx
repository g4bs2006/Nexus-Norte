import { useEffect, useState } from 'react'
import { useDebounced } from '@/hooks/useDebounced'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

/**
 * Alvo possível de um wikilink.
 *
 * Definida no kernel porque é a moeda da injeção: quem busca é a feature, quem
 * exibe é o editor, e o editor não pode conhecer nota.
 */
export interface Referencia {
  slug: string
  titulo: string
  /** De onde a nota veio — desempata dois títulos parecidos. */
  contexto: string
}

interface SeletorReferenciaProps {
  aberto: boolean
  onAbertoChange: (aberto: boolean) => void
  buscar: (termo: string) => Promise<Referencia[]>
  onEscolher: (referencia: Referencia) => void
}

/**
 * Escolha da nota a linkar, no mesmo `command` que a `PaletaComandos` usa.
 *
 * A busca é servida por `pg_trgm` sobre o título (migration de 14/08), então
 * "seires" acha "Séries de Taylor" — o `[[` tem que tolerar erro de digitação,
 * senão exige lembrar o título exato, que é o mesmo que não ter autocomplete.
 *
 * O filtro do `cmdk` fica desligado (`shouldFilter={false}`): quem ordena por
 * relevância é o banco, e deixar o filtro do cliente por cima descartaria
 * justamente os resultados tolerantes a erro que o trigrama achou.
 */
export function SeletorReferencia({
  aberto,
  onAbertoChange,
  buscar,
  onEscolher,
}: SeletorReferenciaProps) {
  const [termo, setTermo] = useState('')
  const termoDebounced = useDebounced(termo, 150)
  const [resultados, setResultados] = useState<Referencia[]>([])

  useEffect(() => {
    if (!aberto) return

    let cancelado = false
    void buscar(termoDebounced).then((achados) => {
      if (!cancelado) setResultados(achados)
    })
    return () => {
      cancelado = true
    }
  }, [aberto, termoDebounced, buscar])

  /* Termo zerado a cada abertura: a busca anterior não é sugestão da próxima. */
  useEffect(() => {
    if (aberto) setTermo('')
  }, [aberto])

  return (
    <CommandDialog
      open={aberto}
      onOpenChange={onAbertoChange}
      title="Ligar a uma nota"
      description="Busque pelo título da nota a citar."
      shouldFilter={false}
    >
      <CommandInput
        value={termo}
        onValueChange={setTermo}
        placeholder="Título da nota…"
      />
      <CommandList>
        <CommandEmpty>
          Nenhuma nota com esse título. Escreva o nome mesmo assim — o link
          quebrado é onde a próxima nota nasce.
        </CommandEmpty>
        {resultados.length > 0 && (
          <CommandGroup heading="Notas">
            {resultados.map((referencia) => (
              <CommandItem
                key={referencia.slug}
                value={referencia.slug}
                onSelect={() => {
                  onEscolher(referencia)
                  onAbertoChange(false)
                }}
              >
                <span className="truncate">{referencia.titulo}</span>
                <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                  {referencia.contexto}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
