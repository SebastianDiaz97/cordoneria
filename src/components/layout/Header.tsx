import { LogOut, Menu, ScissorsIcon } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export default function Header({ onToggleMenu }: { onToggleMenu?: () => void }) {
  const { profile, isAdmin, signOut } = useAuth()

  return (
    <header className='flex shrink-0 items-center justify-between gap-3 bg-primary px-4 py-3 text-white'>
      <div className='flex items-center gap-2'>
        <Button
          variant='ghost'
          size='icon'
          className='text-white hover:bg-white/10 hover:text-white md:hidden'
          onClick={onToggleMenu}
          aria-label='Abrir menú'
        >
          <Menu className='h-5 w-5' />
        </Button>
        <ScissorsIcon size={22} />
        <div className='leading-tight'>
          <h1 className='text-white'>Cordonería</h1>
          <p className='text-[11px] text-white/60'>Gestión del negocio</p>
        </div>
      </div>

      <div className='flex items-center gap-3'>
        <div className='hidden text-right sm:block'>
          <p className='text-sm font-medium text-white'>
            {profile?.full_name || 'Usuario'}
          </p>
          <p className='text-[11px] text-white/60'>
            {isAdmin ? 'Administrador' : 'Empleado'}
          </p>
        </div>
        <Badge tone={isAdmin ? 'gold' : 'neutral'} className='hidden sm:inline-flex'>
          {isAdmin ? 'Admin' : 'Empleado'}
        </Badge>
        <Button
          variant='ghost'
          size='icon'
          className='text-white hover:bg-white/10 hover:text-white'
          onClick={() => signOut()}
          title='Cerrar sesión'
        >
          <LogOut className='h-4 w-4' />
        </Button>
      </div>
    </header>
  )
}
