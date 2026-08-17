import type { Meta } from '../types'
import { ItemMetaRow } from './ItemMetaRow'

interface CardMetaProps {
  meta: Meta
  hoje: Date
  onExcluir?: () => void | Promise<void>
  excluindo?: boolean
}

export function CardMeta({ meta, onExcluir }: CardMetaProps) {
  return <ItemMetaRow meta={meta} onExcluir={onExcluir} />
}
