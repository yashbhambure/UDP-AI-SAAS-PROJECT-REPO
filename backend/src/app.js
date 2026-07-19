const express = require('express');
require('express-async-errors'); // Catch async handler errors automatically
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const reminderRoutes = require('./routes/reminders');
const searchRoutes = require('./routes/search');
const opportunityRoutes = require('./routes/opportunities');
const taskRoutes = require('./routes/tasks');
const dashboardRoutes = require('./routes/dashboard');
const checklistItemRoutes = require('./routes/checklistItems');
const userRoutes = require('./routes/users');
const conversationRoutes = require('./routes/conversations');
const globalErrorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// ── Standard Security & Logging Middlewares ──────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all origins for dev/academic project convenience
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom morgan integration with winston logger
const morganStream = {
  write: (message) => logger.info(message.trim()),
};
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));

// ── Routing Entry Points ─────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/checklist-items', checklistItemRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);

// Fallback 404 Route
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use(globalErrorHandler);

module.exports = app;
