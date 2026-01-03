import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import api from '../services/api'
import './ProjectDetails.css'

const ProjectDetails = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    dueDate: ''
  })
  const [filter, setFilter] = useState('all')
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetchProject()
    fetchUsers()
  }, [projectId])

  useEffect(() => {
    if (project) {
      fetchTasks()
    }
  }, [projectId, filter])

  const fetchProject = async () => {
    try {
      // Get project from projects list
      const response = await api.get('/projects')
      const foundProject = response.data.data.projects.find(p => p.id === projectId)
      if (foundProject) {
        setProject(foundProject)
      }
      setLoading(false)
    } catch (error) {
      setError('Failed to fetch project')
      setLoading(false)
    }
  }

  const fetchTasks = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {}
      const response = await api.get(`/tasks/projects/${projectId}/tasks`, { params })
      setTasks(response.data.data.tasks || [])
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    }
  }

  const fetchUsers = async () => {
    if (user?.tenantId) {
      try {
        const response = await api.get(`/tenants/${user.tenantId}/users`)
        setUsers(response.data.data.users || [])
      } catch (error) {
        console.error('Failed to fetch users:', error)
      }
    }
  }

  const handleTaskSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, taskFormData)
      } else {
        await api.post(`/tasks/projects/${projectId}/tasks`, taskFormData)
      }
      setShowTaskModal(false)
      setEditingTask(null)
      setTaskFormData({
        title: '',
        description: '',
        priority: 'medium',
        assignedTo: '',
        dueDate: ''
      })
      fetchTasks()
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save task')
    }
  }

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus })
      fetchTasks()
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update task status')
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      await api.delete(`/tasks/${taskId}`)
      fetchTasks()
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete task')
    }
  }

  const handleEditTask = (task) => {
    setEditingTask(task)
    setTaskFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      assignedTo: task.assignedTo?.id || '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : ''
    })
    setShowTaskModal(true)
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  if (!project) {
    return <div className="container">Project not found</div>
  }

  const canEdit = user?.role === 'tenant_admin' || project.createdBy?.id === user?.id

  return (
    <div className="project-details-page">
      <div className="container">
        <div className="project-header">
          <div>
            <h1>{project.name}</h1>
            <p className="project-description">{project.description || 'No description'}</p>
            <div className="project-info">
              <span className={`badge badge-${project.status === 'active' ? 'success' : project.status === 'completed' ? 'primary' : 'secondary'}`}>
                {project.status}
              </span>
              <span>{project.taskCount || 0} tasks</span>
            </div>
          </div>
          {canEdit && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingTask(null)
                setTaskFormData({
                  title: '',
                  description: '',
                  priority: 'medium',
                  assignedTo: '',
                  dueDate: ''
                })
                setShowTaskModal(true)
              }}
            >
              Add Task
            </button>
          )}
        </div>

        {error && <div className="error">{error}</div>}

        <div className="filter-section">
          <label>Filter tasks: </label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {tasks.length === 0 ? (
          <div className="empty-state">No tasks in this project</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assigned To</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id}>
                  <td>
                    <strong>{task.title}</strong>
                    {task.description && (
                      <div className="task-description-small">{task.description}</div>
                    )}
                  </td>
                  <td>
                    <select
                      value={task.status}
                      onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                      className="status-select"
                    >
                      <option value="todo">Todo</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td>
                    <span className={`badge badge-${task.priority}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td>{task.assignedTo ? task.assignedTo.fullName : 'Unassigned'}</td>
                  <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</td>
                  <td>
                    <div className="task-actions">
                      {canEdit && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleEditTask(task)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showTaskModal && (
          <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
              <form onSubmit={handleTaskSubmit}>
                <div className="form-group">
                  <label>Task Title</label>
                  <input
                    type="text"
                    value={taskFormData.title}
                    onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={taskFormData.priority}
                    onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Assign To</label>
                  <select
                    value={taskFormData.assignedTo}
                    onChange={(e) => setTaskFormData({ ...taskFormData, assignedTo: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.fullName} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={taskFormData.dueDate}
                    onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingTask ? 'Update' : 'Create'}
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

export default ProjectDetails

