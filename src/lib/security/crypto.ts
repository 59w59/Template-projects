import crypto from "crypto"

export function generateHMAC(data: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("hex")
}

export function verifyHMAC(data: string, signature: string, secret: string): boolean {
  const computed = generateHMAC(data, secret)
  const computedBuffer = Buffer.from(computed)
  const signatureBuffer = Buffer.from(signature)
  if (computedBuffer.length !== signatureBuffer.length) {
    return false
  }
  return crypto.timingSafeEqual(computedBuffer, signatureBuffer)
}

export function encryptAES(text: string, secretKeyHex: string): { iv: string; encryptedData: string; tag: string } {
  const key = Buffer.from(secretKeyHex, "hex")
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  const tag = cipher.getAuthTag().toString("hex")
  return {
    iv: iv.toString("hex"),
    encryptedData: encrypted,
    tag: tag,
  }
}

export function decryptAES(encryptedData: string, ivHex: string, tagHex: string, secretKeyHex: string): string {
  const key = Buffer.from(secretKeyHex, "hex")
  const iv = Buffer.from(ivHex, "hex")
  const tag = Buffer.from(tagHex, "hex")
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(tag)
  let decrypted = decipher.update(encryptedData, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}
export function generateRandomSecret(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex")
}
