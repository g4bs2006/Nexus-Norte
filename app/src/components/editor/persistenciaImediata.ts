import { serializerCtx } from '@milkdown/kit/core'
import { Plugin } from '@milkdown/kit/prose/state'
import type { Node } from '@milkdown/kit/prose/model'
import { $prose } from '@milkdown/kit/utils'

/** O listener padrão adia 200 ms e cancela o último texto ao desmontar. */
export function criarPersistenciaImediata(aoMudar: (markdown: string) => void) {
  // $prose espera o schema, mas o serializer ainda pode ser o placeholder
  // que lança ctxCallOutOfScope. Resolva-o quando houver uma edição real.
  return $prose((ctx) => criarPluginPersistencia((doc) => ctx.get(serializerCtx)(doc), aoMudar))
}

export function criarPluginPersistencia(serializar: (doc: Node) => string, aoMudar: (markdown: string) => void) {
  return new Plugin({
    view: () => ({
      update: (view, anterior) => {
        if (!view.state.doc.eq(anterior.doc)) {
          aoMudar(serializar(view.state.doc))
        }
      },
    }),
  })
}
