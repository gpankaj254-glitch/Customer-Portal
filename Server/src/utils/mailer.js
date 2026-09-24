const nodemailer = require("nodemailer");
const config = require("../config/config");
const logger = require("../config/logger");

// O365/Exchange Online SMTP relay (smtp.office365.com:587, STARTTLS) via the
// enterprise-support@connect2cloudx.com mailbox - Authenticated SMTP was
// enabled for it directly, since Microsoft disables Basic Auth SMTP
// tenant-wide by default. Lazily created (not at module load) so a missing/
// placeholder SMTP_PASSWORD in local dev doesn't throw before sendMail is
// ever actually called - nodemailer itself only validates auth on connect,
// not on createTransport.
let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.port === 465,
      auth: {
        user: config.email.smtp.user,
        pass: config.email.smtp.pass,
      },
    });
  }
  return transporter;
}

/**
 * Send an email via the configured SMTP relay (O365/Exchange Online).
 * Failures are logged and swallowed - a notification email must never break
 * the request that triggered it (a user/ticket create or update must still
 * succeed even if SMTP is down, misconfigured, or the mailbox's password
 * hasn't been set yet).
 * @param {Object} message
 * @param {string|string[]} message.to
 * @param {string} message.subject
 * @param {string} message.text
 * @param {string} [message.html]
 * @returns {Promise<boolean>} whether the send succeeded
 */
const sendMail = async ({ to, subject, text, html }) => {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (recipients.length === 0) {
    logger.warn(`sendMail: no recipients for "${subject}" - skipped`);
    return false;
  }

  // Test mode (config.email.testMode - see EMAIL_TEST_MODE) sends nothing
  // to a real recipient - every email is redirected to a single test inbox.
  // Who it was actually addressed to/from is noted in the body (not the
  // subject - a subject stuffed with raw email addresses in brackets reads
  // as a phishing lure to content filters like Microsoft Defender, and can
  // get the message silently dropped even when SPF/DKIM are valid).
  // Independent of NODE_ENV so a production deployment can still be kept in
  // test mode while it's being verified, before real customers should
  // receive anything.
  const isTestMode = config.email.testMode;
  const actualRecipients = isTestMode ? [config.email.testRecipient] : recipients;
  const actualSubject = isTestMode ? `${subject} [TEST MODE]` : subject;
  const testModeNote = isTestMode
    ? `\n\n[TEST MODE] Originally addressed - From: ${config.email.from} / To: ${recipients.join(", ")}`
    : "";
  const actualText = `${text}${testModeNote}`;
  const actualHtml = isTestMode
    ? `${html || `<p>${text}</p>`}<p style="color:#888;font-size:12px;">[TEST MODE] Originally addressed - From: ${config.email.from} / To: ${recipients.join(", ")}</p>`
    : html || `<p>${text}</p>`;

  try {
    await getTransporter().sendMail({
      to: actualRecipients.join(", "),
      from: config.email.from,
      subject: actualSubject,
      text: actualText,
      html: actualHtml,
    });
    logger.info(`Email sent: "${actualSubject}" -> ${actualRecipients.join(", ")}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email "${actualSubject}": ${error.message}`);
    return false;
  }
};

module.exports = { sendMail };
