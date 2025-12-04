/**
 * Client Info Utility
 * Parse user agent, IP, device info from request
 */

// Simple UA parser (no external dependency)
function parseUserAgent(userAgent) {
  if (!userAgent) {
    return {
      browser: 'Unknown',
      browserVersion: '',
      os: 'Unknown',
      osVersion: '',
      deviceType: 'desktop'
    };
  }

  const ua = userAgent.toLowerCase();

  // Detect browser
  let browser = 'Unknown';
  let browserVersion = '';

  if (ua.includes('firefox')) {
    browser = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.?\d*)/i);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('edg/')) {
    browser = 'Edge';
    const match = userAgent.match(/Edg\/(\d+\.?\d*)/i);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.?\d*)/i);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.?\d*)/i);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'Opera';
    const match = userAgent.match(/(?:Opera|OPR)\/(\d+\.?\d*)/i);
    browserVersion = match ? match[1] : '';
  }

  // Detect OS
  let os = 'Unknown';
  let osVersion = '';

  if (ua.includes('windows')) {
    os = 'Windows';
    if (ua.includes('windows nt 10')) osVersion = '10';
    else if (ua.includes('windows nt 11')) osVersion = '11';
    else if (ua.includes('windows nt 6.3')) osVersion = '8.1';
    else if (ua.includes('windows nt 6.2')) osVersion = '8';
    else if (ua.includes('windows nt 6.1')) osVersion = '7';
  } else if (ua.includes('mac os x')) {
    os = 'macOS';
    const match = userAgent.match(/Mac OS X (\d+[._]\d+[._]?\d*)/i);
    osVersion = match ? match[1].replace(/_/g, '.') : '';
  } else if (ua.includes('android')) {
    os = 'Android';
    const match = userAgent.match(/Android (\d+\.?\d*)/i);
    osVersion = match ? match[1] : '';
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    os = 'iOS';
    const match = userAgent.match(/OS (\d+[._]\d+)/i);
    osVersion = match ? match[1].replace(/_/g, '.') : '';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  }

  // Detect device type
  let deviceType = 'desktop';
  if (ua.includes('mobile') || ua.includes('android') && !ua.includes('tablet')) {
    deviceType = 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceType = 'tablet';
  }

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType
  };
}

/**
 * Get client info from request
 * @param {Object} req - Express request object
 * @returns {Object} Client info
 */
function getClientInfo(req) {
  const userAgent = req.headers['user-agent'] || '';
  const parsed = parseUserAgent(userAgent);
  
  // Get IP address
  let ip = req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           req.ip;
  
  // Handle comma-separated IPs (from proxies)
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  
  // Remove IPv6 prefix if present
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  
  // Get screen dimensions from custom headers (set by frontend)
  const screenWidth = parseInt(req.headers['x-screen-width']) || null;
  const screenHeight = parseInt(req.headers['x-screen-height']) || null;
  
  return {
    ip,
    deviceType: parsed.deviceType,
    browser: parsed.browser,
    browserVersion: parsed.browserVersion,
    os: parsed.os,
    osVersion: parsed.osVersion,
    screenWidth,
    screenHeight,
    userAgent,
    // Note: For country/city, you'd need a GeoIP service
    // These are placeholders - implement with MaxMind or similar
    country: null,
    city: null
  };
}

/**
 * Get referrer domain from URL
 * @param {string} referrer - Full referrer URL
 * @returns {string|null} Domain or null
 */
function getReferrerDomain(referrer) {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    return url.hostname;
  } catch (e) {
    return null;
  }
}

module.exports = {
  getClientInfo,
  parseUserAgent,
  getReferrerDomain
};
