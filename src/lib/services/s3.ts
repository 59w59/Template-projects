import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSystemSettings } from "../settings/system-settings"

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

export async function getS3Client(): Promise<S3Client | null> {
  const settings = await getSystemSettings()
  const activeAccessKeyId = settings.s3AccessKeyId || s3AccessKeyId
  const activeSecretAccessKey = settings.s3SecretAccessKey || s3SecretAccessKey
  const activeRegion = settings.s3Region || s3Region
  const activeEndpoint = settings.s3Endpoint || s3Endpoint

  if (activeAccessKeyId && activeSecretAccessKey) {
    return new S3Client({
      region: activeRegion,
      endpoint: activeEndpoint || undefined,
      credentials: {
        accessKeyId: activeAccessKeyId,
        secretAccessKey: activeSecretAccessKey,
      },
    })
  }
  return s3Client
}

export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<boolean> {
  const client = await getS3Client()
  if (!client) return false
  const settings = await getSystemSettings()
  const activeBucket = settings.s3Bucket || s3Bucket
  try {
    const command = new PutObjectCommand({
      Bucket: activeBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
    await client.send(command)
    return true
  } catch {
    return false
  }
}

export async function getPublicUrl(key: string): Promise<string> {
  const settings = await getSystemSettings()
  const activeEndpoint = settings.s3Endpoint || s3Endpoint
  const activeBucket = settings.s3Bucket || s3Bucket
  const activeRegion = settings.s3Region || s3Region

  if (activeEndpoint) {
    return `${activeEndpoint}/${activeBucket}/${key}`
  }
  return `https://${activeBucket}.s3.${activeRegion}.amazonaws.com/${key}`
}
