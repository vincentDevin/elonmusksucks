import sgMail from '@sendgrid/mail';
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
