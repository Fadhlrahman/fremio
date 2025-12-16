# SUBSCRIPTION SYSTEM - READY FOR TESTING
## Simple 2-Tier Model: FREE vs PAID

**Status:** ✅ Built - NOT YET DEPLOYED  
**Last Updated:** 2024

---

## 📋 OVERVIEW

Fremio now has a subscription system with **2 simple tiers**:

1. **FREE** - Basic frames accessible to everyone
2. **PAID** - Premium frames requiring subscription

**Key Principle:** Users with paid subscription get access to ALL paid frames (not per-frame pricing).

---

## 🗄️ DATABASE SCHEMA

### File: `backend/migrations/add_subscription_system.sql`

**Tables Created:**

1. **frames** (modified)
   - Added `is_premium BOOLEAN DEFAULT FALSE`
   - Added `description TEXT`
   - FREE frames: `is_premium = FALSE`
   - PAID frames: `is_premium = TRUE`

2. **subscriptions**
   ```sql
   - id (PRIMARY KEY)
   - user_id (FK to users.email)
   - plan_type ('paid')
   - billing_cycle ('monthly' or 'annual')
   - status ('active', 'expired', 'cancelled')
   - expires_at (DATETIME)
   - auto_renew (BOOLEAN)
   - created_at, updated_at
   ```

3. **transactions**
   ```sql
   - id (PRIMARY KEY)
   - order_id (UNIQUE)
   - user_id (FK to users.email)
   - plan_id ('paid_monthly' or 'paid_annual')
   - amount (DECIMAL)
   - status ('pending', 'settlement', 'failed', etc)
   - midtrans_transaction_id
   - payment_type
   - created_at, updated_at
   ```

**To Apply Schema:**
```bash
cd /var/www/fremio-backend
mysql -u root -p fremio < migrations/add_subscription_system.sql
```

---

## 🔧 BACKEND FILES CREATED

### 1. Subscription Middleware
**File:** `backend/middleware/subscription.js`

**Functions:**
- `checkSubscription` - Middleware to check user subscription status
- `requireSubscription` - Protect paid content endpoints
- `getSubscriptionStatus(userId)` - Get user subscription info
- `activateSubscription(userId, planId)` - Activate after payment
- `cancelSubscription(userId)` - Cancel active subscription
- `expireOldSubscriptions()` - Cron job to expire old subscriptions

**Usage Example:**
```javascript
router.get('/frames', optionalAuth, checkSubscription, async (req, res) => {
  // req.hasSubscription = true/false
  // req.subscription = subscription object or null
});
```

### 2. Subscription Routes
**File:** `backend/routes/subscription.js`

**Endpoints:**
- `GET /api/subscription/status` - Get current user subscription
- `GET /api/subscription/plans` - Get available plans (monthly/annual)
- `POST /api/subscription/create-transaction` - Create Midtrans transaction
- `POST /api/subscription/midtrans-notification` - Webhook for payment
- `POST /api/subscription/cancel` - Cancel subscription
- `GET /api/subscription/history` - Get transaction history

### 3. Frame Access Helper
**File:** `backend/middleware/frameAccessHelper.js`

Helper functions and integration guide for existing frames.js route.

**To integrate into existing `backend/routes/frames.js`:**
```javascript
// Add to imports
import { checkSubscription } from '../middleware/subscription.js';

// Add to GET /api/frames
router.get("/", optionalAuth, checkSubscription, async (req, res) => {
  const hasSubscription = req.hasSubscription || false;
  
  // Add filter to query
  if (!hasSubscription) {
    queryText += ` AND is_premium = false`;
  }
  
  // Add to response
  res.json({
    frames: frames,
    hasSubscription: hasSubscription,
    // ...
  });
});

// Add to GET /api/frames/:id
router.get("/:id", optionalAuth, checkSubscription, async (req, res) => {
  // Check access
  if (frame.is_premium && !req.hasSubscription) {
    return res.status(403).json({
      error: 'Subscription required',
      redirect: '/pricing'
    });
  }
  // ...
});
```

---

## 🎨 FRONTEND FILES CREATED

### 1. Admin Upload Form
**Files:**
- `my-app/src/components/admin/UploadFrameForm.jsx`
- `my-app/src/components/admin/UploadFrameForm.css`

**Features:**
- Upload frame image (JPG, PNG, WebP)
- Set frame name, description, category
- Toggle FREE vs PAID with checkbox
- Visual indicator showing access level
- Form validation and preview

**API Endpoint:** `POST /api/frames/upload`

### 2. Pricing Page
**Files:**
- `my-app/src/pages/PricingPage.jsx`
- `my-app/src/pages/PricingPage.css`

