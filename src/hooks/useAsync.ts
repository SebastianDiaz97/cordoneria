import { useCallback, useEffect, useState } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Carga datos de Supabase con estados de carga/error y opción de recargar.
 * `deps` controla cuándo se vuelve a ejecutar el loader.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    loader()
      .then((data) => {
        if (alive) setState({ data, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (alive)
          setState({
            data: null,
            loading: false,
            error:
              error instanceof Error ? error.message : 'Error desconocido',
          })
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    setTick((value) => value + 1)
  }, [])

  return { ...state, reload }
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Ocurrió un error inesperado'
}
