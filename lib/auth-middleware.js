/**
 * TGB Authentication Middleware
 * Session and role verification
 */

const cookie = require('cookie');
const { verifySessionToken, ROLE_LEVELS } = require('./sheets-auth');

/**
 * Parse session cookie from request
 */
function getSessionCookie(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  return cookies.tgb_session || null;
}

/**
 * Verify session and get user data
 */
function verifySession(req) {
  const sessionCookie = getSessionCookie(req);
  if (!sessionCookie) return null;
  return verifySessionToken(sessionCookie);
}

/**
 * Require authenticated session
 */
function requireSession(req, res) {
  const user = verifySession(req);
  if (!user) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'Please log in' },
    });
    return null;
  }
  return user;
}

/**
 * Require minimum role level
 * Roles: STAFF < ADMIN < SUP < OWNER
 */
function requireRole(req, res, minRole) {
  const user = requireSession(req, res);
  if (!user) return null;

  const userLevel = ROLE_LEVELS[user.role] || 0;
  const requiredLevel = ROLE_LEVELS[minRole] || 999;

  if (userLevel < requiredLevel) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: `Requires ${minRole} role or higher` },
    });
    return null;
  }
  return user;
}

/**
 * Rate limiting (simple in-memory)
 */
const rateLimitStore = new Map();

function rateLimit(req, res, { maxAttempts = 5, windowMs = 60000, key = null } = {}) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  const limitKey = key || `${ip}:${req.url}`;
  const now = Date.now();

  const entry = rateLimitStore.get(limitKey);
  if (entry && now - entry.firstAttempt > windowMs) {
    rateLimitStore.delete(limitKey);
  }

  const current = rateLimitStore.get(limitKey) || { count: 0, firstAttempt: now };
  current.count++;

  if (current.count > maxAttempts) {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait.' },
    });
    return false;
  }

  rateLimitStore.set(limitKey, current);
  return true;
}

/**
 * Get client IP for logging
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
}

/**
 * Set CORS headers
 */
function setCorsHeaders(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = {
  getSessionCookie,
  verifySession,
  requireSession,
  requireRole,
  rateLimit,
  getClientIP,
  setCorsHeaders,
  ROLE_LEVELS,
};