**Features:**
- Display FREE tier (always available)
- Display PAID plans (monthly & annual)
- Show active subscription status
- Subscribe button with Midtrans integration (TODO)
- FAQ section
- Responsive design

**Pricing:**
- Monthly: Rp 49,000/month
- Annual: Rp 490,000/year (Rp 40,833/month - 16% OFF)

---

## 🔄 INTEGRATION STEPS

### Step 1: Apply Database Schema
```bash
ssh root@72.61.214.5
cd /var/www/fremio-backend
mysql -u root -p fremio < migrations/add_subscription_system.sql
```

### Step 2: Update Backend server.js
```javascript
// Add to backend/server.js
const subscriptionRoutes = require('./routes/subscription');
app.use('/api/subscription', subscriptionRoutes);
```

### Step 3: Update Frames Route
Follow integration guide in `backend/middleware/frameAccessHelper.js`

### Step 4: Add Frontend Routes
```javascript
// Add to my-app/src/App.jsx
import PricingPage from './pages/PricingPage';
import UploadFrameForm from './components/admin/UploadFrameForm';

<Route path="/pricing" element={<PricingPage />} />
<Route path="/admin/upload-frame" element={
  <RequireAuth requireAdmin>
    <UploadFrameForm />
  </RequireAuth>
} />
```

### Step 5: Add Navigation Links
```javascript
// Add to navigation menu
<Link to="/pricing">💎 Upgrade</Link>
```

---

## 💳 MIDTRANS INTEGRATION (TODO)

### What's Already Done:
- ✅ Transaction creation endpoint
- ✅ Webhook handler for payment notifications
- ✅ Database schema for transactions
- ✅ Subscription activation logic

### What Needs To Be Done:

1. **Install Midtrans SDK**
   ```bash
   cd backend
   npm install midtrans-client
   ```

2. **Add Midtrans Config**
   ```javascript
   // backend/config/midtrans.js
   const midtransClient = require('midtrans-client');
   
   const snap = new midtransClient.Snap({
     isProduction: false,
     serverKey: process.env.MIDTRANS_SERVER_KEY,
     clientKey: process.env.MIDTRANS_CLIENT_KEY
   });
   
   module.exports = snap;
   ```

3. **Update Transaction Creation**
   ```javascript
   // backend/routes/subscription.js
   const snap = require('../config/midtrans');
   
   const parameter = {
     transaction_details: {
       order_id: orderId,
       gross_amount: amount
     },
     customer_details: {
       email: userId
     }
   };
   
   const transaction = await snap.createTransaction(parameter);
   const snapToken = transaction.token;
   ```

4. **Add Midtrans Snap Script to Frontend**
   ```html
   <!-- my-app/index.html -->
   <script src="https://app.sandbox.midtrans.com/snap/snap.js" 
           data-client-key="YOUR_CLIENT_KEY"></script>
   ```

5. **Trigger Payment in Frontend**
   ```javascript
   // my-app/src/pages/PricingPage.jsx
   window.snap.pay(data.snapToken, {
     onSuccess: (result) => {
       console.log('Payment success:', result);
       navigate('/dashboard');
     },
     onPending: (result) => {
       console.log('Payment pending:', result);
     },
     onError: (result) => {
       console.log('Payment error:', result);
     }
   });
   ```

---

## 🎯 FRAME ACCESS FLOW

### User WITHOUT Subscription:
1. Visit `/frames` → See only FREE frames
2. Try to access PAID frame → 403 error + redirect to `/pricing`
3. Gallery shows lock icon 🔒 on PAID frames

### User WITH Subscription:
1. Visit `/frames` → See ALL frames (FREE + PAID)
2. Can access any PAID frame without restrictions
3. Gallery shows all frames as unlocked ✅

### Admin:
1. Visit `/admin/upload-frame`
2. Upload frame and toggle FREE/PAID
3. Frame immediately available to users (based on access level)

---

## 📊 SUBSCRIPTION LIFECYCLE

### 1. Purchase Flow:
```
User clicks "Subscribe" 
  → POST /api/subscription/create-transaction
  → Transaction created (status: pending)
  → Midtrans payment page opens
  → User completes payment
  → Midtrans sends webhook to /api/subscription/midtrans-notification
  → activateSubscription() called
  → Subscription created (status: active, expires_at: +1 month/year)
```

### 2. Active Subscription:
- User has `hasSubscription = true`
- Can access all PAID frames
- Subscription expires_at tracked in database

### 3. Expiry:
- Run cron job: `expireOldSubscriptions()`
- Changes status from 'active' to 'expired'
- User loses access to PAID frames
- Must renew to regain access

