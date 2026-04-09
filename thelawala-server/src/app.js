const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const vendorRoutes = require('./routes/vendor');
const searchRoutes = require('./routes/search');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'Thelawala Bridge Server' });
});

// REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/search', searchRoutes);

module.exports = app;
