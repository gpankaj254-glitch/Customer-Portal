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

  // , SMTP configuration options for the email service
  // , For testing, you can use a fake SMTP service like Ethereal: https://ethereal.email/create
  // SMTP_HOST: "smtp.scloudx.com",
  // SMTP_PORT: 587,
  // SMTP_USERNAME: "shreya.gupta@scloudx.com",
  // SMTP_PASSWORD: "replace-with-a-real-password",
  // Verified in SendGrid as a Single Sender.
  EMAIL_FROM: "portal@connect2cloudx.com",
  EMAIL_TO_SCLOUDX: ["gpankaj254@gmail.com"],
  EMAIL_TO_CUSTOMER: ["shreya.gupta@scloudx.com"],
  // Outside production, every email this app sends is redirected here
  // instead of its real recipient(s) - see utils/mailer.js.
  EMAIL_TEST_RECIPIENT: "portal@connect2cloudx.com",
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
