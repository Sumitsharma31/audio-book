require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/temp', express.static('temp'));

// Import Routes
const uploadRoutes = require('./routes/upload.routes');
const ttsRoutes = require('./routes/tts.routes');

// Use Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/tts', ttsRoutes);

// Base route for testing
app.get('/', (req, res) => {
  res.send('AudioBook Backend API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: err.message || 'Something went wrong on the server!' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
