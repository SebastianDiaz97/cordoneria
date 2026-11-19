import {
  ChartNoAxesCombinedIcon,
  HomeIcon,
  Package,
  Scissors,
  Settings2,
  ShoppingCart,
  Users2Icon,
  Wallet2,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const sections: {
  title: string
  items: { to: string; label: string; icon: React.ElementType }[]
}[] = [
  {
    title: 'General',
    items: [
      { to: '/', label: 'Inicio', icon: HomeIcon },
      { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { to: '/inventario', label: 'Inventario', icon: Package },
      { to: '/arreglos', label: 'Arreglos', icon: Scissors },
      { to: '/clientes', label: 'Clientes', icon: Users2Icon },
      { to: '/caja', label: 'Caja', icon: Wallet2 },
    ],
  },
  {
    title: 'Análisis',
    items: [
      { to: '/informes', label: 'Informes', icon: ChartNoAxesCombinedIcon },
      { to: '/configuracion', label: 'Configuración', icon: Settings2 },
    ],
  },
]

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className='flex h-full w-full flex-col gap-1 overflow-y-auto px-3 py-4'>
      {sections.map((section) => (
        <div key={section.title} className='mb-2'>
          <h3 className='px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-secondary'>
            {section.title}
          </h3>
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-text-secondary transition-colors hover:bg-muted hover:text-primary',
                  isActive && 'bg-primary/10 font-medium text-primary',
                )
              }
            >
              <item.icon className='h-[18px] w-[18px]' />
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}
