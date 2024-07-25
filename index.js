const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to the database');
})
.catch((error) => {
  console.error('Error connecting to the database:', error);
});

const userSchema = mongoose.Schema({
  username: {
    type: String,
    unique: true,
  },
},
{ versionKey: false }
);

const User = mongoose.model('User', userSchema);
const exerciseSchema = mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date,
  userId: String
}, 
{ versionKey: false }
);
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// GET request to /api/users
app.get('/api/users', async (req, res) => { 
  try {
    const users = await User.find();
    res.json(users); // Use res.json to properly format the response as JSON
  } catch (error) {
    console.error('Error retrieving users:', error);
    res.status(500).json({ error: 'An error occurred while retrieving users' });
  }
});

// POST to /api/users
app.post('/api/users', async (req, res) => {
  try {
    const username = req.body.username;

    // Check if user already exists
    const foundUser = await User.findOne({ username });

    if (foundUser) {
      return res.json(foundUser); // User exists, return it
    }

    // Create new user if not found
    const user = await User.create({ username });
    res.json(user); // Return the created user
  } catch (error) {
    console.error('Error handling POST request:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// GET request to /api/users/:_id/logs
app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    let { from, to, limit } = req.query;
    const userId = req.params._id;
    const foundUser = await User.findById(userId);

    if (!foundUser) {
      return res.json({ message: 'No user exists for that id '});
    }

    let filter = { userId };
    let dateFilter = {};
    if (from) {
      dateFilter['$gte'] = new Date(from);
    }
    if (to) {
      dateFilter['$lte'] = new Date(to);
    }
    if (from || to) {
      filter.date = dateFilter;
    }

    if (!limit) {
      limit = 100;
    }

    let exercises = await Exercise.find(filter).limit(parseInt(limit));
    exercises = exercises.map((exercise) => {
      return {
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString(),
      };
    });

    res.json({
      username: foundUser.username,
      count: exercises.length,
      _id: userId,
      log: exercises,
    });
  } catch (error) {
    console.error('Error retrieving logs:', error);
    res.status(500).json({ error: 'An error occurred while retrieving logs' });
  }
});

// POST to /api/users/:_id/exercises
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    let { description, duration, date } = req.body;
    const userId = req.params._id; // Changed from req.body[":_id"] to req.params._id
    const foundUser = await User.findById(userId);

    if (!foundUser) {
      return res.json({ message: 'No user exists for that id '});
    }

    if (!date) {
      date = new Date();
    } else {
      date = new Date(date);
    }

    const exercise = await Exercise.create({
      username: foundUser.username,
      description,
      duration,
      date,
      userId,
    });

    res.json({
      _id: userId,
      username: foundUser.username,
      description,
      duration: parseInt(duration),
      date: date.toDateString()
    });
  } catch (error) {
    console.error('Error handling POST request for exercises:', error);
    res.status(500).json({ error: 'An error occurred while adding the exercise' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});