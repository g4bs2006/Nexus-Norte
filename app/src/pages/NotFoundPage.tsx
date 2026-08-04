import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <>
      <PageHeader
        titulo="Página não encontrada"
        descricao="A rota acessada não existe."
      />
      <Button asChild variant="secondary">
        <Link to="/">Voltar para a Home</Link>
      </Button>
    </>
  )
}
