import { beforeEach, expect, it, vi } from 'vitest'
import { Schema } from '@milkdown/kit/prose/model'
import { EditorState, type Plugin } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'

const contexto = vi.hoisted(() => ({ pronto: false }))
vi.mock('@milkdown/kit/utils', () => ({
  $prose: (criar: (ctx: unknown) => unknown) => criar({
    get: () => contexto.pronto
      ? (doc: { textContent: string }) => doc.textContent
      : () => { throw new Error('Should not call a context out of the plugin.') },
  }),
}))
import { criarPersistenciaImediata } from './persistenciaImediata'

beforeEach(() => { contexto.pronto = false })
it('resolve o serializer após a inicialização e continua entregando alterações', () => {
  const receber = vi.fn()
  // Mesmo momento do $prose real: schema pronto, serializer ainda não.
  const plugin = criarPersistenciaImediata(receber) as unknown as Plugin
  contexto.pronto = true
  const schema = new Schema({ nodes: {
    doc: { content: 'paragraph+' }, paragraph: { content: 'text*' }, text: {},
  } })
  let anterior = EditorState.create({ schema })
  const view = { state: anterior } as EditorView
  const ciclo = plugin.spec.view!(view)
  for (const texto of ['primeiro', ' segundo', ' /', ' //alpha']) {
    view.state = anterior.apply(anterior.tr.insertText(texto))
    ciclo.update!(view, anterior)
    anterior = view.state
  }
  expect(receber).toHaveBeenCalledTimes(4)
  expect(receber).toHaveBeenLastCalledWith('primeiro segundo / //alpha')
})
