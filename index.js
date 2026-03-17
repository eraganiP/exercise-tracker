const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
})

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
})

const User = mongoose.model('User', userSchema)
const Exercise = mongoose.model('Exercise', exerciseSchema)

app.use(cors())
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

// POST /api/users - Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const user = new User({ username: req.body.username })
    const savedUser = await user.save()
    res.json({ username: savedUser.username, _id: savedUser._id })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// GET /api/users - Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id')
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/users/:_id/exercises - Add an exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const userId = req.params._id
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const date = req.body.date ? new Date(req.body.date) : new Date()

    const exercise = new Exercise({
      userId: user._id,
      description: req.body.description,
      duration: parseInt(req.body.duration),
      date: date
    })

    await exercise.save()

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// GET /api/users/:_id/logs - Get exercise log for a user
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const filter = { userId: user._id }

    // Apply date filters
    if (req.query.from || req.query.to) {
      filter.date = {}
      if (req.query.from) {
        filter.date.$gte = new Date(req.query.from)
      }
      if (req.query.to) {
        filter.date.$lte = new Date(req.query.to)
      }
    }

    let query = Exercise.find(filter).select('description duration date')

    if (req.query.limit) {
      query = query.limit(parseInt(req.query.limit))
    }

    const exercises = await query.exec()

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }))

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log: log
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
