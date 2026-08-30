// src/config/s3.js
import { S3Client } from "@aws-sdk/client-s3";

const accessKeyId =
  process.env.AWS_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID;
const secretAccessKey =
  process.env.AWS_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY;

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  ...(accessKeyId && secretAccessKey
    ? {
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      }
    : {}),
  ...(process.env.AWS_S3_ENDPOINT
    ? {
        endpoint: process.env.AWS_S3_ENDPOINT,
        forcePathStyle:
          process.env.AWS_S3_FORCE_PATH_STYLE === "true",
      }
    : {}),
});

export const S3_BUCKET =
  process.env.AWS_BUCKET || process.env.AWS_BUCKET_NAME;

export default s3;