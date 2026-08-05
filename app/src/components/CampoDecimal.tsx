import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { formatarDecimal, parseDecimal } from '@/lib/numeros'

/** Só o que pode compor um decimal digitado: dígitos, separador e sinal. */
const PERMITIDOS = /[^\d.,-]/g

interface CampoDecimalProps
  extends Omit<
    ComponentProps<'input'>,
    'value' | 'onChange' | 'type' | 'inputMode'
  > {
  /** Valor guardado. `null`/`undefined`/`NaN` = campo vazio. */
  valor: number | null | undefined
  /** Recebe `NaN` quando o campo está vazio ou o texto não dá número. */
  onValorChange: (valor: number) => void
}

/**
 * Campo de número decimal que aceita a vírgula do teclado brasileiro.
 *
 * **Por que não é `type="number"`.** Para um `<input type="number">` a vírgula é
 * caractere inválido: o navegador descarta a entrada e `.value` vira `''`. No
 * celular, onde o separador do teclado numérico *é* a vírgula, digitar 87,5
 * resultava em campo vazio para o formulário — que então reprovava com "Informe um
 * valor" tendo o número na tela. `type="text"` com `inputMode="decimal"` mantém o
 * teclado numérico e deixa a vírgula chegar até `parseDecimal`.
 *
 * O que se perde é o spinner do desktop, e ele não faz falta: ninguém ajusta o
 * valor de uma despesa de centavo em centavo pela setinha.
 *
 * O texto digitado é guardado como texto. Sem isso, "12," passaria por número e
 * voltaria como "12", apagando a vírgula debaixo do dedo a cada tecla.
 */
export function CampoDecimal({
  valor,
  onValorChange,
  ...props
}: CampoDecimalProps) {
  const [texto, setTexto] = useState(() => formatarDecimal(valor))

  // O texto é a fonte enquanto o campo está sendo digitado; o valor de fora só
  // reassume quando ele passa a discordar do que está escrito.
  const textoRef = useRef(texto)
  textoRef.current = texto

  useEffect(() => {
    const escrito = parseDecimal(textoRef.current)
    const vazio = valor === null || valor === undefined || Number.isNaN(valor)
    const jaConfere = Number.isNaN(escrito) ? vazio : escrito === valor
    // Comparar pelo número, não pelo texto: digitando "12," o pai já tem 12, e
    // uma comparação de texto reescreveria o campo como "12" no meio da digitação.
    if (!jaConfere) setTexto(formatarDecimal(valor))
  }, [valor])

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={texto}
      onChange={(evento) => {
        const limpo = evento.target.value.replace(PERMITIDOS, '')
        setTexto(limpo)
        onValorChange(parseDecimal(limpo))
      }}
      {...props}
    />
  )
}
