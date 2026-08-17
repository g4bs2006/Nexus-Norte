import { SecaoMetasHome } from '@/features/metas/componentes/SecaoMetasHome'

interface SecaoMetasProps {
  hoje: Date
}

export function SecaoMetas({ hoje }: SecaoMetasProps) {
  return <SecaoMetasHome hoje={hoje} />
}
