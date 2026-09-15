const sgMail = require("@sendgrid/mail");
const _ = require("lodash");
const config = require("../config/config");
const logger = require("../config/logger");

sgMail.setApiKey(config.apiKey);

/**
 * Send an email via SendGrid. Failures are logged and swallowed - a
 * notification email must never break the request that triggered it (a
 * user/ticket create or update must still succeed even if SendGrid is down,
 * misconfigured, or the sender address isn't verified).
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
  // to a real recipient - every email is redirected to a single test inbox,
  // with the subject annotated with who it was actually addressed to/from
  // so a tester can tell them apart. Independent of NODE_ENV so a
  // production deployment can still be kept in test mode while it's being
  // verified, before real customers should receive anything.
  const isTestMode = config.email.testMode;
  const actualRecipients = isTestMode ? [config.email.testRecipient] : recipients;
  const actualSubject = isTestMode
    ? `${subject} [TEST MODE - From: ${config.email.from} To: ${recipients.join(", ")}]`
    : subject;

  try {
    await sgMail.send({
      to: actualRecipients,
      from: config.email.from,
      subject: actualSubject,
      text,
      html: html || `<p>${text}</p>`,
    });
    logger.info(`Email sent: "${actualSubject}" -> ${actualRecipients.join(", ")}`);
    return true;
  } catch (error) {
    const details = _.get(error, "response.body") || error.message;
    logger.error(`Failed to send email "${actualSubject}": ${JSON.stringify(details)}`);
    return false;
  }
};

module.exports = { sendMail };
