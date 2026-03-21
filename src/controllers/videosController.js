// =============================================================================
// NoverThinker - Videos Controller (Sprint 2)
// =============================================================================

const { query } = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// =============================================================================
// VIDEO FEED FOR PLAYER RADAR
// =============================================================================

// @desc    Get videos for Player Radar feed
// @route   GET /api/videos/feed
// @access  Private (Player)
const getVideoFeed = asyncHandler(async (req, res) => {
  const {
    feed_type = 'global', // 'global', 'friends', 'teammates'
    page = 1,
    limit = 20
  } = req.query;

  const offset = (page - 1) * limit;
  const userId = req.user.id;

  // Get player profile
  const playerResult = await query(
    'SELECT id FROM player_profiles WHERE user_id = $1',
    [userId]
  );

  if (playerResult.rows.length === 0) {
    throw new AppError('Player profile not found', 404);
  }

  const playerId = playerResult.rows[0].id;

  let videosQuery;
  let queryParams;

  switch (feed_type) {
    case 'friends':
      // Videos from players I follow
      videosQuery = `
        SELECT 
          v.id as video_id,
          v.title,
          v.description,
          v.category,
          v.video_url,
          v.thumbnail_url,
          v.duration_seconds,
          v.views_count,
          v.likes_count,
          v.comments_count,
          v.created_at as uploaded_at,
          pp.id as player_id,
          u.first_name,
          u.last_name,
          u.avatar_url as profile_picture,
          pp.primary_position as position,
          pp.nova_score,
          pp.stars,
          pp.discipline_score,
          t.name as team_name,
          c.name as club_name,
          EXISTS(SELECT 1 FROM video_likes vl WHERE vl.video_id = v.id AND vl.user_id = $1) as is_liked
        FROM videos v
        JOIN player_profiles pp ON pp.id = v.player_id
        JOIN users u ON u.id = pp.user_id
        LEFT JOIN team_players tp ON tp.player_id = pp.id AND tp.is_active = true
        LEFT JOIN teams t ON t.id = tp.team_id
        LEFT JOIN clubs c ON c.id = t.club_id
        WHERE v.status = 'approved'
          AND v.visibility = 'public'
          AND pp.id IN (
            SELECT following_id FROM player_follows WHERE follower_id = $2
          )
        ORDER BY v.created_at DESC
        LIMIT $3 OFFSET $4
      `;
      queryParams = [userId, playerId, parseInt(limit), offset];
      break;

    case 'teammates':
      // Videos from my team
      videosQuery = `
        SELECT 
          v.id as video_id,
          v.title,
          v.description,
          v.category,
          v.video_url,
          v.thumbnail_url,
          v.duration_seconds,
          v.views_count,
          v.likes_count,
          v.comments_count,
          v.created_at as uploaded_at,
          pp.id as player_id,
          u.first_name,
          u.last_name,
          u.avatar_url as profile_picture,
          pp.primary_position as position,
          pp.nova_score,
          pp.stars,
          pp.discipline_score,
          t.name as team_name,
          c.name as club_name,
          EXISTS(SELECT 1 FROM video_likes vl WHERE vl.video_id = v.id AND vl.user_id = $1) as is_liked
        FROM videos v
        JOIN player_profiles pp ON pp.id = v.player_id
        JOIN users u ON u.id = pp.user_id
        LEFT JOIN team_players tp ON tp.player_id = pp.id AND tp.is_active = true
        LEFT JOIN teams t ON t.id = tp.team_id
        LEFT JOIN clubs c ON c.id = t.club_id
        WHERE v.status = 'approved'
          AND v.visibility IN ('public', 'team_only')
          AND tp.team_id IN (
            SELECT team_id FROM team_players WHERE player_id = $2 AND is_active = true
          )
          AND pp.id != $2
        ORDER BY v.created_at DESC
        LIMIT $3 OFFSET $4
      `;
      queryParams = [userId, playerId, parseInt(limit), offset];
      break;

    default: // 'global'
      // Global feed - algorithmic based on Player Radar Algorithm
      // 30% NovaScore proximity, 20% Position/Age match, 25% Activity, 15% Trend, 10% Random
      videosQuery = `
        SELECT 
          v.id as video_id,
          v.title,
          v.description,
          v.category,
          v.video_url,
          v.thumbnail_url,
          v.duration_seconds,
          v.views_count,
          v.likes_count,
          v.comments_count,
          v.created_at as uploaded_at,
          pp.id as player_id,
          u.first_name,
          u.last_name,
          u.avatar_url as profile_picture,
          pp.primary_position as position,
          pp.nova_score,
          pp.nova_score_trend,
          pp.stars,
          pp.discipline_score,
          pp.age_group,
          t.name as team_name,
          c.name as club_name,
          EXISTS(SELECT 1 FROM video_likes vl WHERE vl.video_id = v.id AND vl.user_id = $1) as is_liked,
          EXISTS(SELECT 1 FROM player_follows pf WHERE pf.follower_id = $2 AND pf.following_id = pp.id) as is_following
        FROM videos v
        JOIN player_profiles pp ON pp.id = v.player_id
        JOIN users u ON u.id = pp.user_id
        LEFT JOIN team_players tp ON tp.player_id = pp.id AND tp.is_active = true
        LEFT JOIN teams t ON t.id = tp.team_id
        LEFT JOIN clubs c ON c.id = t.club_id
        WHERE v.status = 'approved'
          AND v.visibility = 'public'
          AND pp.id != $2
        ORDER BY 
          -- Algorithmic scoring for Player Radar
          (
            -- 25% Activity (recent uploads)
            CASE WHEN v.created_at > NOW() - INTERVAL '7 days' THEN 25 ELSE 10 END +
            -- 15% Trend (positive trend players)
            CASE WHEN pp.nova_score_trend > 0 THEN 15 ELSE 5 END +
            -- 10% Random factor
            (RANDOM() * 10)
          ) DESC,
          v.created_at DESC
        LIMIT $3 OFFSET $4
      `;
      queryParams = [userId, playerId, parseInt(limit), offset];
  }

  const videosResult = await query(videosQuery, queryParams);

  // Get total count for pagination
  let countQuery;
  let countParams;

  switch (feed_type) {
    case 'friends':
      countQuery = `
        SELECT COUNT(*) as total
        FROM videos v
        JOIN player_profiles pp ON pp.id = v.player_id
        WHERE v.status = 'approved'
          AND v.visibility = 'public'
          AND pp.id IN (SELECT following_id FROM player_follows WHERE follower_id = $1)
      `;
      countParams = [playerId];
      break;
    case 'teammates':
      countQuery = `
        SELECT COUNT(*) as total
        FROM videos v
        JOIN player_profiles pp ON pp.id = v.player_id
        LEFT JOIN team_players tp ON tp.player_id = pp.id AND tp.is_active = true
        WHERE v.status = 'approved'
          AND v.visibility IN ('public', 'team_only')
          AND tp.team_id IN (SELECT team_id FROM team_players WHERE player_id = $1 AND is_active = true)
          AND pp.id != $1
      `;
      countParams = [playerId];
      break;
    default:
      countQuery = `
        SELECT COUNT(*) as total
        FROM videos v
        JOIN player_profiles pp ON pp.id = v.player_id
        WHERE v.status = 'approved'
          AND v.visibility = 'public'
          AND pp.id != $1
      `;
      countParams = [playerId];
  }

  const countResult = await query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].total);

  res.json({
    success: true,
    data: {
      feed_type,
      videos: videosResult.rows.map(v => ({
        video_id: v.video_id,
        title: v.title,
        description: v.description,
        category: v.category,
        video_url: v.video_url,
        thumbnail_url: v.thumbnail_url,
        duration_seconds: v.duration_seconds,
        views_count: v.views_count,
        likes_count: v.likes_count,
        comments_count: v.comments_count,
        uploaded_at: v.uploaded_at,
        is_liked: v.is_liked,
        is_following: v.is_following || false,
        player: {
          player_id: v.player_id,
          name: `${v.first_name} ${v.last_name}`,
          first_name: v.first_name,
          last_name: v.last_name,
          profile_picture: v.profile_picture,
          position: v.position,
          nova_score: parseFloat(v.nova_score),
          nova_score_trend: parseFloat(v.nova_score_trend || 0),
          stars: parseFloat(v.stars),
          discipline_score: v.discipline_score,
          age_group: v.age_group,
          team: v.team_name,
          club: v.club_name
        }
      })),
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_videos: total,
        limit: parseInt(limit)
      }
    }
  });
});

