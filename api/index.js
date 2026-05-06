import { Pool } from 'pg'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
})

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

export default async function handler(req) {
  const { url, method } = req
  const pathname = new URL(url).pathname
  
  const json = (data, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
  
  const client = await pool.connect()
  
  try {
    if (pathname === '/api/auth/register' && method === 'POST') {
      const { email, password } = await req.json()
      await createTables(client)
      
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [email])
      if (existing.rows.length > 0) {
        return json({ message: 'Email already exists' }, 400)
      }
      
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.hash(password, 10)
      
      const result = await client.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
        [email, hashedPassword]
      )
      
      const jwt = await import('jsonwebtoken')
      const token = jwt.sign({ userId: result.rows[0].id }, JWT_SECRET, { expiresIn: '7d' })
      
      return json({ token, user: result.rows[0] }, 201)
    }
    
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { email, password } = await req.json()
      
      const result = await client.query('SELECT * FROM users WHERE email = $1', [email])
      if (result.rows.length === 0) {
        return json({ message: 'Invalid credentials' }, 400)
      }
      
      const bcrypt = await import('bcryptjs')
      if (!await bcrypt.compare(password, result.rows[0].password)) {
        return json({ message: 'Invalid credentials' }, 400)
      }
      
      const jwt = await import('jsonwebtoken')
      const token = jwt.sign({ userId: result.rows[0].id }, JWT_SECRET, { expiresIn: '7d' })
      
      return json({ token, user: { id: result.rows[0].id, email: result.rows[0].email }})
    }
    
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return json({ message: 'No token' }, 401)
    }
    
    const jwt = await import('jsonwebtoken')
    let userId
    try {
      userId = jwt.verify(authHeader.split(' ')[1], JWT_SECRET).userId
    } catch {
      return json({ message: 'Invalid token' }, 401)
    }
    
    if (pathname === '/api/tasks' && method === 'GET') {
      await createTables(client)
      const result = await client.query(
        'SELECT id, user_id, title, completed, category, priority, due_date, created_at FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      )
      return json(result.rows)
    }
    
    if (pathname === '/api/tasks' && method === 'POST') {
      await createTables(client)
      const { title, completed, category, priority, dueDate } = await req.json()
      
      const result = await client.query(
        'INSERT INTO tasks (user_id, title, completed, category, priority, due_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [userId, title, completed || false, category || 'other', priority || 'medium', dueDate || null]
      )
      return json(result.rows[0], 201)
    }
    
    if (pathname.startsWith('/api/tasks/') && method === 'PUT') {
      const id = pathname.split('/').pop()
      const { title, completed, category, priority, dueDate } = await req.json()
      
      const result = await client.query(
        'UPDATE tasks SET title = COALESCE($1, title), completed = COALESCE($2, completed), category = COALESCE($3, category), priority = COALESCE($4, priority), due_date = COALESCE($5, due_date) WHERE id = $6 AND user_id = $7 RETURNING *',
        [title, completed, category, priority, dueDate, id, userId]
      )
      
      if (result.rows.length === 0) {
        return json({ message: 'Task not found' }, 404)
      }
      return json(result.rows[0])
    }
    
    if (pathname.startsWith('/api/tasks/') && method === 'DELETE') {
      const id = pathname.split('/').pop()
      await client.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [id, userId])
      return json({ message: 'Deleted' })
    }
    
    return json({ message: 'Not found' }, 404)
  } catch (err) {
    console.error(err)
    return json({ message: 'Server error: ' + err.message }, 500)
  } finally {
    client.release()
  }
}