/**
 * Base email template with responsive layout and branding
 * Provides consistent structure for all transactional emails
 */

interface BaseEmailTemplateOptions {
  /** Email title (appears in header) */
  title: string;
  /** Main email content (HTML) */
  content: string;
  /** Optional preheader text (appears in inbox preview) */
  preheader?: string;
}

/**
 * Generate base HTML structure for emails
 * Uses inline CSS for maximum email client compatibility
 */
export function generateBaseEmailTemplate(options: BaseEmailTemplateOptions): string {
  const { title, content, preheader = '' } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Preheader text (hidden but appears in email preview) -->
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
    ${preheader}
  </div>

  <!-- Email wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f172a;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Main container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                elonmusksucks.net
              </h1>
              <p style="margin: 8px 0 0 0; color: #bfdbfe; font-size: 14px; font-weight: 500;">
                The Prediction Market Platform
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; color: #e2e8f0; font-size: 16px; line-height: 1.6;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 30px; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 14px;">
                You're receiving this email because you have an account on elonmusksucks.net
              </p>
              <p style="margin: 0 0 16px 0; color: #64748b; font-size: 12px;">
                <a href="https://elonmusksucks.net" style="color: #60a5fa; text-decoration: none;">Visit Website</a>
                &nbsp;&nbsp;•&nbsp;&nbsp;
                <a href="https://elonmusksucks.net/timeline" style="color: #60a5fa; text-decoration: none;">Timeline</a>
                &nbsp;&nbsp;•&nbsp;&nbsp;
                <a href="https://elonmusksucks.net/leaderboard" style="color: #60a5fa; text-decoration: none;">Leaderboard</a>
              </p>
              <p style="margin: 0; color: #64748b; font-size: 11px;">
                © ${new Date().getFullYear()} elonmusksucks.net. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Create a styled button for emails
 * @param text Button text
 * @param url Button URL
 * @param variant Button style variant
 */
export function createEmailButton(
  text: string,
  url: string,
  variant: 'primary' | 'secondary' = 'primary',
): string {
  const styles =
    variant === 'primary'
      ? 'background-color: #3b82f6; color: #ffffff;'
      : 'background-color: #334155; color: #e2e8f0;';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
      <tr>
        <td style="border-radius: 6px; ${styles}">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: inherit; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 6px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Create a styled alert box for emails
 * @param text Alert text
 * @param variant Alert style variant
 */
export function createEmailAlert(text: string, variant: 'info' | 'warning' = 'info'): string {
  const styles =
    variant === 'info'
      ? 'background-color: #1e3a5f; border-left: 4px solid #3b82f6; color: #bfdbfe;'
      : 'background-color: #451a03; border-left: 4px solid #f59e0b; color: #fcd34d;';

  return `
    <div style="${styles} padding: 16px; border-radius: 4px; margin: 20px 0; font-size: 14px; line-height: 1.5;">
      ${text}
    </div>
  `;
}
