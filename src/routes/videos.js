// =============================================================================
// NoverThinker - Videos Routes (SPRINT 2)
// =============================================================================

const express = require('express');
const router = express.Router();
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const {
  getVideoFeed,
  getVideo,
  likeVideo,
  unlikeVideo,
  addComment,
  getComments
} = require('../controllers/videosController');

// =============================================================================
// VIDEO FEED - Player Radar
// =============================================================================

// Get video feed (Global/Friends/Teammates)
router.get('/feed', authenticate, authorize('player'), getVideoFeed);

// =============================================================================
// SINGLE VIDEO
// =============================================================================

// Get single video details (public with optional auth for personalization)
router.get('/:id', validate(schemas.uuidParam), optionalAuth, getVideo);

// =============================================================================
// COMMENTS
// =============================================================================

// Get comments (public)
router.get('/:id/comments', validate(schemas.uuidParam), getComments);

// Add comment (player only)
router.post('/:id/comment', validate(schemas.uuidParam), authenticate, authorize('player'), addComment);

// =============================================================================
// LIKES
// =============================================================================

// Like video (player only)
router.post('/:id/like', validate(schemas.uuidParam), authenticate, authorize('player'), likeVideo);

// Unlike video (player only)
router.delete('/:id/like', validate(schemas.uuidParam), authenticate, authorize('player'), unlikeVideo);

module.exports = router;