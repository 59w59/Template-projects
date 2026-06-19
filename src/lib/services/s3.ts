import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const s3Endpoint = process.env.S3_ENDPOINT
const s3Region = process.env.S3_REGION || "auto"
const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID
const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY
const s3Bucket = process.env.S3_BUCKET || "template-bucket"

export const s3Client =
  s3AccessKeyId && s3SecretAccessKey
    ? new S3Client({
        region: s3Region,
        endpoint: s3Endpoint,
        credentials: {
          accessKeyId: s3AccessKeyId,
          secretAccessKey: s3SecretAccessKey,
        },
      })
    : null

export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<boolean> {
  if (!s3Client) return false
  try {
    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
    await s3Client.send(command)
    return true
  } catch {
    return false
  }
}

export function getPublicUrl(key: string): string {
  if (s3Endpoint) {
    return `${s3Endpoint}/${s3Bucket}/${key}`
  }
  return `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${key}`
}
