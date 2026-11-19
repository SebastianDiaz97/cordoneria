import { ScissorsIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function Header() {
  const navigate = useNavigate()
  return (
    <div
      className="bg-primary text-white flex items-center p-5 shrink-0 cursor-pointer"
      onClick={() => navigate('/')}
    >
      <ScissorsIcon size={24} />
      <h1 className="text-white ml-2">Cordoneria</h1>
    </div>
  )
}

export default Header
