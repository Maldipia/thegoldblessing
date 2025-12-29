/**
 * TGB Sheets-Based Authentication
 * Uses DATA_USER sheet for user management
 * 
 * Spreadsheet: GB Inventory (1R4GOtQQimCZIqOVx0yeK83UmLmBMERU0Z7w4efpbxMQ)
 * Sheet: DATA_USER
 */

const { google } = require('googleapis');
const crypto = require('crypto');

// Spreadsheet containing DATA_USER
const USER_SPREADSHEET_ID = '1R4GOtQQimCZIqOVx0yeK83UmLmBMERU0Z7w4efpbxMQ';
const USER_SHEET_NAME = 'DATA_USER';

// Column indexes (0-based) matching your sheet
const USER_COL = {
  USERNAME: 0,        // A
  PASSWORD_HASH: 1,   // B
  ROLE: 2,            // C
  NAME: 3,            // D
  EMAIL: 4,           // E
  CREATED: 5,         // F
  LOGIN_TIME: 6,      // G
  LOGOUT_TIME: 7,     // H
  NOTES: 8,           // I
  TRACES: 9,          // J
};

// Role hierarchy (higher number = more permissions)
const ROLE_LEVELS = {
  STAFF: 1,
  ADMIN: 2,
  SUP: 3,      // Supervisor
  OWNER: 4,
};

/**
 * Get authenticated Sheets client
 */
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

/**
 * Hash password using SHA256 + salt
 * For production, consider bcrypt, but this works without extra deps
 */
function hashPassword(password, salt = 'TGB2024') {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

/**
 * Verify password against hash
 */
function verifyPassword(password, storedHash) {
  const hash = hashPassword(password);
  return hash === storedHash;
}

/**
 * Find user by username
 */
async function findUserByUsername(username) {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: USER_SPREADSHEET_ID,
      range: `'${USER_SHEET_NAME}'!A:J`,
    });

    const rows = response.data.values || [];
    for (let i = 1; i < rows.length; i++) { // Skip header
      if (rows[i][USER_COL.USERNAME]?.toLowerCase() === username.toLowerCase()) {
        return {
          rowIndex: i + 1, // 1-based for Sheets API
          username: rows[i][USER_COL.USERNAME],
          passwordHash: rows[i][USER_COL.PASSWORD_HASH],
          role: rows[i][USER_COL.ROLE]?.toUpperCase() || 'STAFF',
          name: rows[i][USER_COL.NAME] || '',
          email: rows[i][USER_COL.EMAIL] || '',
          created: rows[i][USER_COL.CREATED] || '',
          notes: rows[i][USER_COL.NOTES] || '',
        };
      }
    }
    return null;
  } catch (error) {
    console.error('[Auth] Find user error:', error.message);
    return null;
  }
}

/**
 * Update login time
 */
async function updateLoginTime(rowIndex) {
  try {
    const sheets = await getSheetsClient();
    const now = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    await sheets.spreadsheets.values.update({
      spreadsheetId: USER_SPREADSHEET_ID,
      range: `'${USER_SHEET_NAME}'!G${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[now]] },
    });
  } catch (error) {
    console.error('[Auth] Update login time error:', error.message);
  }
}

/**
 * Update logout time
 */
async function updateLogoutTime(username) {
  try {
    const user = await findUserByUsername(username);
    if (!user) return;

    const sheets = await getSheetsClient();
    const now = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    await sheets.spreadsheets.values.update({
      spreadsheetId: USER_SPREADSHEET_ID,
      range: `'${USER_SHEET_NAME}'!H${user.rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[now]] },
    });
  } catch (error) {
    console.error('[Auth] Update logout time error:', error.message);
  }
}

/**
 * Add trace/activity log to user row
 */
async function addUserTrace(username, action) {
  try {
    const user = await findUserByUsername(username);
    if (!user) return;

    const sheets = await getSheetsClient();
    const now = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    const newTrace = `${now}: ${action}`;
    
    // Get existing traces
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: USER_SPREADSHEET_ID,
      range: `'${USER_SHEET_NAME}'!J${user.rowIndex}`,
    });
    
    const existingTraces = response.data.values?.[0]?.[0] || '';
    const updatedTraces = existingTraces 
      ? `${newTrace}\n${existingTraces}`.substring(0, 5000) // Keep last ~5000 chars
      : newTrace;

    await sheets.spreadsheets.values.update({
      spreadsheetId: USER_SPREADSHEET_ID,
      range: `'${USER_SHEET_NAME}'!J${user.rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[updatedTraces]] },
    });
  } catch (error) {
    console.error('[Auth] Add trace error:', error.message);
  }
}

/**
 * Authenticate user with username and password
 */
async function authenticateUser(username, password) {
  const user = await findUserByUsername(username);
  
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return { success: false, error: 'Invalid password' };
  }

  // Update login time
  await updateLoginTime(user.rowIndex);
  
  // Add trace
  await addUserTrace(username, 'LOGIN');

  return {
    success: true,
    user: {
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
    },
  };
}

/**
 * Create session token
 */
function createSessionToken(user) {
  const payload = {
    username: user.username,
    role: user.role,
    name: user.name,
    exp: Date.now() + (12 * 60 * 60 * 1000), // 12 hours
  };
  const data = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'TGB_SECRET_2024')
    .update(data)
    .digest('hex');
  return Buffer.from(`${data}.${signature}`).toString('base64');
}

/**
 * Verify session token
 */
function verifySessionToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [data, signature] = decoded.split('.');
    
    // Verify signature
    const expectedSig = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'TGB_SECRET_2024')
      .update(data)
      .digest('hex');
    
    if (signature !== expectedSig) {
      return null;
    }

    const payload = JSON.parse(data);
    
    // Check expiration
    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Get all users (for admin)
 */
async function getAllUsers() {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: USER_SPREADSHEET_ID,
      range: `'${USER_SHEET_NAME}'!A:J`,
    });

    const rows = response.data.values || [];
    const users = [];
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][USER_COL.USERNAME]) {
        users.push({
          username: rows[i][USER_COL.USERNAME],
          role: rows[i][USER_COL.ROLE] || 'STAFF',
          name: rows[i][USER_COL.NAME] || '',
          email: rows[i][USER_COL.EMAIL] || '',
          created: rows[i][USER_COL.CREATED] || '',
          lastLogin: rows[i][USER_COL.LOGIN_TIME] || '',
          lastLogout: rows[i][USER_COL.LOGOUT_TIME] || '',
        });
      }
    }
    
    return users;
  } catch (error) {
    console.error('[Auth] Get all users error:', error.message);
    return [];
  }
}

/**
 * Create new user
 */
async function createUser({ username, password, role, name, email, notes }) {
  try {
    // Check if username exists
    const existing = await findUserByUsername(username);
    if (existing) {
      return { success: false, error: 'Username already exists' };
    }

    const sheets = await getSheetsClient();
    const now = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    const passwordHash = hashPassword(password);

    await sheets.spreadsheets.values.append({
      spreadsheetId: USER_SPREADSHEET_ID,
      range: `'${USER_SHEET_NAME}'!A:J`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          username,
          passwordHash,
          role.toUpperCase(),
          name,
          email,
          now,
          '', // login time
          '', // logout time
          notes || '',
          `${now}: ACCOUNT CREATED`,
        ]],
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[Auth] Create user error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  findUserByUsername,
  authenticateUser,
  createSessionToken,
  verifySessionToken,
  updateLogoutTime,
  addUserTrace,
  getAllUsers,
  createUser,
  hashPassword,
  ROLE_LEVELS,
  USER_COL,
};
