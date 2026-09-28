import { describe, expect, it, vi } from 'vitest'
import { Schema } from '@milkdown/kit/prose/model'
import { EditorState } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'
import { criarPluginPersistencia } from './persistenciaImediata'

const schema = new Schema({ nodes: {
  doc: { content: 'paragraph+' }, paragraph: { content: 'text*' }, text: {},
} })
const estado = () => EditorState.create({ schema })

describe('entrega imediata do editor', () => {
  it('entrega a última tecla antes de qualquer timer ou desmontagem', () => {
    const receber = vi.fn()
    const plugin = criarPluginPersistencia((doc) => doc.textContent, receber)
    const anterior = estado()
    const view = { state: anterior.apply(anterior.tr.insertText('Última tecla')) } as EditorView
    const ciclo = plugin.spec.view!(view)
    ciclo.update!(view, anterior)
    expect(receber).toHaveBeenCalledExactlyOnceWith('Última tecla')
  })
  it('persiste transações fora do histórico, usadas por inserções assíncronas', () => {
    const receber = vi.fn()
    const plugin = criarPluginPersistencia((doc) => doc.textContent, receber)
    const anterior = estado()
    const view = { state: anterior.apply(anterior.tr.insertText('Imagem').setMeta('addToHistory', false)) } as EditorView
    plugin.spec.view!(view).update!(view, anterior)
    expect(receber).toHaveBeenCalledExactlyOnceWith('Imagem')
  })
  it('abrir a nota ou mover a seleção não regrava o documento', () => {
    const receber = vi.fn()
    const serializar = vi.fn((doc) => doc.textContent)
    const plugin = criarPluginPersistencia(serializar, receber)
    const anterior = estado()
    const view = { state: anterior } as EditorView
    plugin.spec.view!(view).update!(view, anterior)
    expect(serializar).not.toHaveBeenCalled()
    expect(receber).not.toHaveBeenCalled()
  })
})
