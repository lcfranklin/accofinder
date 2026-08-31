// src/config/s3.js
import { S3Client, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";

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

const region = () => process.env.AWS_REGION || "us-east-1";
const bucket = () => S3_BUCKET;

// Extract the object key from a full S3 URL that was produced by this app's
// upload pipeline (https://<bucket>.s3.<region>.amazonaws.com/<key>).
// Falls back to parsing the path after the bucket part to stay robust against
// CDN/custom-domain rewrites.
export function keyFromUrl(url) {
  if (!url) return null;
  const s = String(url);
  const hostPrefix = `${bucket()}.s3.${region()}.amazonaws.com/`;
  if (s.includes(hostPrefix)) {
    const rest = s.split(hostPrefix)[1];
    return rest && rest.length ? rest : null;
  }
  // e.g. custom endpoint or bucket-in-path style: https://host/<bucket>/<key>
  const m = s.match(new RegExp(`/${bucket()}/(.+)$`));
  if (m && m[1] && m[1].length) return m[1];
  return null;
}

// Delete a single object from S3 by its full URL. Missing key or a 404 from
// S3 is treated as a no-op (already gone) rather than an error.
export async function deleteS3ObjectByUrl(url) {
  const key = keyFromUrl(url);
  if (!key) return;
  await s3.send(
    new DeleteObjectCommand({ Bucket: bucket(), Key: key }),
  );
}

// Delete many objects from S3 by their full URLs, batching up to 1000 keys
// per DeleteObjectsCommand call (the S3 API limit).
export async function deleteS3ObjectsByUrls(urls) {
  const keys = (urls || [])
    .map(keyFromUrl)
    .filter((k) => !!k);
  if (!keys.length) return;

  const chunkSize = 1000;
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket(),
        Delete: { Objects: chunk.map((Key) => ({ Key })) },
      }),
    );
  }
}

export default s3;