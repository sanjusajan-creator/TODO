import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('todoapp-user') || 'null'))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    localStorage.setItem('todoapp-user', JSON.stringify(user))
    setLoading(false)
  }, [user])

  const login = async (email, password) => {
    const users = JSON.parse(localStorage.getItem('todoapp-users') || '[]')
    const found = users.find(u => u.email === email && u.password === password)
    if (!found) throw new Error('Invalid credentials')
    setUser(found)
    return { user: found }
  }

  const register = async (email, password) => {
    const users = JSON.parse(localStorage.getItem('todoapp-users') || '[]')
    if (users.find(u => u.email === email)) throw new Error('Email already exists')
    const newUser = { id: Date.now().toString(), email, password }
    users.push(newUser)
    localStorage.setItem('todoapp-users', JSON.stringify(users))
    setUser(newUser)
    return { user: newUser }
  }

  const logout = () => {
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}