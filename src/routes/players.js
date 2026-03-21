// =============================================================================
// NoverThinker - Players Routes (SPRINT 2 - COMPLETO)
// =============================================================================

const express = require('express');
const router = express.Router();
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const {
  getPlayers,
  getPlayer,
  getPlayerAnalytics,
  discoverPlayers,
  comparePlayers,
  updatePlayer,
  deletePlayer,
  // Sprint 2 additions
  getPlayerRadar,
  followPlayer,
  unfollowPlayer,
  getMyProfile,
  updateMyProfile
} = require('../controllers/playersController');

// =============================================================================
// SPRINT 2 - Player-specific routes (MUST be before /:id routes!)
// =============================================================================

// My Profile
router.get('/me', authenticate, authorize('player'), getMyProfile);
router.put('/me', authenticate, authorize('player'), updateMyProfile);

// Player Radar (different algorithm from Agent's getPlayers)
router.get('/radar', authenticate, authorize('player'), getPlayerRadar);

// Follow/Unfollow
router.post('/:id/follow', validate(schemas.uuidParam), authenticate, authorize('player'), followPlayer);
router.delete('/:id/follow', validate(schemas.uuidParam), authenticate, authorize('player'), unfollowPlayer);

// =============================================================================
// EXISTING ROUTES (Sprint 1)
// =============================================================================

// Public routes (with optional auth for personalization)
router.get('/', optionalAuth, getPlayers);
router.get('/discover', authenticate, authorize('agent', 'admin'), discoverPlayers);
router.get('/:id', validate(schemas.uuidParam), optionalAuth, getPlayer);

// Agent-only routes
router.get('/:id/analytics', validate(schemas.uuidParam), authenticate, authorize('agent', 'admin'), getPlayerAnalytics);
router.post('/compare', authenticate, authorize('agent', 'admin'), comparePlayers);

// Admin-only routes
router.put('/:id', validate(schemas.uuidParam), authenticate, authorize('admin'), updatePlayer);
router.delete('/:id', validate(schemas.uuidParam), authenticate, authorize('admin'), deletePlayer);

module.exports = router;