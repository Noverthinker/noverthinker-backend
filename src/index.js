// =============================================================================
// NoverThinker Backend - Main Entry Point (SPRINT 2 - COMPLETO)
// =============================================================================
// Professional Football Scouting Platform API
// Client: Menelik | Developer: Oscar | Sprint 2
// =============================================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Config
const { pool } = require('./config/database');
const { connectRedis } = require('./config/redis');

// Middleware
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const playersRoutes = require('./routes/players');
const videosRoutes = require('./routes/videos');  // Sprint 2

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// Middleware
// =============================================================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://noverthinker.com', 'https://app.noverthinker.com', 'https://admin.noverthinker.com']
    : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// =============================================================================
// API Routes
// =============================================================================

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW() as time');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      dbTime: dbResult.rows[0].time
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'NoverThinker API',
    version: '1.1.0',  // Updated for Sprint 2
    description: 'Professional Football Scouting Platform API',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      players: '/api/players',
      videos: '/api/videos',
      teams: '/api/teams',
      matches: '/api/matches',
      tasks: '/api/tasks',
      watchlist: '/api/watchlist',
      pulse: '/api/pulse'
    }
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/videos', videosRoutes);  // Sprint 2 - Videos API

// Placeholder routes (to be implemented)
app.use('/api/teams', (req, res) => {
  res.json({ message: 'Teams API - Coming soon', status: 'pending' });
});

app.use('/api/matches', (req, res) => {
  res.json({ message: 'Matches API - Coming soon', status: 'pending' });
});

app.use('/api/tasks', (req, res) => {
  res.json({ message: 'Tasks API - Coming soon', status: 'pending' });
});

app.use('/api/watchlist', (req, res) => {
  res.json({ message: 'Watchlist API - Coming soon', status: 'pending' });
});

app.use('/api/pulse', (req, res) => {
  res.json({ message: 'Pulse Feed API - Coming soon', status: 'pending' });
});

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// =============================================================================
// Server Startup
// =============================================================================

const startServer = async () => {
  try {
    // Test database connection
    console.log('🔌 Connecting to PostgreSQL...');
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connected');

    // Connect to Redis (optional - continues if fails)
    console.log('🔌 Connecting to Redis...');
    await connectRedis();

    // Start server
    app.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('  🚀 NoverThinker API Server (Sprint 2)');
      console.log('═══════════════════════════════════════════════════');
      console.log(`  🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  📡 Server:      http://localhost:${PORT}`);
      console.log(`  💚 Health:      http://localhost:${PORT}/health`);
      console.log(`  📚 API:         http://localhost:${PORT}/api`);
      console.log('═══════════════════════════════════════════════════');
      console.log('');
      console.log('📋 Auth Endpoints:');
      console.log('  POST   /api/auth/register     - Register new user');
      console.log('  POST   /api/auth/login        - Login user');
      console.log('  POST   /api/auth/refresh      - Refresh token');
      console.log('  POST   /api/auth/logout       - Logout user');
      console.log('  GET    /api/auth/me           - Get current user');
      console.log('');
      console.log('📋 Players Endpoints:');
      console.log('  GET    /api/players           - Get players (Agent Radar)');
      console.log('  GET    /api/players/discover  - Discover players (Agent)');
      console.log('  GET    /api/players/radar     - Player Radar feed (Player) [NEW]');
      console.log('  GET    /api/players/me        - Get my profile (Player) [NEW]');
      console.log('  PUT    /api/players/me        - Update my profile (Player) [NEW]');
      console.log('  GET    /api/players/:id       - Get player profile');
      console.log('  GET    /api/players/:id/analytics - Get analytics (Agent)');
      console.log('  POST   /api/players/:id/follow    - Follow player (Player) [NEW]');
      console.log('  DELETE /api/players/:id/follow    - Unfollow player (Player) [NEW]');
      console.log('  POST   /api/players/compare   - Compare players (Agent)');
      console.log('');
      console.log('📋 Videos Endpoints: [NEW - Sprint 2]');
      console.log('  GET    /api/videos/feed       - Video feed (Player)');
      console.log('  GET    /api/videos/:id        - Get video details');
      console.log('  POST   /api/videos/:id/like   - Like video (Player)');
      console.log('  DELETE /api/videos/:id/like   - Unlike video (Player)');
      console.log('  GET    /api/videos/:id/comments - Get comments');
      console.log('  POST   /api/videos/:id/comment  - Add comment (Player)');
      console.log('═══════════════════════════════════════════════════');
      console.log('');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;