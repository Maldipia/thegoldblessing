/**
 * TGB Password Hash Generator
 * 
 * Use this to generate password hashes for the DATA_USER sheet
 * 
 * Run: node generate-password.js YOUR_PASSWORD
 * Then copy the hash to column B (password_hash) in DATA_USER sheet
 */

const crypto = require('crypto');

function hashPassword(password, salt = 'TGB2024') {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// Get password from command line
const password = process.argv[2];

if (!password) {
  console.log('\n🔐 TGB Password Hash Generator\n');
  console.log('Usage: node generate-password.js YOUR_PASSWORD\n');
  console.log('Example: node generate-password.js MySecurePass123\n');
  process.exit(1);
}

const hash = hashPassword(password);

console.log('\n🔐 TGB Password Hash Generator\n');
console.log('Password:', password);
console.log('Hash:    ', hash);
console.log('\n📋 Copy this hash to column B (password_hash) in DATA_USER sheet\n');
