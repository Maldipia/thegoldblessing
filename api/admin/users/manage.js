/**
 * POST /api/admin/users/manage
 * User management (create, disable, change role)
 * Role: OWNER ONLY
 */

const { requireRole, getClientIP, setCorsHeaders } = require('../../lib/auth-middleware');
const { appendAuditLog } = require('../../lib/sheets-helper');
const { 
  getAllUsers, 
  createUser, 
  findUserByUsername, 
  addUserTrace,
  hashPassword,
  ROLE_LEVELS,
} = require('../../lib/sheets-auth');
const { google } = require('googleapis');

const USER_SPREADSHEET_ID = '1R4GOtQQimCZIqOVx0yeK83UmLmBMERU0Z7w4efpbxMQ';
const USER_SHEET_NAME = 'DATA_USER';

const VALID_ROLES = ['STAFF', 'ADMIN', 'SUP', 'OWNER'];

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED' } });
  }

  // OWNER ONLY
  const user = requireRole(req, res, 'OWNER');
  if (!user) return;

  try {
    const { action } = req.body;

    // ========== LIST USERS ==========
    if (action === 'list') {
      const users = await getAllUsers();
      return res.status(200).json({
        success: true,
        users: users.map(u => ({
          username: u.username,
          role: u.role,
          name: u.name,
          email: u.email,
          lastLogin: u.lastLogin,
        })),
      });
    }

    // ========== CREATE USER ==========
    if (action === 'create') {
      const { username, password, role, name, email, notes } = req.body;

      if (!username || !password || !role || !name) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'username, password, role, name required' },
        });
      }

      if (!VALID_ROLES.includes(role.toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `Role must be: ${VALID_ROLES.join(', ')}` },
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Password min 6 characters' },
        });
      }

      const result = await createUser({
        username: username.toLowerCase(),
        password,
        role: role.toUpperCase(),
        name,
        email: email || '',
        notes: notes || `Created by ${user.username}`,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'CONFLICT', message: result.error },
        });
      }

      await appendAuditLog({
        username: user.username,
        role: user.role,
        action: 'USER_CREATE',
        orderId: '',
        before: {},
        after: { newUser: username, role: role.toUpperCase() },
        result: 'SUCCESS',
        ip: getClientIP(req),
      });

      await addUserTrace(user.username, `Created user: ${username} (${role.toUpperCase()})`);

      return res.status(200).json({
        success: true,
        result: { username: username.toLowerCase(), role: role.toUpperCase(), name },
      });
    }

    // ========== CHANGE ROLE ==========
    if (action === 'role') {
      const { username, newRole } = req.body;

      if (!username || !newRole) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'username and newRole required' },
        });
      }

      if (!VALID_ROLES.includes(newRole.toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `Role must be: ${VALID_ROLES.join(', ')}` },
        });
      }

      const targetUser = await findUserByUsername(username);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      // Update role in sheet
      const sheets = await getSheetsClient();
      await sheets.spreadsheets.values.update({
        spreadsheetId: USER_SPREADSHEET_ID,
        range: `'${USER_SHEET_NAME}'!C${targetUser.rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[newRole.toUpperCase()]] },
      });

      await appendAuditLog({
        username: user.username,
        role: user.role,
        action: 'USER_ROLE_CHANGE',
        orderId: '',
        before: { role: targetUser.role },
        after: { role: newRole.toUpperCase() },
        result: 'SUCCESS',
        ip: getClientIP(req),
        meta: { targetUser: username },
      });

      await addUserTrace(user.username, `Changed ${username} role: ${targetUser.role} → ${newRole.toUpperCase()}`);
      await addUserTrace(username, `Role changed to ${newRole.toUpperCase()} by ${user.username}`);

      return res.status(200).json({
        success: true,
        result: { username, previousRole: targetUser.role, newRole: newRole.toUpperCase() },
      });
    }

    // ========== RESET PASSWORD ==========
    if (action === 'reset-password') {
      const { username, newPassword } = req.body;

      if (!username || !newPassword) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'username and newPassword required' },
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Password min 6 characters' },
        });
      }

      const targetUser = await findUserByUsername(username);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      // Update password hash
      const sheets = await getSheetsClient();
      const newHash = hashPassword(newPassword);
      await sheets.spreadsheets.values.update({
        spreadsheetId: USER_SPREADSHEET_ID,
        range: `'${USER_SHEET_NAME}'!B${targetUser.rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[newHash]] },
      });

      await appendAuditLog({
        username: user.username,
        role: user.role,
        action: 'USER_PASSWORD_RESET',
        orderId: '',
        before: {},
        after: { targetUser: username },
        result: 'SUCCESS',
        ip: getClientIP(req),
      });

      await addUserTrace(user.username, `Reset password for ${username}`);
      await addUserTrace(username, `Password reset by ${user.username}`);

      return res.status(200).json({
        success: true,
        result: { username, message: 'Password reset successful' },
      });
    }

    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'action must be: list, create, role, reset-password' },
    });

  } catch (error) {
    console.error('[Admin] User management error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL', message: 'User management failed' },
    });
  }
};
