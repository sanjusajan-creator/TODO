import { Pool } from 'pg'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function createTables(client) {
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
}

export const config = {
  runtime: 'nodejs18.x',
}

export default async function handler(request) {
  const { pathname, method } = new URL(request.url)
  
  try {
    const client = await pool.connect()
    
    try {
      if (pathname === '/api/auth/register' && method === 'POST') {
        const { email, password } = await request.json()
        
        await createTables(client)
        
        const existing = await client.query('SELECT id FROM users WHERE email = $1', [email])
        if (existing.rows.length > 0) {
          return new Response(JSON.stringify({ message: 'Email already exists' }), { status: 400 })
        }
        
        const bcrypt = await import('bcryptjs')
        const hashedPassword = await bcrypt.hash(password, 10)
        
        const result = await client.query(
          'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
          [email, hashedPassword]
        )
        
        const jwt = await import('jsonwebtoken')
        const token = jwt.sign({ userId: result.rows[0].id }, JWT_SECRET, { expiresIn: '7d' })
        
        return new Response(JSON.stringify({ token, user: result.rows[0] }), { status: 201, headers: { 'Content-Type': 'application/json' } })
      }
      
      if (pathname === '/api/auth/login' && method === 'POST') {
        const { email, password } = await request.json()
        
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email])
        if (result.rows.length === 0) {
          return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 400 })
        }
        
        const user = result.rows[0]
        const bcrypt = await import('bcryptjs')
        if (!await bcrypt.compare(password, user.password)) {
          return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 400 })
        }
        
        const jwt = await import('jsonwebtoken')
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
        
        return new Response(JSON.stringify({ token, user: { id: user.id, email: user.email } }), { headers: { 'Content-Type': 'application/json' } })
      }
      
      const authHeader = request.headers.get('authorization')
      if (!authHeader) {
        return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
      }
      
      const jwt = await import('jsonwebtoken')
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET)
      const userId = decoded.userId
      
      if (pathname === '/api/tasks' && method === 'GET') {
        const result = await client.query(
          'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
          [userId]
        )
        return new Response(JSON.stringify(result.rows), { headers: { 'Content-Type': 'application/json' } })
      }
      
      if (pathname === '/api/tasks' && method === 'POST') {
        const { title, completed, category, priority, dueDate } = await request.json()
        
        const result = await client.query(
          'INSERT INTO tasks (user_id, title, completed, category, priority, due_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [userId, title, completed || false, category || 'other', priority || 'medium', dueDate || null]
        )
        
        return new Response(JSON.stringify(result.rows[0]), { status: 201, headers: { 'Content-Type': 'application/json' } })
      }
      
      if (pathname.startsWith('/api/tasks/') && method === 'PUT') {
        const id = pathname.split('/').pop()
        const { title, completed, category, priority, dueDate } = await request.json()
        
        const result = await client.query(
          'UPDATE tasks SET title = COALESCE($1, title), completed = COALESCE($2, completed), category = COALESCE($3, category), priority = COALESCE($4, priority), due_date = COALESCE($5, due_date) WHERE id = $6 AND user_id = $7 RETURNING *',
          [title, completed, category, priority, dueDate, id, userId]
        )
        
        if (result.rows.length === 0) {
          return new Response(JSON.stringify({ message: 'Task not found' }), { status: 404 })
        }
        
        return new Response(JSON.stringify(result.rows[0]), { headers: { 'Content-Type': 'application/json' } })
      }
      
      if (pathname.startsWith('/api/tasks/') && method === 'DELETE') {
        const id = pathname.split('/').pop()
        await client.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [id, userId])
        
        return new Response(JSON.stringify({ message: 'Deleted' }), { headers: { 'Content-Type': 'application/json' } })
      }
      
      return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 })
    } finally {
      client.release()
    }
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 })
  }
}