// =============================================================================
// LIKES
// =============================================================================

// @desc    Like a video
// @route   POST /api/videos/:id/like
// @access  Private (Player)
const likeVideo = asyncHandler(async (req, res) => {
  const { id: videoId } = req.params;
  const userId = req.user.id;

  // Check if video exists
  const videoResult = await query(
    'SELECT id, likes_count FROM videos WHERE id = $1',
    [videoId]
  );

  if (videoResult.rows.length === 0) {
    throw new AppError('Video not found', 404);
  }

  // Check if already liked
  const existingLike = await query(
    'SELECT id FROM video_likes WHERE video_id = $1 AND user_id = $2',
    [videoId, userId]
  );

  if (existingLike.rows.length > 0) {
    throw new AppError('You already liked this video', 400);
  }

  // Add like
  await query(
    'INSERT INTO video_likes (video_id, user_id) VALUES ($1, $2)',
    [videoId, userId]
  );

  // Update likes count
  await query(
    'UPDATE videos SET likes_count = likes_count + 1 WHERE id = $1',
    [videoId]
  );

  res.status(201).json({
    success: true,
    message: 'Video liked successfully',
    data: {
      video_id: videoId,
      likes_count: videoResult.rows[0].likes_count + 1
    }
  });
});

// @desc    Unlike a video
// @route   DELETE /api/videos/:id/like
// @access  Private (Player)
const unlikeVideo = asyncHandler(async (req, res) => {
  const { id: videoId } = req.params;
  const userId = req.user.id;

  // Check if like exists
  const existingLike = await query(
    'SELECT id FROM video_likes WHERE video_id = $1 AND user_id = $2',
    [videoId, userId]
  );

  if (existingLike.rows.length === 0) {
    throw new AppError('You have not liked this video', 400);
  }

  // Remove like
  await query(
    'DELETE FROM video_likes WHERE video_id = $1 AND user_id = $2',
    [videoId, userId]
  );

  // Update likes count
  const updatedVideo = await query(
    'UPDATE videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1 RETURNING likes_count',
    [videoId]
  );

  res.json({
    success: true,
    message: 'Video unliked successfully',
    data: {
      video_id: videoId,
      likes_count: updatedVideo.rows[0].likes_count
    }
  });
});

