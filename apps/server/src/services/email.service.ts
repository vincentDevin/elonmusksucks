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
    from: process.env.EMAIL_FROM!,
    subject,
    html,
  };
  await sgMail.send(msg);
}
