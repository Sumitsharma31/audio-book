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

// Serve Frontend in Production
// Try to resolve frontend path gracefully whether we're running from /workspace, /backend, etc.
let frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
const fs = require('fs');

if (!fs.existsSync(frontendPath)) {
  // Fallback if __dirname is weird in Cloud Buildpacks
  frontendPath = path.join(process.cwd(), 'frontend', 'dist');
  if (!fs.existsSync(frontendPath)) {
    // Another fallback in case it's flattened
    frontendPath = path.join(process.cwd(), 'dist');
  }
}

console.log(`[Startup] __dirname: ${__dirname}`);
console.log(`[Startup] process.cwd(): ${process.cwd()}`);
console.log(`[Startup] Resolved frontendPath: ${frontendPath}`);
console.log(`[Startup] Does frontendPath exist? ${fs.existsSync(frontendPath)}`);

app.use(express.static(frontendPath));

app.use((req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
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
