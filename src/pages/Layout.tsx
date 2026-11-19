import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import { cn } from '@/lib/utils'

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <div className='flex h-screen flex-col overflow-hidden bg-background'>
      <Header onToggleMenu={() => setMobileOpen((value) => !value)} />
      <div className='relative flex flex-1 overflow-hidden'>
        <aside className='hidden w-60 shrink-0 border-r border-border bg-surface md:block'>
          <Sidebar />
        </aside>

        {mobileOpen ? (
          <div className='fixed inset-0 z-40 md:hidden'>
            <div
              className='absolute inset-0 bg-[#252b28]/40'
              onClick={() => setMobileOpen(false)}
            />
            <aside className='relative z-10 h-full w-64 max-w-[80%] bg-surface shadow-xl'>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        ) : null}

        <main
          key={location.pathname}
          className={cn('flex-1 overflow-y-auto p-4 md:p-6')}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
