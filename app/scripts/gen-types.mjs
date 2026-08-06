// Gera src/types/database.ts a partir do schema do Supabase.
//
// Existe porque a CLI do Supabase emite o arquivo sem o cabeçalho de convenção
// e o redirecionamento simples (`supabase gen types > arquivo`) tinha dois
// problemas: o cabeçalho precisava ser recolocado à mão a cada regeneração, e
// o `>` truncava o destino antes de a CLI rodar — uma falha de rede deixava
// database.ts vazio.

import { execFileSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ID_PROJETO = 'sqxudasfvxmdfqjtdpmx'
const DESTINO = 'src/types/database.ts'

// O bin da CLI é um .js, então roda direto no node. Chamar via `npx` quebraria
// no Windows: desde o CVE-2024-27980 o Node recusa spawnar .cmd sem shell.
const CLI = fileURLToPath(new URL('../node_modules/supabase/dist/supabase.js', import.meta.url))

const CABECALHO = `// Gerado automaticamente a partir do schema do Supabase.
// Regenerar com: npm run types:gen
// NÃO editar à mão. Tipos de domínio narrowed (uniões de literais para colunas
// text com CHECK) ficam em src/features/*/types.ts.
`

if (!existsSync(CLI)) {
  throw new Error('CLI do Supabase não encontrada — rode npm install.')
}

// Só escreve depois de a CLI devolver o schema inteiro: se ela falhar, o
// execFileSync lança e o database.ts atual fica intacto.
const tipos = execFileSync(
  process.execPath,
  [CLI, 'gen', 'types', 'typescript', '--project-id', ID_PROJETO],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
)

if (!tipos.includes('export type Json')) {
  throw new Error(`Saída inesperada da CLI do Supabase — ${DESTINO} não foi alterado.`)
}

writeFileSync(DESTINO, `${CABECALHO}\n${tipos}`)
console.log(`${DESTINO} regenerado com o cabeçalho de convenção.`)