### 4. Cancellation:
```
User clicks "Cancel"
  → POST /api/subscription/cancel
  → Status changed to 'cancelled'
  → auto_renew = false
  → User keeps access until expires_at
  → After expires_at, loses access
```

---

## 🚀 TESTING CHECKLIST

### Database:
- [ ] Run migration SQL file
- [ ] Verify tables created (subscriptions, transactions)
- [ ] Verify frames table has is_premium column
- [ ] Insert test data

### Backend:
- [ ] Add subscription routes to server.js
- [ ] Test GET /api/subscription/plans
- [ ] Test GET /api/subscription/status (with/without auth)
- [ ] Test frame access with/without subscription
- [ ] Test admin frame upload with is_premium toggle

### Frontend:
- [ ] Add pricing page route
- [ ] Add admin upload form route
- [ ] Test pricing page displays correctly
- [ ] Test upload form works (FREE/PAID toggle)
- [ ] Test locked frame indicators in gallery
- [ ] Test redirect to pricing when accessing PAID frame

### Payment Flow (when Midtrans integrated):
- [ ] Test transaction creation
- [ ] Test payment page opens
- [ ] Test webhook receives payment notification
- [ ] Test subscription activates after payment
- [ ] Test access granted to PAID frames

---

## 📝 ENVIRONMENT VARIABLES NEEDED

Add to `backend/.env`:
```env
# Midtrans Configuration
MIDTRANS_SERVER_KEY=your_server_key
MIDTRANS_CLIENT_KEY=your_client_key
MIDTRANS_IS_PRODUCTION=false
```

---

## 🎨 PRICING STRATEGY

### Current Pricing:
- **Monthly:** Rp 49,000/month
- **Annual:** Rp 490,000/year (Rp 40,833/month - save 16%)

### Features Included:
- ✅ Access to ALL premium frames (no per-frame charges)
- ✅ Unlimited downloads
- ✅ New frames every week
- ✅ High-quality templates
- ✅ Priority support
- ✅ Cancel anytime

---

## 🛠️ MAINTENANCE

### Cron Jobs to Setup:

1. **Expire Old Subscriptions** (Run daily)
   ```bash
   # Add to crontab
   0 0 * * * curl -X POST http://localhost:8000/api/subscription/expire-old
   ```
   
   Or use PM2 cron:
   ```javascript
   // backend/cron/subscriptionCron.js
   const { expireOldSubscriptions } = require('../middleware/subscription');
   
   setInterval(async () => {
     await expireOldSubscriptions();
   }, 24 * 60 * 60 * 1000); // Run daily
   ```

---

## 📚 NEXT STEPS

### Immediate (Testing Phase):
1. ✅ Database schema created
2. ✅ Backend middleware created
3. ✅ Backend routes created
4. ✅ Frontend components created
5. 🔄 Integrate with existing frames route
6. 🔄 Add routes to App.jsx
7. 🔄 Test locally

### Before Production Deploy:
1. Integrate real Midtrans API
2. Test payment flow end-to-end
3. Add email notifications for subscription events
4. Setup cron job for expiring subscriptions
5. Add admin dashboard to view subscriptions
6. Test mobile responsiveness

### After Launch:
1. Monitor subscription conversions
2. A/B test pricing
3. Add more payment methods
4. Implement referral system
5. Add subscription analytics

---

## 📞 TROUBLESHOOTING

### Problem: Frames not filtered by subscription
**Solution:** Make sure `checkSubscription` middleware is added to frames route

### Problem: Payment webhook not working
**Solution:** 
1. Check Midtrans webhook URL is set to `https://api.fremio.id/api/subscription/midtrans-notification`
2. Verify server can receive POST requests
3. Check logs for webhook errors

### Problem: Subscription not activating after payment
**Solution:**
1. Check transaction status in database
2. Verify webhook received and processed
3. Check logs for `activateSubscription()` errors

---

## 🎉 SUMMARY

**What We've Built:**
- ✅ Simple 2-tier subscription system (FREE vs PAID)
- ✅ Database schema for subscriptions and transactions
- ✅ Backend middleware for subscription checking
- ✅ Backend routes for subscription management
- ✅ Admin form to upload FREE/PAID frames
- ✅ User-facing pricing page
- ✅ Frame access control based on subscription

**What's Left (Before Deploy):**
- 🔄 Integrate with existing frames route
- 🔄 Add routes to frontend App.jsx
- 🔄 Complete Midtrans payment integration
- 🔄 Test end-to-end flow
- 🔄 Setup cron job for expiring subscriptions

**Status:** Ready for integration and testing. **DO NOT DEPLOY YET.**

---

**Questions?** Review integration steps above or check individual file documentation.
