import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from '@/auth/RequireAuth'
import Login from '@/pages/Login'
import Layout from '@/pages/Layout'
import Dashboard from '@/pages/Dashboard'
import Ventas from '@/pages/Ventas'
import Inventario from '@/pages/Inventario'
import Arreglos from '@/pages/Arreglos'
import ArregloDetalle from '@/pages/ArregloDetalle'
import Clientes from '@/pages/Clientes'
import ClienteDetalle from '@/pages/ClienteDetalle'
import Caja from '@/pages/Caja'
import Informes from '@/pages/Informes'
import Configuracion from '@/pages/Configuracion'

function AppRouter() {
  return (
    <Routes>
      <Route path='/login' element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path='/' element={<Dashboard />} />
        <Route path='/ventas' element={<Ventas />} />
        <Route path='/inventario' element={<Inventario />} />
        <Route path='/arreglos' element={<Arreglos />} />
        <Route path='/arreglos/:orderId' element={<ArregloDetalle />} />
        <Route path='/clientes' element={<Clientes />} />
        <Route path='/clientes/:customerId' element={<ClienteDetalle />} />
        <Route path='/caja' element={<Caja />} />
        <Route path='/informes' element={<Informes />} />
        <Route path='/configuracion' element={<Configuracion />} />
      </Route>
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  )
}

export default AppRouter
