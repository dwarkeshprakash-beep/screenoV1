// backend/src/services/storage/s3.provider.js
// Thin I/O adapter over AWS S3. No path/business logic here -
// see storage.service.js for that. Selected when STORAGE_PROVIDER=s3.

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
} = require('@aws-sdk/client-s3')
const { getSignedUrl: presignUrl } = require('@aws-sdk/s3-request-presigner')

const BUCKET = process.env.S3_BUCKET_NAME

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined, // undefined lets the SDK fall back to its default credential chain (IAM role, etc.)
})

/**
 * @param {string} path - S3 key
 * @param {Buffer} buffer
 * @param {{ contentType: string, upsert?: boolean }} options - upsert is a no-op on S3
 *   (PutObject always overwrites); kept in the signature to match the Supabase provider.
 */
async function upload(path, buffer, { contentType }) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: path,
    Body: buffer,
    ContentType: contentType,
  }))
}

/**
 * @param {string} path
 * @param {number} expiresIn - seconds
 * @returns {Promise<string>}
 */
async function getSignedUrl(path, expiresIn) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: path })
  return presignUrl(s3, command, { expiresIn })
}

/** @param {string[]} paths */
async function remove(paths) {
  await s3.send(new DeleteObjectsCommand({
    Bucket: BUCKET,
    Delete: { Objects: paths.map(key => ({ Key: key })) },
  }))
}

/**
 * @param {string} path
 * @returns {Promise<Buffer>}
 */
async function download(path) {
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: path }))
  const chunks = []
  for await (const chunk of Body) chunks.push(chunk)
  return Buffer.concat(chunks)
}

module.exports = { upload, getSignedUrl, remove, download }
