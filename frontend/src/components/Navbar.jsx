import { Link, useNavigate } from 'react-router-dom'
import { useContext, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import './Navbar.css'

const Navbar = () => {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isSuperAdmin = user?.role === 'super_admin'
  const isTenantAdmin = user?.role === 'tenant_admin'

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-logo">
          SaaS Platform
        </Link>
        <button
          className="navbar-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div className={`navbar-menu ${menuOpen ? 'active' : ''}`}>
          <Link to="/dashboard" className="navbar-link">
            Dashboard
          </Link>
          <Link to="/projects" className="navbar-link">
            Projects
          </Link>
          {(isTenantAdmin || isSuperAdmin) && (
            <Link to="/users" className="navbar-link">
              Users
            </Link>
          )}
          <div className="navbar-user">
            <span className="navbar-user-name">{user?.fullName}</span>
            <span className="navbar-user-role">({user?.role})</span>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

