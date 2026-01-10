/**
 * TGB Payment Proof Upload API
 * Uploads payment screenshots to Google Drive and logs to spreadsheet
 */

const { google } = require('googleapis');

// Configuration
const UPLOAD_FOLDER_ID = '1dySr98C9SBfYys9RjMPm2h4LoE_73V4d';
const LOG_SHEET_ID = '1YnkcqUy0osdaZbt2LGXQDWLpKiWdC0W0JB6Zfe02Oe0'; // TGB ORDER spreadsheet
const LOG_TAB_NAME = 'UPLOAD_LOG';

// Get credentials from environment
function getCredentials() {
  const creds = process.env.GOOGLE_CREDENTIALS;
  if (!creds) {
    throw new Error('GOOGLE_CREDENTIALS environment variable not set');
  }
  return JSON.parse(creds);
}

// Create authenticated Google API client
async function getGoogleAuth() {
  const credentials = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets'
    ]
  });
  return auth;
}

// Generate PROOF_ID
function generateProofId() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
  return `TGB-PROOF-${dateStr}-${timeStr}`;
}

// Sanitize filename
function sanitizeFilename(orderId, amount, customerName) {
  const sanitizedName = customerName
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 30);
  
  const cleanAmount = parseFloat(amount.replace(/[₱,\s]/g, '')).toFixed(2);
  
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
  
  return `${orderId}__${cleanAmount}__${sanitizedName}__${timestamp}`;
}

// Format date for display
function formatDate(date) {
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila'
  };
  return date.toLocaleString('en-PH', options);
}

// Upload file to Google Drive
async function uploadToDrive(auth, fileBase64, mimeType, filename) {
  const drive = google.drive({ version: 'v3', auth });
  
  // Convert base64 to buffer
  const buffer = Buffer.from(fileBase64, 'base64');
  
  // Determine file extension
  const extMap = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/heic': 'heic',
    'image/webp': 'webp'
  };
  const ext = extMap[mimeType] || 'jpg';
  const fullFilename = `${filename}.${ext}`;
  
  // Upload to Drive
  const response = await drive.files.create({
    requestBody: {
      name: fullFilename,
      parents: [UPLOAD_FOLDER_ID]
    },
    media: {
      mimeType: mimeType,
      body: require('stream').Readable.from(buffer)
    },
    fields: 'id, name, webViewLink'
  });
  
  return {
    fileId: response.data.id,
    filename: response.data.name,
    webViewLink: response.data.webViewLink
  };
}

// Log submission to spreadsheet
async function logSubmission(auth, data) {
  const sheets = google.sheets({ version: 'v4', auth });
  
  try {
    // Check if UPLOAD_LOG tab exists, create if not
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: LOG_SHEET_ID
    });
    
    const sheetExists = spreadsheet.data.sheets.some(
      sheet => sheet.properties.title === LOG_TAB_NAME
    );
    
    if (!sheetExists) {
      // Create the sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: LOG_SHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: LOG_TAB_NAME }
            }
          }]
        }
      });
      
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: LOG_SHEET_ID,
        range: `${LOG_TAB_NAME}!A1:J1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            'PROOF_ID', 'ORDER_ID', 'CUSTOMER_NAME', 'AMOUNT',
            'FILE_ID', 'FILENAME', 'NOTES', 'SUBMITTED_AT', 'SOURCE', 'FILE_LINK'
          ]]
        }
      });
    }
    
    // Append the log entry
    await sheets.spreadsheets.values.append({
      spreadsheetId: LOG_SHEET_ID,
      range: `${LOG_TAB_NAME}!A:J`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          data.proofId,
          data.orderId,
          data.customerName,
          data.amount,
          data.fileId,
          data.filename,
          data.notes || '',
          data.submittedAt,
          'WEB_UPLOAD',
          data.webViewLink || ''
        ]]
      }
    });
    
    return true;
  } catch (error) {
    console.error('Log error:', error);
    // Don't fail the upload if logging fails
    return false;
  }
}

// Main handler
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const { orderId, customerName, amount, notes, fileBase64, mimeType } = req.body;
    
    // Validate required fields
    if (!orderId || !customerName || !amount || !fileBase64) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: orderId, customerName, amount, fileBase64'
      });
    }
    
    // Validate file size (base64 is ~33% larger than binary)
    const estimatedSize = (fileBase64.length * 3) / 4;
    if (estimatedSize > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds 10MB limit'
      });
    }
    
    // Generate IDs and filenames
    const proofId = generateProofId();
    const filename = sanitizeFilename(orderId, amount, customerName);
    const now = new Date();
    
    // Get Google auth
    const auth = await getGoogleAuth();
    
    // Upload to Drive
    const uploadResult = await uploadToDrive(auth, fileBase64, mimeType || 'image/jpeg', filename);
    
    // Format amount for display
    const cleanAmount = parseFloat(amount.replace(/[₱,\s]/g, ''));
    const formattedAmount = '₱' + cleanAmount.toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    
    // Log to spreadsheet
    await logSubmission(auth, {
      proofId,
      orderId,
      customerName,
      amount: cleanAmount.toFixed(2),
      fileId: uploadResult.fileId,
      filename: uploadResult.filename,
      notes,
      submittedAt: formatDate(now),
      webViewLink: uploadResult.webViewLink
    });
    
    // Return success
    return res.status(200).json({
      success: true,
      proofId,
      orderId,
      amount: formattedAmount,
      submittedAt: formatDate(now),
      message: 'Payment proof submitted successfully!'
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Upload failed. Please try again.'
    });
  }
};
