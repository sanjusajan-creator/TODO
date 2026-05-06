import { useState, useEffect } from 'react'
import { api } from '../api'
import { 
  Plus, Trash2, Moon, Sun, Check, LayoutGrid, ShoppingCart, Heart, 
  Briefcase, MoreHorizontal, Menu, X, Calendar 
} from 'lucide-react'

const CATEGORIES = [
  { id: 'work', label: 'Work', icon: Briefcase, color: 'bg-indigo-500' },
  { id: 'personal', label: 'Personal', icon: LayoutGrid, color: 'bg-blue-500' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingCart, color: 'bg-green-500' },
  { id: 'health', label: 'Health', icon: Heart, color: 'bg-red-500' },
  { id: 'other', label: 'Other', icon: MoreHorizontal, color: 'bg-gray-500' },
]

const PRIORITIES = [
  { id: 'low', label: 'Low', color: 'bg-green-500' },
  { id: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { id: 'high', label: 'High', color: 'bg-red-500' },
]

export default function Dashboard() {
  const [tasks, setTasks] = useState([])
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('todoapp-darkMode')
    return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [newTask, setNewTask] = useState('')
  const [category, setCategory] = useState('personal')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [filter, setFilter] = useState('all')
  const [activeCategory, setActiveCategory] = useState('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('todoapp-darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const data = await api.getTasks()
      setTasks(data)
    } catch (err) {
      console.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const addTask = async (e) => {
    e.preventDefault()
    if (!newTask.trim()) return
    try {
      const task = await api.createTask({
        title: newTask.trim(),
        completed: false,
        category,
        priority,
        dueDate: dueDate || null,
      })
      setTasks([task, ...tasks])
      setNewTask('')
      setDueDate('')
    } catch (err) {
      console.error('Failed to add task')
    }
  }

  const toggleTask = async (id, currentStatus) => {
    try {
      const updated = await api.updateTask(id, { completed: !currentStatus })
      setTasks(tasks.map(t => t._id === id ? updated : t))
    } catch (err) {
      console.error('Failed to update task')
    }
  }

  const deleteTask = async (id) => {
    try {
      await api.deleteTask(id)
      setTasks(tasks.filter(t => t._id !== id))
    } catch (err) {
      console.error('Failed to delete task')
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'active') return !task.completed
    if (filter === 'completed') return task.completed
    if (activeCategory !== 'all' && task.category !== activeCategory) return false
    return true
  })

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = tasks.filter(t => t.category === cat.id).length
    return acc
  }, {})

  const completedCount = tasks.filter(t => t.completed).length
  const activeCount = tasks.length - completedCount

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <header className="bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Todo App
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-slate-600 dark:text-slate-300">{activeCount} active</span>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        <aside className={`fixed lg:static inset-0 z-10 bg-slate-50 dark:bg-slate-900 lg:bg-transparent lg:dark:bg-transparent transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} lg:w-64 flex-shrink-0`}>
          <div className="lg:hidden absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 lg:rounded-2xl shadow-lg lg:shadow-xl p-4 w-64 h-full overflow-y-auto">
            <h2 className="font-semibold text-slate-600 dark:text-slate-300 mb-3 text-sm uppercase tracking-wider">Categories</h2>
            <nav className="space-y-1.5">
              <button
                onClick={() => { setActiveCategory('all'); setSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                  activeCategory === 'all' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <LayoutGrid className="w-4.5 h-4.5" /> All Tasks
                </span>
                <span className="text-sm bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded-full">{tasks.length}</span>
              </button>
              {CATEGORIES.map(cat => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                      activeCategory === cat.id ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4.5 h-4.5" /> {cat.label}
                    </span>
                    <span className="text-sm bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded-full">{categoryCounts[cat.id] || 0}</span>
                  </button>
                )
              })}
            </nav>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedCount}</p>
                  <p className="text-xs text-green-600/70 dark:text-green-400/70">Done</p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{activeCount}</p>
                  <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">Active</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <form onSubmit={addTask} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 p-4 mb-6">
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full px-5 py-4 rounded-xl border-2 border-transparent bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-lg"
              />
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PRIORITIES.map(p => (
                    <option key={p.id} value={p.id}>{p.label} Priority</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-medium transition-all"
                >
                  <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Add Task</span>
                </button>
              </div>
            </div>
          </form>

          <div className="flex flex-wrap gap-2 mb-5">
            {['all', 'active', 'completed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl capitalize font-medium transition-all ${
                  filter === f ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-lg text-slate-500 dark:text-slate-400">
                  {filter === 'all' ? 'No tasks yet. Add one above!' : `No ${filter} tasks.`}
                </p>
              </div>
            ) : (
              filteredTasks.map(task => (
                <div
                  key={task._id}
                  className={`group bg-white dark:bg-slate-800 rounded-2xl shadow-md shadow-slate-200/50 dark:shadow-slate-900/50 p-4 flex items-center gap-4 transition-all hover:shadow-lg ${
                    task.completed ? 'opacity-60' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleTask(task._id, task.completed)}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
                      task.completed ? 'bg-green-500 border-green-500' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'
                    }`}
                  >
                    {task.completed && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-base font-medium text-slate-900 dark:text-slate-100 ${task.completed ? 'line-through text-slate-400' : ''} truncate`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                      <span className={`text-xs px-2.5 py-1 rounded-full text-white font-medium ${CATEGORIES.find(c => c.id === task.category)?.color}`}>
                        {CATEGORIES.find(c => c.id === task.category)?.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className={`w-2 h-2 rounded-full ${PRIORITIES.find(p => p.id === task.priority)?.color}`} />
                        {PRIORITIES.find(p => p.id === task.priority)?.label}
                      </span>
                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                          <Calendar className="w-3.5 h-3.5" /> {task.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTask(task._id)}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
      
      <footer className="fixed bottom-0 left-0 right-0 py-2 text-center text-sm text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900">
        Made by <span className="font-semibold text-indigo-600 dark:text-indigo-400">SANJU</span>
      </footer>
    </div>
  )
}