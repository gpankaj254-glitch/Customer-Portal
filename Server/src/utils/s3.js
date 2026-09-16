const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const config = require("../config/config");

const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

/**
 * Upload a buffer (from multer's memory storage) to S3.
 * @param {string} key
 * @param {Buffer} buffer
 * @param {string} contentType
 * @returns {Promise<void>}
 */
const uploadBuffer = async (key, buffer, contentType) => {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.aws.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
};

/**
 * Fetch an object from S3 as a readable stream, for proxying a download
 * through our own auth-gated endpoint rather than exposing the bucket
 * directly.
 * @param {string} key
 * @returns {Promise<{Body: import("stream").Readable, ContentType: string, ContentLength: number}>}
 */
const getObjectStream = async (key) => {
  return s3Client.send(
    new GetObjectCommand({
      Bucket: config.aws.bucketName,
      Key: key,
    })
  );
};

/**
 * @param {string} key
 * @returns {Promise<void>}
 */
const deleteObject = async (key) => {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: config.aws.bucketName,
      Key: key,
    })
  );
};

module.exports = { uploadBuffer, getObjectStream, deleteObject };
