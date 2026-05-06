import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const MONGODB_URI = process.env.MONGODB_URI
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'

let cached = global.mongoose
if (!cached) cached = global.mongoose = { conn: null, promise: null }

async function connectDB() {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false }).then(m => m)
  }
  cached.conn = await cached.promise.catch(e => { cached.promise = null; throw e })
  return cached.conn
}

const userSchema = new mongoose.Schema({ email: { type: String, unique: true }, password: String })
const taskSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId, title: String, completed: Boolean,
  category: String, priority: String, dueDate: String, createdAt: Date
})

const User = mongoose.models.User || mongoose.model('User', userSchema)
const Task = mongoose.models.Task || mongoose.model('Task', taskSchema)

function getUserId(authHeader) {
  if (!authHeader) return null
  const token = authHeader.split(' ')[1]
  try { return jwt.verify(token, JWT_SECRET).userId } catch { return null }
}

export default async function handler(req, res) {
  if (!MONGODB_URI) return res.status(500).json({ message: 'No DB URI' })
  try { await connectDB() } catch { return res.status(500).json({ message: 'DB error' }) }

  const { method, url } = req
  const userId = getUserId(req.headers.authorization)

  try {
    if (method === 'POST' && url === '/api/auth/register') {
      const { email, password } = req.body
      const exists = await User.findOne({ email })
      if (exists) return res.status(400).json({ message: 'Email exists' })
      const hashed = await bcrypt.hash(password, 10)
      const user = await User.create({ email, password: hashed })
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' })
      return res.status(201).json({ token, user: { id: user._id, email: user.email } })
    }

    if (method === 'POST' && url === '/api/auth/login') {
      const { email, password } = req.body
      const user = await User.findOne({ email })
      if (!user) return res.status(400).json({ message: 'Invalid credentials' })
      if (!await bcrypt.compare(password, user.password)) return res.status(400).json({ message: 'Invalid credentials' })
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' })
      return res.json({ token, user: { id: user._id, email: user.email } })
    }

    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    if (method === 'GET' && url === '/api/tasks') {
      const tasks = await Task.find({ userId }).sort({ createdAt: -1 })
      return res.json(tasks)
    }

    if (method === 'POST' && url === '/api/tasks') {
      const task = await Task.create({ ...req.body, userId })
      return res.status(201).json(task)
    }

    if (method === 'PUT' && url.startsWith('/api/tasks/')) {
      const id = url.split('/').pop()
      const task = await Task.findOneAndUpdate({ _id: id, userId }, req.body, { new: true })
      return res.json(task)
    }

    if (method === 'DELETE' && url.startsWith('/api/tasks/')) {
      const id = url.split('/').pop()
      await Task.findOneAndDelete({ _id: id, userId })
      return res.json({ message: 'Deleted' })
    }

    res.status(404).json({ message: 'Not found' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
}