// This file's dev-default values are committed to a public repo, so it must
// never contain real credentials - only placeholders. A production host
// (Render, Railway, a VM, etc.) or a local, gitignored .env file supplies the
// real MONGODB_URL/JWT_SECRET/API_KEY/AWS_* via actual environment
// variables, which config.js already merges over these defaults. For local
// dev against a real database, put your own values in Server/.env (already
// gitignored) rather than editing this file.
module.exports = {
  HOME: "/",
  MONGODB_URL: "mongodb://127.0.0.1:27017/scloudx",
  PORT: 8000,
  LOG_MODE: "debug",
  INFO_LOG_FILE: "./logs/info.txt",
  ERROR_LOG_FILE: "./logs/err.txt",
  NODE_ENV: "development",
  // , JWT
  // , JWT secret key - placeholder only, override via a real env var
  JWT_SECRET: "replace-with-a-real-secret",
  // , Number of minutes after which an access token expires
  JWT_ACCESS_EXPIRATION_MINUTES: 300000,
  // , Number of days after which a refresh token expires
  JWT_REFRESH_EXPIRATION_DAYS: 30,
  // , Number of minutes after which a reset password token expires
  JWT_RESET_PASSWORD_EXPIRATION_MINUTES: 10,
  // , Number of minutes after which a verify email token expires
  JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: 10,

  // , SMTP configuration for the email service - O365/Exchange Online
  // relay, via the enterprise-support@connect2cloudx.com mailbox
  // (Authenticated SMTP enabled directly on it). SMTP_PASSWORD is left
  // blank here on purpose - it's never committed, only ever set via a real
  // env var (Server/.env locally, gitignored; the real env var directly in
  // production).
  SMTP_HOST: "smtp.office365.com",
  SMTP_PORT: 587,
  SMTP_USERNAME: "enterprise-support@connect2cloudx.com",
  SMTP_PASSWORD: "",
  EMAIL_FROM: "enterprise-support@connect2cloudx.com",
  EMAIL_TO_SCLOUDX: ["gpankaj254@gmail.com"],
  EMAIL_TO_CUSTOMER: ["shreya.gupta@scloudx.com"],
  // Every email this app sends is redirected here instead of its real
  // recipient(s) - see utils/mailer.js. "Right now all Emails should go
  // from enterprise-support@connect2cloudx.com to
  // enterprise-support@connect2cloudx.com" - EMAIL_TEST_MODE below forces
  // this on everywhere (including production) until the O365 SMTP switch
  // is verified end-to-end; flip EMAIL_TEST_MODE back off (or unset it) to
  // resume sending to real recipients.
  EMAIL_TEST_RECIPIENT: "enterprise-support@connect2cloudx.com",
  // "true" forces every email to test mode regardless of NODE_ENV - see
  // EMAIL_TEST_RECIPIENT above. Unset/"false" would default to test mode
  // only outside production.
  EMAIL_TEST_MODE: "true",
  // Public base URL of the frontend - used to build links in emails.
  // Production must override this (via a real env var / .env) with its
  // real domain, e.g. "https://app.scloudx.com".
  APP_URL: "http://localhost:3000",
  // Which origins the API accepts requests from. "*" (any origin) is fine
  // for local dev; production must override this with the real frontend
  // domain(s), comma-separated if more than one.
  CORS_ORIGIN: "*",
  // SendGrid API key - placeholder only, override via a real env var.
  API_KEY: "replace-with-a-real-sendgrid-api-key",
  // Ticket / Supplier Communication attachment storage. Access key/secret
  // are intentionally left blank here - set them locally in Server/.env
  // (gitignored) or via real env vars in production, never commit real
  // values to this public repo. Bucket name/region aren't secret.
  AWS_ACCESS_KEY_ID: "",
  AWS_SECRET_ACCESS_KEY: "",
  AWS_REGION: "eu-north-1",
  AWS_S3_BUCKET: "scloudx-cp-attachments-341936016869-eu-north-1-an",
};
