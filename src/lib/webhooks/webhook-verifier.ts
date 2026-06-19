import crypto from "crypto"

export interface WebhookVerifyConfig {
  secret: string
  signatureHeader: string
  timestampHeader?: string
  toleranceSeconds?: number
}

export function verifyWebhookSignature(
  rawBody: string,
  headers: Headers,
  config: WebhookVerifyConfig
): boolean {
  const signature = headers.get(config.signatureHeader)
  if (!signature) return false

  const tolerance = config.toleranceSeconds ?? 300

  if (config.timestampHeader) {
    const timestampStr = headers.get(config.timestampHeader)
    if (!timestampStr) return false

    const timestamp = parseInt(timestampStr, 10)
    if (isNaN(timestamp)) return false

    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - timestamp) > tolerance) {
      return false
    }

    const signedPayload = `${timestamp}.${rawBody}`
    const expectedSignature = crypto
      .createHmac("sha256", config.secret)
      .update(signedPayload)
      .digest("hex")

    const expectedBuffer = Buffer.from(expectedSignature)
    const signatureBuffer = Buffer.from(signature)

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false
    }
    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  }

  const expectedSignature = crypto
    .createHmac("sha256", config.secret)
    .update(rawBody)
    .digest("hex")

  const expectedBuffer = Buffer.from(expectedSignature)
  const signatureBuffer = Buffer.from(signature)

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false
  }
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
}
