/**
 * Subscription Middleware - Simple Free vs Paid Model
 * Check if user has active subscription to access paid frames
 */

const db = require('../config/database');

/**
 * Check if user has active subscription
 * Adds subscription info to req object
 */
const checkSubscription = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.email;
    
    if (!userId) {
      // Not logged in - can only access free content
      req.hasSubscription = false;
      req.subscription = null;
      return next();
    }
    
    // Check for active subscription
    const [subscriptions] = await db.query(
      `SELECT * FROM subscriptions 
       WHERE user_id = ? 
       AND status = 'active' 
       AND expires_at > NOW() 
       ORDER BY expires_at DESC 
       LIMIT 1`,
      [userId]
    );
    
    req.subscription = subscriptions[0] || null;
    req.hasSubscription = subscriptions.length > 0;
    
    console.log(`User ${userId} subscription status:`, req.hasSubscription ? 'ACTIVE' : 'NONE');
    
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    req.subscription = null;
    req.hasSubscription = false;
    next();
  }
};

/**
 * Require active subscription (middleware)
 * Use this to protect paid content endpoints
 */
const requireSubscription = (req, res, next) => {
  if (!req.hasSubscription) {
    return res.status(403).json({ 
      error: 'Subscription required',
      message: 'You need an active subscription to access this content',
      redirect: '/pricing'
    });
  }
  
  next();
};

/**
 * Get user subscription status
 */
const getSubscriptionStatus = async (userId) => {
  try {
    const [subscriptions] = await db.query(
      `SELECT * FROM subscriptions 
       WHERE user_id = ? 
       AND status = 'active' 
       AND expires_at > NOW() 
       ORDER BY expires_at DESC 
       LIMIT 1`,
      [userId]
    );
    
    return {
      hasSubscription: subscriptions.length > 0,
      subscription: subscriptions[0] || null,
      isActive: subscriptions.length > 0 && subscriptions[0].status === 'active'
    };
  } catch (error) {
    console.error('Get subscription error:', error);
    return {
      hasSubscription: false,
      subscription: null,
      isActive: false
    };
  }
};

/**
 * Activate subscription after successful payment
 */
const activateSubscription = async (userId, planId) => {
  try {
    const billingCycle = planId.includes('annual') ? 'annual' : 'monthly';
    
    // Calculate expiry date
    const expiresAt = new Date();
    if (billingCycle === 'annual') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }
    
    // Check if user already has active subscription
    const [existing] = await db.query(
      `SELECT * FROM subscriptions 
       WHERE user_id = ? 
       AND status = 'active' 
       ORDER BY expires_at DESC 
       LIMIT 1`,
      [userId]
    );
    
    if (existing.length > 0) {
      // Extend existing subscription
      const newExpiresAt = new Date(existing[0].expires_at);
      if (billingCycle === 'annual') {
        newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1);
      } else {
        newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);
      }
      
      await db.query(
        `UPDATE subscriptions 
         SET expires_at = ?, 
             billing_cycle = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [newExpiresAt, billingCycle, existing[0].id]
      );
      
      console.log(`✅ Subscription extended for user ${userId} until ${newExpiresAt}`);
    } else {
      // Create new subscription
      await db.query(
        `INSERT INTO subscriptions 
         (user_id, plan_type, billing_cycle, status, expires_at) 
         VALUES (?, 'paid', ?, 'active', ?)`,
        [userId, billingCycle, expiresAt]
      );
      
      console.log(`✅ New subscription created for user ${userId} until ${expiresAt}`);
    }
    
    return true;
  } catch (error) {
    console.error('Activate subscription error:', error);
    throw error;
  }
};

/**
 * Cancel subscription
 */
const cancelSubscription = async (userId) => {
  try {
    await db.query(
      `UPDATE subscriptions 
       SET status = 'cancelled', 
           auto_renew = FALSE,
           updated_at = NOW()
       WHERE user_id = ? 
       AND status = 'active'`,
      [userId]
    );
    
    console.log(`❌ Subscription cancelled for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Cancel subscription error:', error);
    throw error;
  }
};

/**
 * Check and expire old subscriptions (cron job)
 */
const expireOldSubscriptions = async () => {
  try {
    const [result] = await db.query(
      `UPDATE subscriptions 
       SET status = 'expired', updated_at = NOW()
       WHERE status = 'active' 
       AND expires_at < NOW()`
    );
    
    console.log(`🕐 Expired ${result.affectedRows} old subscriptions`);
    return result.affectedRows;
  } catch (error) {
    console.error('Expire subscriptions error:', error);
    throw error;
  }
};

module.exports = {
  checkSubscription,
  requireSubscription,
  getSubscriptionStatus,
  activateSubscription,
  cancelSubscription,
  expireOldSubscriptions
};
