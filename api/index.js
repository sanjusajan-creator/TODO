import pg from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const { Pool } = pg

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export default async function handler(req, res) {
  const { method, url } = req

  try {
    if (method === 'POST' && url === '/api/auth/register') {
      const { email, password } = req.body
      
      if (!supabaseUrl || !process.env.DATABASE_URL) {
        const client = await pool.connect()
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              email VARCHAR(255) UNIQUE NOT NULL,
              password VARCHAR(255) NOT NULL
            )
          `)
          await client.query(`
            CREATE TABLE IF NOT EXISTS tasks (
              id SERIAL PRIMARY KEY,
              user_id INTEGER REFERENCES users(id),
              title VARCHAR(255) NOT NULL,
              completed BOOLEAN DEFAULT false,
              category VARCHAR(50) DEFAULT 'other',
              priority VARCHAR(20) DEFAULT 'medium',
              due_date VARCHAR(50),
              created_at TIMESTAMP DEFAULT NOW()
            )
          `)
        } finally {
          client.release()
        }
      }

      const client = await pool.connect()
      try {
        const existing = await client.query('SELECT id FROM users WHERE email = $1', [email])
        if (existing.rows.length > 0) {
          return res.status(400).json({ message: 'Email already exists' })
        }
        
        const hashedPassword = await bcrypt.hash(password, 10)
        const result = await client.query(
          'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
          [email, hashedPassword]
        )
        const user = result.rows[0]
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
        return res.status(201).json({ token, user: { id: user.id, email: user.email } })
      } finally {
        client.release()
      }
    }

    if (method === 'POST' && url === '/api/auth/login') {
      const { email, password } = req.body
      
      const client = await pool.connect()
      try {
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email])
        if (result.rows.length === 0) {
          return res.status(400).json({ message: 'Invalid credentials' })
        }
        
        const user = result.rows[0]
        if (!await bcrypt.compare(password, user.password)) {
          return res.status(400).json({ message: 'Invalid credentials' })
        }
        
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
        return res.json({ token, user: { id: user.id, email: user.email } })
      } finally {
        client.release()
      }
    }

    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ message: 'Unauthorized' })
    
    let userId
    try {
      userId = jwt.verify(token, JWT_SECRET).userId
    } catch {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const client = await pool.connect()
    try {
      if (method === 'GET' && url === '/api/tasks') {
        const result = await client.query(
          'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
          [userId]
        )
        const tasks = result.rows.map(t => ({
          _id: t.id,
          userId: t.user_id,
          title: t.title,
          completed: t.completed,
          category: t.category,
          priority: t.priority,
          dueDate: t.due_date,
          createdAt: t.created_at,
        }))
        return res.json(tasks)
      }

      if (method === 'POST' && url === '/api/tasks') {
        const { title, completed, category, priority, dueDate } = req.body
        const result = await client.query(
          'INSERT INTO tasks (user_id, title, completed, category, priority, due_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [userId, title, completed || false, category || 'other', priority || 'medium', dueDate || null]
        )
        const task = result.rows[0]
        return res.status(201).json({
          _id: task.id,
          userId: task.user_id,
          title: task.title,
          completed: task.completed,
          category: task.category,
          priority: task.priority,
          dueDate: task.due_date,
          createdAt: task.created_at,
        })
      }

      if (method === 'PUT' && url.startsWith('/api/tasks/')) {
        const id = url.split('/').pop()
        const { title, completed, category, priority, dueDate } = req.body
        const result = await client.query(
          'UPDATE tasks SET title = COALESCE($1, title), completed = COALESCE($2, completed), category = COALESCE($3, category), priority = COALESCE($4, priority), due_date = COALESCE($5, due_date) WHERE id = $6 AND user_id = $7 RETURNING *',
          [title, completed, category, priority, dueDate, id, userId]
        )
        if (result.rows.length === 0) {
          return res.status(404).json({ message: 'Task not found' })
        }
        const task = result.rows[0]
        return res.json({
          _id: task.id,
          userId: task.user_id,
          title: task.title,
          completed: task.completed,
          category: task.category,
          priority: task.priority,
          dueDate: task.due_date,
          createdAt: task.created_at,
        })
      }

      if (method === 'DELETE' && url.startsWith('/api/tasks/')) {
        const id = url.split('/').pop()
        await client.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [id, userId])
        return res.json({ message: 'Deleted' })
      }
    } finally {
      client.release()
    }

    res.status(404).json({ message: 'Not found' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
}