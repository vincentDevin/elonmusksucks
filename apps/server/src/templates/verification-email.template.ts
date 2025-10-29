import {
  generateBaseEmailTemplate,
  createEmailButton,
  createEmailAlert,
} from './email-base.template';

interface VerificationEmailOptions {
  /** User's display name */
  userName: string;
  /** Email verification URL */
  verificationUrl: string;
}

/**
 * Generate email verification HTML email
 * Sent when a user registers for a new account
 */
export function generateVerificationEmail(options: VerificationEmailOptions): string {
  const { userName, verificationUrl } = options;

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #F9FAFB; font-size: 24px; font-weight: 700;">
      Welcome to elonmusksucks.net!
    </h2>

    <p style="margin: 0 0 16px 0; color: #D1D5DB;">
      Hi <strong style="color: #F9FAFB;">${userName}</strong>,
    </p>

    <p style="margin: 0 0 16px 0; color: #D1D5DB;">
      Thanks for creating an account! We're excited to have you join our prediction market community.
    </p>

    <p style="margin: 0 0 24px 0; color: #D1D5DB;">
      To get started, please verify your email address by clicking the button below:
    </p>

    ${createEmailButton('Verify Email Address', verificationUrl, 'primary')}

    ${createEmailAlert(
      "<strong>This verification link expires in 24 hours.</strong><br/>If you didn't create this account, you can safely ignore this email.",
      'info',
    )}

    <p style="margin: 20px 0 0 0; color: #9CA3AF; font-size: 14px;">
      Or copy and paste this URL into your browser:<br/>
      <a href="${verificationUrl}" style="color: #34D399; text-decoration: none; word-break: break-all;">${verificationUrl}</a>
    </p>

    <hr style="border: none; border-top: 1px solid #374151; margin: 32px 0;" />

    <p style="margin: 0; color: #9CA3AF; font-size: 14px;">
      Once verified, you'll be able to:
    </p>
    <ul style="margin: 12px 0; padding-left: 20px; color: #D1D5DB; font-size: 14px;">
      <li style="margin-bottom: 8px;">Place bets on predictions and win MuskBucks</li>
      <li style="margin-bottom: 8px;">Create your own predictions</li>
      <li style="margin-bottom: 8px;">Compete on the leaderboard</li>
      <li style="margin-bottom: 8px;">Play Pong for MuskBucks</li>
      <li>Unlock achievements and climb the ranks</li>
    </ul>

    <p style="margin: 24px 0 0 0; color: #D1D5DB;">
      See you on the platform!<br/>
      <span style="color: #9CA3AF; font-size: 14px;">The elonmusksucks.net Team</span>
    </p>
  `;

  return generateBaseEmailTemplate({
    title: 'Verify Your Email - elonmusksucks.net',
    content,
    preheader: 'Welcome! Please verify your email to get started.',
  });
}
