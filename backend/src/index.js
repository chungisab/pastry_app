require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pastryRoutes = require('./routes/pastries');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/pastries', pastryRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`NYC Pastry Finder API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
