import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { processAndStoreFile } from "@/lib/storage/upload"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"
import { generateSecureToken } from "@/lib/utils"
import { writeAuditLog } from "@/lib/security/audit"
import { getClientIp } from "@/lib/rate-limit/rate-limiter"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

export const POST = defineHandler(
  { requireAuth: true },
  async ({ user, req }) => {
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      throw new HttpError(400, "Corpo de requisição multipart inválido")
    }

    const file = formData.get("file") as File | null
    if (!file) {
      throw new HttpError(400, "Nenhum arquivo enviado no campo 'file'")
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadResult = await processAndStoreFile(file.name, file.type, buffer)

    const fileId = generateSecureToken()

    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      await db.collection("stored_files").insertOne({
        id: fileId,
        userId: user.userId,
        organizationId: null,
        fileName: uploadResult.fileName,
        fileKey: uploadResult.fileKey,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        storageProvider: uploadResult.storageProvider,
        createdAt: new Date(),
      })
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      await db.insert(tables.storedFiles).values({
        id: fileId,
        userId: user.userId,
        organizationId: null,
        fileName: uploadResult.fileName,
        fileKey: uploadResult.fileKey,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        storageProvider: uploadResult.storageProvider,
      })
    }

    await writeAuditLog(
      user.userId,
      "FILE_UPLOAD",
      "success",
      ip,
      ua,
      `Uploaded file: ${uploadResult.fileName} (${uploadResult.fileKey})`
    )

    return {
      success: true,
      file: {
        id: fileId,
        name: uploadResult.fileName,
        size: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        url: uploadResult.url,
      },
    }
  }
)
