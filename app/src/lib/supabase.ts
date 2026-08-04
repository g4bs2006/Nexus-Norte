import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error(
    'Variáveis de ambiente do Supabase ausentes. Copie .env.example para .env.local e preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.',
  )
}

/**
 * Client do Supabase, tipado pelo schema gerado.
 *
 * Sistema single-user sem autenticação (resolução 10.0): não há sessão para
 * persistir e RLS está desabilitado. O acesso é feito com a publishable key.
 */
export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})
