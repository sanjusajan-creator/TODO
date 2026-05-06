const handleRequest = async (req, res) => {
  const { url, method } = req
  
  const apiResponse = async (status, data) => {
    res.setHeader('Content-Type', 'application/json')
    return res.status(status).send(JSON.stringify(data))
  }

  try {
    const { Pool } = await import('pg')
    const { default: bcrypt } = await import('bcryptjs')
    const { default: jwt } = await import('jsonwebtoken')
    
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
    const DATABASE_URL = process.env.DATABASE_URL

    if (!DATABASE_URL) {
      return apiResponse(500, { message: 'DATABASE_URL not configured' })
    }

    const pool = new Pool({ connectionString: DATABASE_URL })

    const getUserId = (authHeader) => {
      if (!authHeader) return null
      try {
        return jwt.verify(authHeader.split(' ')[1], JWT_SECRET).userId
      } catch {
        return null
      }
    }

    if (method === 'POST' && url === '/api/auth/register') {
      const { email, password } = req.body
      
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

        const existing = await client.query('SELECT id FROM users WHERE email = $1', [email])
        if (existing.rows.length > 0) {
          return apiResponse(400, { message: 'Email already exists' })
        }
        
        const hashedPassword = await bcrypt.hash(password, 10)
        const result = await client.query(
          'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
          [email, hashedPassword]
        )
        const token = jwt.sign({ userId: result.rows[0].id }, JWT_SECRET, { expiresIn: '7d' })
        return apiResponse(201, { token, user: result.rows[0] })
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
          return apiResponse(400, { message: 'Invalid credentials' })
        }
        
        const user = result.rows[0]
        if (!await bcrypt.compare(password, user.password)) {
          return apiResponse(400, { message: 'Invalid credentials' })
        }
        
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
        return apiResponse(200, { token, user: { id: user.id, email: user.email } })
      } finally {
        client.release()
      }
    }

    const userId = getUserId(req.headers.authorization)
    if (!userId) {
      return apiResponse(401, { message: 'Unauthorized' })
    }

    const client = await pool.connect()
    try {
      if (method === 'GET' && url === '/api/tasks') {
        const result = await client.query(
          'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
          [userId]
        )
        const tasks = result.rows.map(t => ({
          _id: t.id, userId: t.user_id, title: t.title,
          completed: t.completed, category: t.category,
          priority: t.priority, dueDate: t.due_date, createdAt: t.created_at
        }))
        return apiResponse(200, tasks)
      }

      if (method === 'POST' && url === '/api/tasks') {
        const { title, completed, category, priority, dueDate } = req.body
        const result = await client.query(
          'INSERT INTO tasks (user_id, title, completed, category, priority, due_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [userId, title, completed || false, category || 'other', priority || 'medium', dueDate || null]
        )
        const task = result.rows[0]
        return apiResponse(201, {
          _id: task.id, userId: task.user_id, title: task.title,
          completed: task.completed, category: task.category,
          priority: task.priority, dueDate: task.due_date, createdAt: task.created_at
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
          return apiResponse(404, { message: 'Task not found' })
        }
        const task = result.rows[0]
        return apiResponse(200, {
          _id: task.id, userId: task.user_id, title: task.title,
          completed: task.completed, category: task.category,
          priority: task.priority, dueDate: task.due_date, createdAt: task.created_at
        })
      }

      if (method === 'DELETE' && url.startsWith('/api/tasks/')) {
        const id = url.split('/').pop()
        await client.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [id, userId])
        return apiResponse(200, { message: 'Deleted' })
      }
    } finally {
      client.release()
    }

    return apiResponse(404, { message: 'Not found' })
  } catch (err) {
    console.error(err)
    return apiResponse(500, { message: 'Server error' })
  }
}

export default handleRequest