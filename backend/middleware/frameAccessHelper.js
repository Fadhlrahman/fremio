/**
 * Frame Access Helper - Add to existing frames.js route
 * This code checks subscription and filters frames based on access level
 * 
 * INTEGRATION INSTRUCTIONS:
 * 1. Add checkSubscription middleware to GET /api/frames route
 * 2. Filter is_premium frames if user has no subscription
 * 3. Add access check to GET /api/frames/:id route
 */

// EXAMPLE: How to integrate into existing frames.js

/* 
// At top of frames.js, add:
import { checkSubscription } from '../middleware/subscription.js';

// Update GET /api/frames route:
router.get(
  "/",
  optionalAuth,
  checkSubscription,  // ADD THIS
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const category = req.query.category;
      const offset = (page - 1) * limit;
      
      // ADD SUBSCRIPTION FILTER
      const hasSubscription = req.hasSubscription || false;

      let queryText = `
        SELECT id, name, description, category, image_path, thumbnail_path, 
               slots, max_captures, is_premium, is_active, view_count, 
               download_count, created_by, created_at, updated_at,
               layout, canvas_background, canvas_width, canvas_height, display_order
        FROM frames 
        WHERE is_active = true
      `;
      const queryParams = [];
      let paramIndex = 1;
      
      // If no subscription, only show free frames
      if (!hasSubscription) {
        queryText += ` AND is_premium = false`;
      }

      if (category) {
        queryText += ` AND category = $${paramIndex}`;
        queryParams.push(category);
        paramIndex++;
      }

      queryText += ` ORDER BY display_order ASC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await pool.query(queryText, queryParams);
      
      // ... rest of existing code ...
      
      res.json({
        frames: frames,
        hasSubscription: hasSubscription,  // ADD THIS
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      // ... error handling ...
    }
  }
);

// Update GET /api/frames/:id route:
router.get(
  "/:id",
  optionalAuth,
  checkSubscription,  // ADD THIS
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT * FROM frames WHERE id = $1 AND is_active = true`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Frame not found" });
      }

      const frame = result.rows[0];
      
      // ADD ACCESS CHECK FOR PREMIUM FRAMES
      if (frame.is_premium && !req.hasSubscription) {
        return res.status(403).json({
          error: 'Subscription required',
          message: 'This frame requires an active subscription',
          redirect: '/pricing',
          frame: {
            id: frame.id,
            name: frame.name,
            is_premium: frame.is_premium,
            thumbnail_path: frame.thumbnail_path
          }
        });
      }

      // ... rest of existing code ...
    }
  }
);
*/

// SUBSCRIPTION CHECK UTILITY FUNCTIONS

/**
 * Check if user has subscription access to frame
 */
const canAccessFrame = (frame, hasSubscription) => {
  // Free frames: accessible to everyone
  if (!frame.is_premium) return true;
  
  // Premium frames: require subscription
  return hasSubscription;
};

/**
 * Filter frames based on subscription status
 */
const filterFramesBySubscription = (frames, hasSubscription) => {
  if (hasSubscription) {
    // Show all frames
    return frames;
  }
  
  // Show only free frames
  return frames.filter(frame => !frame.is_premium);
};

/**
 * Add subscription metadata to frame response
 */
const addSubscriptionMetadata = (frame, hasSubscription) => {
  return {
    ...frame,
    isLocked: frame.is_premium && !hasSubscription,
    requiresSubscription: frame.is_premium,
    accessLevel: frame.is_premium ? 'PAID' : 'FREE'
  };
};

module.exports = {
  canAccessFrame,
  filterFramesBySubscription,
  addSubscriptionMetadata
};

// NOTE: These are helper functions for integration
// The actual subscription checking is done by checkSubscription middleware
