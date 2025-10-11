import sgMail from '@sendgrid/mail';
import { generateVerificationEmail } from '../templates/verification-email.template';
import { generatePasswordResetEmail } from '../templates/password-reset.template';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

/**
 * Send an email.
 * @param to   recipient email
 * @param subject  message subject
 * @param html     HTML body
 */
export async function sendEmail(to: string, subject: string, html: string) {
  const msg = {
    to,
    from: { email: process.env.EMAIL_FROM! }, // now an object
    subject,
    text: html.replace(/<[^>]+>/g, ''),
    html,
  };
  try {
    await sgMail.send(msg);
  } catch (err: any) {
    console.error('🔴 SendGrid error status:', err.code);
    console.error('🔴 SendGrid error response body:', err.response?.body);
    throw err;
  }
}

/**
 * Send email verification email with HTML template
 * @param to User's email address
 * @param userName User's display name
 * @param verificationUrl Email verification URL
 */
export async function sendVerificationEmail(
  to: string,
  userName: string,
  verificationUrl: string,
): Promise<void> {
  const html = generateVerificationEmail({
    userName,
    verificationUrl,
  });

  await sendEmail(to, 'Verify Your Email - elonmusksucks.net', html);
}

/**
 * Send password reset email with HTML template
 * @param to User's email address
 * @param userName User's display name
 * @param resetUrl Password reset URL
 */
export async function sendPasswordResetEmail(
  to: string,
  userName: string,
  resetUrl: string,
): Promise<void> {
  const html = generatePasswordResetEmail({
    userName,
    resetUrl,
  });

  await sendEmail(to, 'Reset Your Password - elonmusksucks.net', html);
}
