import { useState, useEffect } from 'react'
import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import api from '../services/api'
import './Users.css'

const Users = () => {
  const { user } = useContext(AuthContext)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'user',
    isActive: true
  })

  useEffect(() => {
    if (user?.tenantId) {
      fetchUsers()
    }
  }, [user])

  const fetchUsers = async () => {
    try {
      const response = await api.get(`/tenants/${user.tenantId}/users`)
      setUsers(response.data.data.users || [])
      setLoading(false)
    } catch (error) {
      setError('Failed to fetch users')
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (editingUser) {
        const updateData = {
          fullName: formData.fullName,
          role: formData.role,
          isActive: formData.isActive
        }
        await api.put(`/users/${editingUser.id}`, updateData)
      } else {
        await api.post(`/tenants/${user.tenantId}/users`, formData)
      }
      setShowModal(false)
      setEditingUser(null)
      setFormData({
        email: '',
        password: '',
        fullName: '',
        role: 'user',
        isActive: true
      })
      fetchUsers()
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save user')
    }
  }

  const handleEdit = (userToEdit) => {
    setEditingUser(userToEdit)
    setFormData({
      email: userToEdit.email,
      password: '',
      fullName: userToEdit.fullName,
      role: userToEdit.role,
      isActive: userToEdit.isActive
    })
    setShowModal(true)
  }

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return
    }

    try {
      await api.delete(`/users/${userId}`)
      fetchUsers()
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete user')
    }
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  return (
    <div className="users-page">
      <div className="container">
        <div className="page-header">
          <h1>Users</h1>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingUser(null)
              setFormData({
                email: '',
                password: '',
                fullName: '',
                role: 'user',
                isActive: true
              })
              setShowModal(true)
            }}
          >
            Add User
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        {users.length === 0 ? (
          <div className="empty-state">No users found</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(userItem => (
                <tr key={userItem.id}>
                  <td>{userItem.fullName}</td>
                  <td>{userItem.email}</td>
                  <td>
                    <span className={`badge badge-${userItem.role === 'tenant_admin' ? 'primary' : 'secondary'}`}>
                      {userItem.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${userItem.isActive ? 'success' : 'danger'}`}>
                      {userItem.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(userItem.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="user-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleEdit(userItem)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(userItem.id)}
                        disabled={userItem.id === user?.id}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
              <form onSubmit={handleSubmit}>
                {!editingUser && (
                  <>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Password</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingUser}
                        minLength="8"
                      />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="user">User</option>
                    <option value="tenant_admin">Tenant Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    Active
                  </label>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingUser ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Users

