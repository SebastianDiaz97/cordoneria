import Dashboard from '@/pages/Dashboard'
import Layout from '@/pages/Layout'
import { Route, Routes } from 'react-router-dom'

function AppRouter() {
  return (
    <Routes>
      {/* Layout compartido */}
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        {/* <Route path="/ventas" element={<Ventas />} /> */}
        {/* <Route path="/inventario" element={<Inventario />} /> */}
        {/* <Route path="/clientes" element={<Clientes />} /> */}
      </Route>
    </Routes>
  )
}

export default AppRouter
