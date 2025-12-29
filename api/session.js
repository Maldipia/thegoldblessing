/**
 * TGB Session API
 * POST /api/session - Login
 * DELETE /api/session - Logout
 * GET /api/session - Check session
 */

const cookie = require('cookie');
const { 
  authenticateUser, 
  createSessionToken, 
  updateLogoutTime,
  verifySessionToken,
} = require('../lib/sheets-auth');
const { setCorsHeaders, rateLimit, getClientIP } = require('../lib/auth-middleware');

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ========== GET - Check Session ==========
  if (req.method === 'GET') {
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionCookie = cookies.tgb_session;
    
    if (!sessionCookie) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Not logged in' },
      });
    }

    const user = verifySessionToken(sessionCookie);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'SESSION_EXPIRED', message: 'Session expired' },
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        username: user.username,
        role: user.role,
        name: user.name,
      },
    });
  }

  // ========== POST - Login ==========
  if (req.method === 'POST') {
    // Rate limiting
    if (!rateLimit(req, res, { maxAttempts: 5, windowMs: 60000 })) {
      return;
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Username and password required' },
      });
    }

    const result = await authenticateUser(username, password);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: result.error },
      });
    }

    // Create session token
    const token = createSessionToken(result.user);

    // Set cookie
    res.setHeader('Set-Cookie', cookie.serialize('tgb_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 12 * 60 * 60, // 12 hours
    }));

    console.log(`[Session] Login: ${username} from ${getClientIP(req)}`);

    return res.status(200).json({
      success: true,
      user: result.user,
    });
  }

  // ========== DELETE - Logout ==========
  if (req.method === 'DELETE') {
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionCookie = cookies.tgb_session;
    
    if (sessionCookie) {
      const user = verifySessionToken(sessionCookie);
      if (user) {
        await updateLogoutTime(user.username);
        console.log(`[Session] Logout: ${user.username}`);
      }
    }

    // Clear cookie
    res.setHeader('Set-Cookie', cookie.serialize('tgb_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    }));

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({
    success: false,
    error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET, POST, or DELETE' },
  });
};