// =============================================================================
// COMMENTS
// =============================================================================

// @desc    Add comment to video
// @route   POST /api/videos/:id/comment
// @access  Private (Player)
const addComment = asyncHandler(async (req, res) => {
  const { id: videoId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content || content.trim().length === 0) {
    throw new AppError('Comment content is required', 400);
  }

  if (content.length > 500) {
    throw new AppError('Comment cannot exceed 500 characters', 400);
  }

  // Check if video exists
  const videoResult = await query(
    'SELECT id FROM videos WHERE id = $1',
    [videoId]
  );

  if (videoResult.rows.length === 0) {
    throw new AppError('Video not found', 404);
  }

  // Add comment
  const commentResult = await query(
    `INSERT INTO video_comments (video_id, user_id, content)
     VALUES ($1, $2, $3)
     RETURNING id, content, created_at`,
    [videoId, userId, content.trim()]
  );

  // Update comments count
  await query(
    'UPDATE videos SET comments_count = comments_count + 1 WHERE id = $1',
    [videoId]
  );

  // Get user info for response
  const userResult = await query(
    'SELECT first_name, last_name, avatar_url FROM users WHERE id = $1',
    [userId]
  );

  res.status(201).json({
    success: true,
    message: 'Comment added successfully',
    data: {
      comment: {
        id: commentResult.rows[0].id,
        content: commentResult.rows[0].content,
        created_at: commentResult.rows[0].created_at,
        user: {
          id: userId,
          name: `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`,
          avatar_url: userResult.rows[0].avatar_url
        }
      }
    }
  });
});

