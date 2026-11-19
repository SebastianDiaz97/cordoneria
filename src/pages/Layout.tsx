import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className='flex flex-col overflow-hidden h-screen '>
      <Header />
      <div className='flex overflow-hidden '>
          <Sidebar />
          <div className='overflow-y-auto w-screen p-4'>
              <Outlet />
          </div>
      </div>
    </div>
  )
}
