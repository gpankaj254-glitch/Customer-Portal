const dotenv = require("dotenv");
const path = require("path");
const Joi = require("joi");

// A production host (Render, Railway, a VM, etc.) sets real env vars
// directly - this is only for local dev/self-hosting, and is a silent
// no-op if no .env file exists (e.g. this repo's own dev setup, which
// still gets its values from configVars.js below).
dotenv.config({ path: path.join(__dirname, "../../.env") });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string()
      .valid("production", "development", "test")
      .required(),
    PORT: Joi.number().default(3000),
    MONGODB_URL: Joi.string().required().description("Mongo DB url"),
    JWT_SECRET: Joi.string().required().description("JWT secret key"),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number()
      .default(1000000)
      .description("minutes after which access tokens expire"),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number()
      .default(30)
      .description("days after which refresh tokens expire"),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description("minutes after which reset password token expires"),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description("minutes after which verify email token expires"),
    SMTP_HOST: Joi.string().description("SMTP relay host that will send the emails (O365: smtp.office365.com)"),
    SMTP_PORT: Joi.number().description("port to connect to the SMTP relay (O365: 587, STARTTLS)"),
    SMTP_USERNAME: Joi.string().description("mailbox to authenticate as - must have Authenticated SMTP enabled on it"),
    SMTP_PASSWORD: Joi.string().allow("").description("password (or app password) for SMTP_USERNAME - never committed, set via a real env var"),
    EMAIL_FROM: Joi.string().description(
      "the from field in the emails sent by the app"
    ),
    API_KEY: Joi.string(),
    EMAIL_TO_CUSTOMER: Joi.array(),
    EMAIL_TO_SCLOUDX: Joi.array(),
    EMAIL_TEST_RECIPIENT: Joi.string().description(
      "when email test mode is on, every email is redirected here instead of its real recipient(s)"
    ),
    EMAIL_TEST_MODE: Joi.string().valid("true", "false").description(
      "\"true\" forces every email to redirect to EMAIL_TEST_RECIPIENT regardless of NODE_ENV (e.g. a production deployment still being tested); \"false\" forces real recipients even outside production. Unset defaults to NODE_ENV !== \"production\"."
    ),
    APP_URL: Joi.string().description(
      "public base URL of the deployed frontend - used to build links in emails"
    ),
    CORS_ORIGIN: Joi.string().description(
      "comma-separated list of allowed origins for the frontend; \"*\" allows any origin (dev default)"
    ),
    AWS_ACCESS_KEY_ID: Joi.string().allow("").description("IAM access key scoped to the attachments S3 bucket"),
    AWS_SECRET_ACCESS_KEY: Joi.string().allow("").description("secret for AWS_ACCESS_KEY_ID"),
    AWS_REGION: Joi.string().allow("").description("region the attachments S3 bucket lives in"),
    AWS_S3_BUCKET: Joi.string().allow("").description("bucket name for Ticket/Supplier Communication attachments"),
  })
  .unknown();

// Real env vars (from .env, or set directly by the hosting platform) take
// precedence over configVars.js's dev defaults - locally, none of these are
// set unless a .env file is added, so today's dev behavior is unchanged.
const env = { ...require("./configVars"), ...process.env };

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: "key" } })
  .validate(env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    // url: envVars.MONGODB_URL + (envVars.NODE_ENV === "test" ? "-test" : ""),
    url: envVars.MONGODB_URL,
    options: {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
    debug: false,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes:
      envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  email: {
    // O365/Exchange Online SMTP relay - see utils/mailer.js. SMTP_PASSWORD
    // is the one piece that's never in configVars.js's committed defaults;
    // it must be set as a real env var (locally in Server/.env, gitignored,
    // or directly in the production host) before mail can actually send.
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      user: envVars.SMTP_USERNAME,
      pass: envVars.SMTP_PASSWORD,
    },
    from: envVars.EMAIL_FROM,
    toScloudX: envVars.EMAIL_TO_SCLOUDX,
    toCustomer: envVars.EMAIL_TO_CUSTOMER,
    testRecipient: envVars.EMAIL_TEST_RECIPIENT,
    testMode:
      envVars.EMAIL_TEST_MODE !== undefined
        ? envVars.EMAIL_TEST_MODE === "true"
        : envVars.NODE_ENV !== "production",
  },
  apiKey: envVars.API_KEY,
  appUrl: envVars.APP_URL || "http://localhost:3000",
  corsOrigin: envVars.CORS_ORIGIN || "*",
  aws: {
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    region: envVars.AWS_REGION,
    bucketName: envVars.AWS_S3_BUCKET,
  },
};
