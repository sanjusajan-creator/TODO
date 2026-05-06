const getStorageKey = (userId) => `todoapp-tasks-${userId}`

export const api = {
  async getTasks() {
    const user = JSON.parse(localStorage.getItem('todoapp-user') || 'null')
    if (!user) throw new Error('Not logged in')
    return JSON.parse(localStorage.getItem(getStorageKey(user.id)) || '[]')
  },

  async createTask(task) {
    const user = JSON.parse(localStorage.getItem('todoapp-user') || 'null')
    if (!user) throw new Error('Not logged in')
    const tasks = await this.getTasks()
    const newTask = { ...task, _id: Date.now().toString(), userId: user.id, createdAt: new Date().toISOString() }
    tasks.unshift(newTask)
    localStorage.setItem(getStorageKey(user.id), JSON.stringify(tasks))
    return newTask
  },

  async updateTask(id, updates) {
    const user = JSON.parse(localStorage.getItem('todoapp-user') || 'null')
    if (!user) throw new Error('Not logged in')
    const tasks = await this.getTasks()
    const index = tasks.findIndex(t => t._id === id)
    if (index === -1) throw new Error('Task not found')
    tasks[index] = { ...tasks[index], ...updates }
    localStorage.setItem(getStorageKey(user.id), JSON.stringify(tasks))
    return tasks[index]
  },

  async deleteTask(id) {
    const user = JSON.parse(localStorage.getItem('todoapp-user') || 'null')
    if (!user) throw new Error('Not logged in')
    const tasks = await this.getTasks()
    const filtered = tasks.filter(t => t._id !== id)
    localStorage.setItem(getStorageKey(user.id), JSON.stringify(filtered))
  },
}