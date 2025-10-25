/**
 * Generate preview HTML files for email templates
 * Run with: npm -w apps/server run ts-node src/scripts/preview-emails.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { generatePasswordResetEmail } from '../templates/password-reset.template';
import { generateVerificationEmail } from '../templates/verification-email.template';

const OUTPUT_DIR = path.join(__dirname, '../../email-previews');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate password reset email
const passwordResetHtml = generatePasswordResetEmail({
  userName: 'ApartheidClyde',
  resetUrl:
    'https://app.elonmusksucks.net/reset-password?token=85076417d8aaed265f4964c374c1fefd947cecef57444599',
});

// Generate verification email
const verificationHtml = generateVerificationEmail({
  userName: 'ApartheidClyde',
  verificationUrl:
    'https://app.elonmusksucks.net/verify-email?token=abc123def456ghi789jkl012mno345pqr678stu901vwx234',
});

// Save files
const passwordResetPath = path.join(OUTPUT_DIR, 'password-reset-preview.html');
const verificationPath = path.join(OUTPUT_DIR, 'verification-preview.html');

fs.writeFileSync(passwordResetPath, passwordResetHtml);
fs.writeFileSync(verificationPath, verificationHtml);

console.log('✅ Email previews generated successfully!');
console.log(`\n📧 Password Reset Email: ${passwordResetPath}`);
console.log(`📧 Verification Email: ${verificationPath}`);
console.log('\n💡 Open these files in your browser to preview the emails.');
