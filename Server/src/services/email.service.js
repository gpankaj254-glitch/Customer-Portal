const config = require("../config/config");
const { sendMail } = require("../utils/mailer");

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise<string>} the reset password URL, for callers that want to surface it (dev mode)
 */
const sendResetPasswordEmail = async (to, token) => {
  const resetPasswordUrl = `${config.appUrl}/reset-password?token=${token}`;
  const text = `Forgot your password?\n\nClick the link below to choose a new one. If you didn't request this, you can safely ignore this email.\n\n${resetPasswordUrl}`;
  const html = `<p>Forgot your password?</p><p>Click the link below to choose a new one. If you didn't request this, you can safely ignore this email.</p><p><a href="${resetPasswordUrl}">${resetPasswordUrl}</a></p>`;
  await sendMail({ to, subject: "Reset your ScloudX Customer Portal password", text, html });
  return resetPasswordUrl;
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise<string>} the verification URL, for callers that want to surface it (dev mode)
 */
const sendVerificationEmail = async (to, token) => {
  const verificationEmailUrl = `${config.appUrl}/verify-email?token=${token}`;
  const text = `Please verify your email address by clicking the link below.\n\n${verificationEmailUrl}`;
  const html = `<p>Please verify your email address by clicking the link below.</p><p><a href="${verificationEmailUrl}">${verificationEmailUrl}</a></p>`;
  await sendMail({ to, subject: "Verify your ScloudX Customer Portal email", text, html });
  return verificationEmailUrl;
};

/**
 * Notify a newly-created user of their new account. Does not include their
 * password (it was already set directly on the Create User form by whoever
 * created them, and emailing a live password in plaintext is bad practice
 * regardless) - just enough for them to know the account exists and where
 * to sign in.
 * @param {Object} user
 * @returns {Promise<boolean>} whether the send succeeded
 */
const sendWelcomeEmail = async (user) => {
  const loginUrl = `${config.appUrl}/login`;
  const text = `Hi ${user.name},\n\nAn account has been created for you on the ScloudX Customer Portal.\n\nEmail: ${user.email}\nRole: ${user.role}\n\nSign in here: ${loginUrl}\n\nIf you don't know your password, use "Forgot password?" on the sign-in page.`;
  const html = `<p>Hi ${user.name},</p><p>An account has been created for you on the ScloudX Customer Portal.</p><p>Email: ${user.email}<br/>Role: ${user.role}</p><p>Sign in here: <a href="${loginUrl}">${loginUrl}</a></p><p>If you don't know your password, use "Forgot password?" on the sign-in page.</p>`;
  return sendMail({ to: user.email, subject: "Welcome to ScloudX Customer Portal", text, html });
};

module.exports = {
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
};
