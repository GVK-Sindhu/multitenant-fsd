import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import api from '../services/api'
import './Dashboard.css'

const Dashboard = () => {
  const { user } = useContext(AuthContext)
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0
  })
  const [projects, setProjects] = useState([])
  const [myTasks, setMyTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch projects
      const projectsRes = await api.get('/projects?limit=5')
      setProjects(projectsRes.data.data.projects || [])

      // Calculate stats from projects
      let totalTasks = 0
      let completedTasks = 0
      
      for (const project of projectsRes.data.data.projects || []) {
        totalTasks += project.taskCount || 0
        completedTasks += project.completedTaskCount || 0
      }

      setStats({
        totalProjects: projectsRes.data.data.total || 0,
        totalTasks,
        completedTasks,
        pendingTasks: totalTasks - completedTasks
      })

      // Fetch my tasks if user is not super admin
      if (user?.role !== 'super_admin') {
        try {
          // Get all projects first
          const allProjectsRes = await api.get('/projects')
          const allProjects = allProjectsRes.data.data.projects || []
          
          // Get tasks from each project assigned to current user
          const tasksPromises = allProjects.map(project =>
            api.get(`/tasks/projects/${project.id}/tasks?assignedTo=${user.id}`).catch(() => null)
          )
          
          const tasksResponses = await Promise.all(tasksPromises)
          const allTasks = tasksResponses
            .filter(res => res)
            .flatMap(res => res.data.data.tasks || [])
            .slice(0, 10)
          
          setMyTasks(allTasks)
        } catch (error) {
          console.error('Error fetching tasks:', error)
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  return (
    <div className="dashboard">
      <div className="container">
        <h1>Dashboard</h1>
        
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Projects</h3>
            <p className="stat-number">{stats.totalProjects}</p>
          </div>
          <div className="stat-card">
            <h3>Total Tasks</h3>
            <p className="stat-number">{stats.totalTasks}</p>
          </div>
          <div className="stat-card">
            <h3>Completed Tasks</h3>
            <p className="stat-number">{stats.completedTasks}</p>
          </div>
          <div className="stat-card">
            <h3>Pending Tasks</h3>
            <p className="stat-number">{stats.pendingTasks}</p>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Recent Projects</h2>
              <Link to="/projects" className="btn btn-primary">View All</Link>
            </div>
            {projects.length === 0 ? (
              <div className="empty-state">No projects yet</div>
            ) : (
              <div className="projects-list">
                {projects.map(project => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="project-card"
                  >
                    <h3>{project.name}</h3>
                    <p>{project.description || 'No description'}</p>
                    <div className="project-meta">
                      <span className={`badge badge-${project.status === 'active' ? 'success' : 'secondary'}`}>
                        {project.status}
                      </span>
                      <span>{project.taskCount || 0} tasks</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {user?.role !== 'super_admin' && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2>My Tasks</h2>
              </div>
              {myTasks.length === 0 ? (
                <div className="empty-state">No tasks assigned to you</div>
              ) : (
                <div className="tasks-list">
                  {myTasks.map(task => (
                    <div key={task.id} className="task-item">
                      <div className="task-header">
                        <h4>{task.title}</h4>
                        <span className={`badge badge-${task.priority}`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="task-status">
                        Status: <span className={`badge badge-${task.status === 'completed' ? 'success' : 'warning'}`}>
                          {task.status}
                        </span>
                      </p>
                      {task.dueDate && (
                        <p className="task-due">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard

