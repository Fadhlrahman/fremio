import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PricingPage.css';

/**
 * Pricing Page - Simple 2-Tier System
 * FREE frames vs PAID subscription (all premium frames)
 */
export default function PricingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [processingPlanId, setProcessingPlanId] = useState(null);

  useEffect(() => {
    fetchPlans();
    checkSubscriptionStatus();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscription/plans');
      const data = await response.json();
      setPlans(data.plans || []);
    } catch (error) {
      console.error('Fetch plans error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('fremio_token');
      if (!token) {
        setSubscriptionStatus({ hasSubscription: false });
        return;
      }

      const response = await fetch('/api/subscription/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data);
      }
    } catch (error) {
      console.error('Check subscription error:', error);
      setSubscriptionStatus({ hasSubscription: false });
    }
  };

  const handleSubscribe = async (planId) => {
    const token = localStorage.getItem('fremio_token');
    
    if (!token) {
      // Redirect to login
      navigate('/login?redirect=/pricing');
      return;
    }

    setProcessingPlanId(planId);

    try {
      const response = await fetch('/api/subscription/create-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      });

      const data = await response.json();

      if (response.ok) {
        // TODO: Open Midtrans payment page
        console.log('Transaction created:', data);
        
        // For now, show mock message
        alert(`Payment page will open here.\nOrder ID: ${data.orderId}\n\nTODO: Integrate Midtrans Snap`);
        
        // In production:
        // window.snap.pay(data.snapToken, {
        //   onSuccess: () => { navigate('/dashboard'); },
        //   onPending: () => { navigate('/payment-pending'); },
        //   onError: () => { alert('Payment failed'); }
        // });
      } else {
        alert(data.error || 'Failed to create transaction');
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      alert('Network error. Please try again.');
    } finally {
      setProcessingPlanId(null);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return (
      <div className="pricing-page loading">
        <div className="spinner-large"></div>
        <p>Loading pricing...</p>
      </div>
    );
  }

  return (
    <div className="pricing-page">
      <div className="pricing-container">
        {/* Header */}
        <div className="pricing-header">
          <h1>Choose Your Plan</h1>
          <p className="subtitle">
            Get unlimited access to all premium frames
          </p>
        </div>

        {/* Current Subscription Status */}
        {subscriptionStatus?.hasSubscription && (
          <div className="current-subscription-banner">
            <div className="banner-content">
              <span className="icon">✅</span>
              <div>
                <strong>Active Subscription</strong>
                <p>
                  Expires: {new Date(subscriptionStatus.subscription.expires_at).toLocaleDateString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Free Tier Info */}
        <div className="free-tier-card">
          <div className="tier-badge free">FREE</div>
          <h2>Free Forever</h2>
          <div className="price-section">
            <span className="price">Rp 0</span>
          </div>
          <ul className="features-list">
            <li><span className="icon">✓</span> Access to basic frames</li>
            <li><span className="icon">✓</span> Download your photos</li>
            <li><span className="icon">✓</span> Basic editing tools</li>
            <li><span className="icon">✓</span> No credit card required</li>
          </ul>
          <button className="plan-button current" disabled>
            Current Plan
          </button>
        </div>

        {/* Paid Plans */}
        <div className="paid-plans-grid">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`plan-card ${plan.popular ? 'popular' : ''}`}
            >
              {plan.popular && <div className="popular-badge">MOST POPULAR</div>}
              
              <div className="plan-header">
                <h2>{plan.name}</h2>
                {plan.savings && (
                  <div className="savings-badge">{plan.savings}</div>
                )}
              </div>

              <div className="price-section">
                <span className="price">{formatPrice(plan.price)}</span>
                <span className="period">/{plan.billingCycle}</span>
                {plan.pricePerMonth && (
                  <p className="price-per-month">
                    Only {formatPrice(plan.pricePerMonth)}/month
                  </p>
                )}
              </div>

              <ul className="features-list">
                {plan.features.map((feature, index) => (
                  <li key={index}>
                    <span className="icon">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`plan-button ${plan.popular ? 'primary' : 'secondary'}`}
                onClick={() => handleSubscribe(plan.id)}
                disabled={
                  processingPlanId === plan.id || 
                  subscriptionStatus?.hasSubscription
                }
              >
                {processingPlanId === plan.id ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : subscriptionStatus?.hasSubscription ? (
                  'Already Subscribed'
                ) : (
                  `Subscribe ${plan.billingCycle === 'annual' ? 'Annually' : 'Monthly'}`
                )}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="faq-section">
          <h2>Frequently Asked Questions</h2>
          
          <div className="faq-item">
            <h3>🎨 What do I get with a paid subscription?</h3>
            <p>Access to ALL premium frames! Once you subscribe, you can use any paid frame unlimited times.</p>
          </div>

          <div className="faq-item">
            <h3>💳 What payment methods do you accept?</h3>
            <p>We accept credit cards, bank transfers, e-wallets (GoPay, OVO, Dana), and other methods via Midtrans.</p>
          </div>

          <div className="faq-item">
            <h3>🔄 Can I cancel anytime?</h3>
            <p>Yes! You can cancel your subscription anytime. You'll still have access until the end of your billing period.</p>
          </div>

          <div className="faq-item">
            <h3>📱 Can I use it on multiple devices?</h3>
            <p>Yes! Your subscription works on any device where you're logged in.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
