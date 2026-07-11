// src/config/s3.js
import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

export default s3;