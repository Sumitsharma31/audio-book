require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

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

// Base route for health check
app.get('/', (req, res) => {
  res.send('AudioBook Backend API is running smoothly!');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: err.message || 'Something went wrong on the server!' });
});

// Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT} and bound to 0.0.0.0`);
});
