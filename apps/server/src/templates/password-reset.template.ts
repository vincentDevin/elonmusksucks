import {
  generateBaseEmailTemplate,
  createEmailButton,
  createEmailAlert,
} from './email-base.template';

interface PasswordResetEmailOptions {
  /** User's display name */
  userName: string;
  /** Password reset URL */
  resetUrl: string;
}

/**
 * Generate password reset HTML email
 * Sent when a user requests to reset their password
 */
export function generatePasswordResetEmail(options: PasswordResetEmailOptions): string {
  const { userName, resetUrl } = options;

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #f1f5f9; font-size: 24px; font-weight: 700;">
      Password Reset Request
    </h2>

    <p style="margin: 0 0 16px 0; color: #cbd5e1;">
      Hi <strong style="color: #e2e8f0;">${userName}</strong>,
    </p>

    <p style="margin: 0 0 16px 0; color: #cbd5e1;">
      We received a request to reset the password for your elonmusksucks.net account.
    </p>

    <p style="margin: 0 0 24px 0; color: #cbd5e1;">
      Click the button below to create a new password:
    </p>

    ${createEmailButton('Reset My Password', resetUrl, 'primary')}

    ${createEmailAlert(
      '<strong>This password reset link expires in 1 hour.</strong><br/>For security reasons, you must use this link within 1 hour of receiving this email.',
      'warning',
    )}

    ${createEmailAlert(
      "<strong>Didn't request this?</strong><br/>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.",
      'info',
    )}

    <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 14px;">
      Or copy and paste this URL into your browser:<br/>
      <a href="${resetUrl}" style="color: #60a5fa; text-decoration: none; word-break: break-all;">${resetUrl}</a>
    </p>

    <hr style="border: none; border-top: 1px solid #334155; margin: 32px 0;" />

    <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 14px; font-weight: 600;">
      Security Tips:
    </p>
    <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.6;">
      <li style="margin-bottom: 6px;">Always use a strong, unique password</li>
      <li style="margin-bottom: 6px;">Never share your password with anyone</li>
      <li style="margin-bottom: 6px;">Be cautious of phishing emails asking for your credentials</li>
    </ul>

    <p style="margin: 24px 0 0 0; color: #cbd5e1;">
      Stay secure,<br/>
      <span style="color: #94a3b8; font-size: 14px;">The elonmusksucks.net Team</span>
    </p>
  `;

  return generateBaseEmailTemplate({
    title: 'Reset Your Password - elonmusksucks.net',
    content,
    preheader: 'Reset your password to regain access to your account.',
  });
}
