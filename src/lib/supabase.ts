import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY',
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

type ResponseLike = PromiseLike<{
  data: unknown
  error: { message: string } | null
}>

/** Ejecuta una consulta de Supabase y devuelve los datos o lanza el error real. */
export async function unwrap<T>(request: ResponseLike): Promise<T> {
  const { data, error } = await request
  if (error) throw new Error(error.message)
  return data as T
}
