import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import './Projects.css'

const Projects = () => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active'
  })
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchProjects()
  }, [filter])

  const fetchProjects = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {}
      const response = await api.get('/projects', { params })
      setProjects(response.data.data.projects || [])
      setLoading(false)
    } catch (error) {
      setError('Failed to fetch projects')
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, formData)
      } else {
        await api.post('/projects', formData)
      }
      setShowModal(false)
      setEditingProject(null)
      setFormData({ name: '', description: '', status: 'active' })
      fetchProjects()
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save project')
    }
  }

  const handleEdit = (project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || '',
      status: project.status
    })
    setShowModal(true)
  }

  const handleDelete = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) {
      return
    }

    try {
      await api.delete(`/projects/${projectId}`)
      fetchProjects()
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete project')
    }
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  return (
    <div className="projects-page">
      <div className="container">
        <div className="page-header">
          <h1>Projects</h1>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingProject(null)
              setFormData({ name: '', description: '', status: 'active' })
              setShowModal(true)
            }}
          >
            Create New Project
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="filter-section">
          <label>Filter by status: </label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">No projects found</div>
        ) : (
          <div className="projects-grid">
            {projects.map(project => (
              <div key={project.id} className="project-card-large">
                <Link to={`/projects/${project.id}`} className="project-link">
                  <h3>{project.name}</h3>
                  <p>{project.description || 'No description'}</p>
                </Link>
                <div className="project-meta">
                  <span className={`badge badge-${project.status === 'active' ? 'success' : project.status === 'completed' ? 'primary' : 'secondary'}`}>
                    {project.status}
                  </span>
                  <span>{project.taskCount || 0} tasks</span>
                  <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="project-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleEdit(project)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(project.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{editingProject ? 'Edit Project' : 'Create New Project'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Project Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingProject ? 'Update' : 'Create'}
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

export default Projects

