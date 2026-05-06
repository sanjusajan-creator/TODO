const getStorageKey = () => 'todoapp-tasks'

export const api = {
  async getTasks() {
    const tasks = localStorage.getItem(getStorageKey())
    return tasks ? JSON.parse(tasks) : []
  },

  async createTask(task) {
    const tasks = await this.getTasks()
    const newTask = { 
      ...task, 
      _id: Date.now().toString(), 
      createdAt: new Date().toISOString() 
    }
    tasks.unshift(newTask)
    localStorage.setItem(getStorageKey(), JSON.stringify(tasks))
    return newTask
  },

  async updateTask(id, updates) {
    const tasks = await this.getTasks()
    const index = tasks.findIndex(t => t._id === id)
    if (index === -1) throw new Error('Task not found')
    tasks[index] = { ...tasks[index], ...updates }
    localStorage.setItem(getStorageKey(), JSON.stringify(tasks))
    return tasks[index]
  },

  async deleteTask(id) {
    const tasks = await this.getTasks()
    const filtered = tasks.filter(t => t._id !== id)
    localStorage.setItem(getStorageKey(), JSON.stringify(filtered))
  },
}