import { uploadFile, getPublicUrl, s3Client } from "../services/s3"
import fs from "fs"
import path from "path"
import { generateSecureToken } from "../utils"

export interface UploadResult {
  fileName: string
  fileKey: string
  fileSize: number
  mimeType: string
  url: string
  storageProvider: "s3" | "local"
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/zip",
]

export async function processAndStoreFile(
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<UploadResult> {
  const fileSize = buffer.length

  if (fileSize > MAX_FILE_SIZE) {
    throw new Error("Arquivo excede o limite de tamanho permitido (10MB)")
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("Tipo de arquivo não permitido")
  }

  const ext = path.extname(fileName) || ""
  const sanitizedName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, "")
  const fileKey = `${Date.now()}-${generateSecureToken(8)}${ext}`

  const provider = process.env.STORAGE_PROVIDER === "s3" && s3Client ? "s3" : "local"

  if (provider === "s3") {
    const success = await uploadFile(fileKey, buffer, mimeType)
    if (!success) {
      throw new Error("Falha ao fazer upload do arquivo para o S3/R2")
    }
    const url = getPublicUrl(fileKey)
    return {
      fileName: `${sanitizedName}${ext}`,
      fileKey,
      fileSize,
      mimeType,
      url,
      storageProvider: "s3",
    }
  } else {
    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    const filePath = path.join(uploadsDir, fileKey)
    fs.writeFileSync(filePath, buffer)
    const url = `/uploads/${fileKey}`
    return {
      fileName: `${sanitizedName}${ext}`,
      fileKey,
      fileSize,
      mimeType,
      url,
      storageProvider: "local",
    }
  }
}
