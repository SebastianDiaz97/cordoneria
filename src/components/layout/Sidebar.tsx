import {
  ChartNoAxesCombinedIcon,
  HomeIcon,
  Package,
  Scissors,
  Settings2,
  ShoppingCart,
  SidebarIcon,
  Users2Icon,
  Wallet2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function Sidebar() {
  const navigate = useNavigate()
  return (
    <div className="pl-5 pt-2  w-1/5 overflow-y-auto shrink-0 shadow-lg">
      <div className="flex items-center">
        <SidebarIcon />
        <h2 className="ml-3">MENÚ PRINCIPAL</h2>
      </div>

      <div
        className="flex items-center mt-5 hover:cursor-pointer hover:text-primary-hover text-text-secondary"
        onClick={() => navigate('/')}
      >
        <HomeIcon />
        <h3 className="ml-3">Inicio</h3>
      </div>
      <div className="flex items-center mt-5 hover:cursor-pointer hover:text-primary-hover text-text-secondary">
        <ShoppingCart />
        <h3 className="ml-3">Ventas</h3>
      </div>
      <div className="flex items-center mt-5 hover:cursor-pointer hover:text-primary-hover text-text-secondary">
        <Package />
        <h3 className="ml-3">Inventario</h3>
      </div>
      <div className="flex items-center mt-5 hover:cursor-pointer hover:text-primary-hover text-text-secondary">
        <Scissors />
        <h3 className="ml-3">Arreglos</h3>
      </div>
      <div className="flex items-center mt-5 hover:cursor-pointer hover:text-primary-hover text-text-secondary">
        <Users2Icon />
        <h3 className="ml-3">Clientes</h3>
      </div>
      <div className="flex items-center mt-5 hover:cursor-pointer hover:text-primary-hover text-text-secondary">
        <Wallet2 />
        <h3 className="ml-3">Caja</h3>
      </div>
      <div className="flex items-center mt-5 hover:cursor-pointer hover:text-primary-hover text-text-secondary">
        <ChartNoAxesCombinedIcon />
        <h3 className="ml-3">Informes</h3>
      </div>
      <div className="flex items-center mt-5 hover:cursor-pointer hover:text-primary-hover text-text-secondary">
        <Settings2 />
        <h3 className="ml-3">Configuración</h3>
      </div>
    </div>
  )
}

export default Sidebar