// @desc    Get comments for a video
// @route   GET /api/videos/:id/comments
// @access  Public
const getComments = asyncHandler(async (req, res) => {
  const { id: videoId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  // Check if video exists
  const videoResult = await query(
    'SELECT id FROM videos WHERE id = $1',
    [videoId]
  );

  if (videoResult.rows.length === 0) {
    throw new AppError('Video not found', 404);
  }

  // Get comments
  const commentsResult = await query(
    `SELECT 
       vc.id,
       vc.content,
       vc.is_edited,
       vc.created_at,
       vc.updated_at,
       u.id as user_id,
       u.first_name,
       u.last_name,
       u.avatar_url
     FROM video_comments vc
     JOIN users u ON u.id = vc.user_id
     WHERE vc.video_id = $1
     ORDER BY vc.created_at DESC
     LIMIT $2 OFFSET $3`,
    [videoId, parseInt(limit), offset]
  );

  // Get total count
  const countResult = await query(
    'SELECT COUNT(*) as total FROM video_comments WHERE video_id = $1',
    [videoId]
  );

  const total = parseInt(countResult.rows[0].total);

  res.json({
    success: true,
    data: {
      comments: commentsResult.rows.map(c => ({
        id: c.id,
        content: c.content,
        is_edited: c.is_edited,
        created_at: c.created_at,
        updated_at: c.updated_at,
        user: {
          id: c.user_id,
          name: `${c.first_name} ${c.last_name}`,
          avatar_url: c.avatar_url
        }
      })),
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_comments: total
      }
    }
  });
});

// @desc    Get single video details
// @route   GET /api/videos/:id
// @access  Public
const getVideo = asyncHandler(async (req, res) => {
  const { id: videoId } = req.params;
  const userId = req.user?.id;

  const videoResult = await query(
    `SELECT 
       v.*,
       pp.id as player_id,
       u.first_name,
       u.last_name,
       u.avatar_url as profile_picture,
       pp.primary_position as position,
       pp.nova_score,
       pp.stars,
       pp.discipline_score,
       t.name as team_name,
       c.name as club_name
     FROM videos v
     JOIN player_profiles pp ON pp.id = v.player_id
     JOIN users u ON u.id = pp.user_id
     LEFT JOIN team_players tp ON tp.player_id = pp.id AND tp.is_active = true
     LEFT JOIN teams t ON t.id = tp.team_id
     LEFT JOIN clubs c ON c.id = t.club_id
     WHERE v.id = $1`,
    [videoId]
  );

  if (videoResult.rows.length === 0) {
    throw new AppError('Video not found', 404);
  }

  const video = videoResult.rows[0];

  // Check if liked by current user
  let isLiked = false;
  if (userId) {
    const likeResult = await query(
      'SELECT id FROM video_likes WHERE video_id = $1 AND user_id = $2',
      [videoId, userId]
    );
    isLiked = likeResult.rows.length > 0;
  }

  // Increment view count
  await query(
    'UPDATE videos SET views_count = views_count + 1 WHERE id = $1',
    [videoId]
  );

  res.json({
    success: true,
    data: {
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        category: video.category,
        video_url: video.video_url,
        thumbnail_url: video.thumbnail_url,
        duration_seconds: video.duration_seconds,
        views_count: video.views_count + 1,
        likes_count: video.likes_count,
        comments_count: video.comments_count,
        created_at: video.created_at,
        is_liked: isLiked,
        player: {
          player_id: video.player_id,
          name: `${video.first_name} ${video.last_name}`,
          profile_picture: video.profile_picture,
          position: video.position,
          nova_score: parseFloat(video.nova_score),
          stars: parseFloat(video.stars),
          team: video.team_name,
          club: video.club_name
        }
      }
    }
  });
});

module.exports = {
  getVideoFeed,
  getVideo,
  likeVideo,
  unlikeVideo,
  addComment,
  getComments
};