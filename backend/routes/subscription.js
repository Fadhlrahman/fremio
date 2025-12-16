/**
 * Subscription Routes - Simple Free vs Paid Model
 * Handle subscription management and Midtrans integration
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { 
  getSubscriptionStatus, 
  activateSubscription, 
  cancelSubscription 
} = require('../middleware/subscription');

/**
 * GET /api/subscription/status
 * Get current user subscription status
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.email;
    const status = await getSubscriptionStatus(userId);
    
    res.json({
      ...status,
      userId
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

/**
 * GET /api/subscription/plans
 * Get available subscription plans
 */
router.get('/plans', async (req, res) => {
  try {
    // Get count of premium frames for display
    const [premiumCount] = await db.query(
      'SELECT COUNT(*) as count FROM frames WHERE is_premium = TRUE AND status = "active"'
    );
    
    const plans = [
      {
        id: 'paid_monthly',
        name: 'Paid Monthly',
        type: 'paid',
        billingCycle: 'monthly',
        price: 49000,
        currency: 'IDR',
        features: [
          `Access to ALL ${premiumCount[0].count}+ Premium Frames`,
          'Unlimited downloads',
          'New frames every week',
          'High-quality templates',
          'Priority support',
          'Cancel anytime'
        ],
        popular: true
      },
      {
        id: 'paid_annual',
        name: 'Paid Annual',
        type: 'paid',
        billingCycle: 'annual',
        price: 490000,
        currency: 'IDR',
        savings: '16% OFF',
        pricePerMonth: 40833,
        features: [
          `Access to ALL ${premiumCount[0].count}+ Premium Frames`,
          'Unlimited downloads',
          'New frames every week',
          'High-quality templates',
          'Priority support',
          'Cancel anytime',
          '2 months FREE'
        ],
        popular: false
      }
    ];
    
    res.json({ plans });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to get plans' });
  }
});

/**
 * POST /api/subscription/create-transaction
 * Create Midtrans transaction for subscription
 */
router.post('/create-transaction', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.email;
    const { planId } = req.body;
    
    if (!planId) {
      return res.status(400).json({ error: 'Plan ID required' });
    }
    
    // Validate plan
    const validPlans = ['paid_monthly', 'paid_annual'];
    if (!validPlans.includes(planId)) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }
    
    // Get plan details
    const amount = planId === 'paid_annual' ? 490000 : 49000;
    const orderId = `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save transaction to database
    await db.query(
      `INSERT INTO transactions 
       (order_id, user_id, plan_id, amount, status) 
       VALUES (?, ?, ?, ?, 'pending')`,
      [orderId, userId, planId, amount]
    );
    
    // TODO: Integrate with Midtrans Snap API
    // For now, return mock response
    const mockSnapToken = `snap_${Date.now()}`;
    const mockSnapUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${mockSnapToken}`;
    
    console.log(`📝 Transaction created: ${orderId} for user ${userId}`);
    
    res.json({
      orderId,
      snapToken: mockSnapToken,
      snapUrl: mockSnapUrl,
      amount,
      planId,
      message: 'Transaction created. TODO: Integrate real Midtrans API'
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

/**
 * POST /api/subscription/midtrans-notification
 * Webhook for Midtrans payment notification
 */
router.post('/midtrans-notification', async (req, res) => {
  try {
    const {
      order_id,
      transaction_status,
      fraud_status,
      transaction_id,
      payment_type,
      gross_amount
    } = req.body;
    
    console.log('📬 Midtrans notification:', {
      order_id,
      transaction_status,
      fraud_status
    });
    
    // Update transaction status
    await db.query(
      `UPDATE transactions 
       SET status = ?,
           midtrans_transaction_id = ?,
           payment_type = ?,
           updated_at = NOW()
       WHERE order_id = ?`,
      [transaction_status, transaction_id, payment_type, order_id]
    );
    
    // If payment success, activate subscription
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      if (fraud_status === 'accept' || !fraud_status) {
        // Get transaction details
        const [transactions] = await db.query(
          'SELECT user_id, plan_id FROM transactions WHERE order_id = ?',
          [order_id]
        );
        
        if (transactions.length > 0) {
          const { user_id, plan_id } = transactions[0];
          await activateSubscription(user_id, plan_id);
          
          console.log(`✅ Payment successful - Subscription activated for user ${user_id}`);
        }
      }
    }
    
    res.json({ message: 'Notification processed' });
  } catch (error) {
    console.error('Midtrans notification error:', error);
    res.status(500).json({ error: 'Failed to process notification' });
  }
});

/**
 * POST /api/subscription/cancel
 * Cancel active subscription
 */
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.email;
    
    await cancelSubscription(userId);
    
    res.json({ 
      message: 'Subscription cancelled. You can still access premium frames until expiry date.'
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * GET /api/subscription/history
 * Get user transaction history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.email;
    
    const [transactions] = await db.query(
      `SELECT order_id, plan_id, amount, status, payment_type, created_at 
       FROM transactions 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [userId]
    );
    
    res.json({ transactions });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({ error: 'Failed to get transaction history' });
  }
});

module.exports = router;
