import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import './Register.css'

const Register = () => {
  const { register } = useContext(AuthContext)
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    tenantName: '',
    subdomain: '',
    adminEmail: '',
    adminPassword: '',
    adminFullName: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.adminPassword !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.adminPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    const result = await register({
      tenantName: formData.tenantName,
      subdomain: formData.subdomain,
      adminEmail: formData.adminEmail,
      adminPassword: formData.adminPassword,
      adminFullName: formData.adminFullName
    })

    setLoading(false)

    if (result.success) {
      navigate('/login')
      alert('Registration successful! Please login.')
    } else {
      setError(result.message || 'Registration failed')
    }
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <h1>Register Your Organization</h1>
        <form onSubmit={handleSubmit} className="register-form">
          {error && <div className="error">{error}</div>}
          
          <div className="form-group">
            <label>Organization Name</label>
            <input
              type="text"
              name="tenantName"
              value={formData.tenantName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Subdomain</label>
            <input
              type="text"
              name="subdomain"
              value={formData.subdomain}
              onChange={handleChange}
              required
              pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?"
              title="Alphanumeric with hyphens, 3-63 characters"
            />
            <small>Your URL: {formData.subdomain || 'subdomain'}.yourapp.com</small>
          </div>

          <div className="form-group">
            <label>Admin Full Name</label>
            <input
              type="text"
              name="adminFullName"
              value={formData.adminFullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Admin Email</label>
            <input
              type="email"
              name="adminEmail"
              value={formData.adminEmail}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="adminPassword"
              value={formData.adminPassword}
              onChange={handleChange}
              required
              minLength="8"
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="register-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  )
}

export default Register

