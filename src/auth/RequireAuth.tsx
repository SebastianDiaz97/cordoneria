import { Navigate } from 'react-router-dom'
import { LogOut, ShieldAlert } from 'lucide-react'
import { useAuth } from './useAuth'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/States'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, profileError, signOut } = useAuth()

  if (loading) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center gap-3 text-sm text-text-secondary'>
        <Spinner />
        Verificando sesión…
      </div>
    )
  }

  if (!session) return <Navigate to='/login' replace />

  if (profileError || !profile) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background p-4'>
        <div className='w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-soft'>
          <ShieldAlert className='mx-auto h-10 w-10 text-warning' />
          <h1 className='mt-3 text-lg font-semibold'>Perfil no disponible</h1>
          <p className='mt-2 text-sm text-text-secondary'>
            {profileError ??
              'Tu usuario no tiene un perfil asociado. Pide a un administrador que lo cree y active.'}
          </p>
          <Button className='mt-5' variant='outline' onClick={() => signOut()}>
            <LogOut className='h-4 w-4' /> Cerrar sesión
          </Button>
        </div>
      </div>
    )
  }

  if (!profile.is_active) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background p-4'>
        <div className='w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-soft'>
          <ShieldAlert className='mx-auto h-10 w-10 text-danger' />
          <h1 className='mt-3 text-lg font-semibold'>Usuario inactivo</h1>
          <p className='mt-2 text-sm text-text-secondary'>
            Tu cuenta existe pero aún no ha sido activada por un administrador.
            Contacta al encargado del negocio para que habilite tu acceso.
          </p>
          <Button className='mt-5' variant='outline' onClick={() => signOut()}>
            <LogOut className='h-4 w-4' /> Cerrar sesión
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
