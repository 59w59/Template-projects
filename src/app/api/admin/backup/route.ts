import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { generateDatabaseBackup } from "@/lib/db/backup"
import { writeAuditLog } from "@/lib/security/audit"
import { getClientIp } from "@/lib/rate-limit/rate-limiter"
import { NextResponse } from "next/server"

export const POST = defineHandler(
  { requireAuth: true },
  async ({ user, req }) => {
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    if (user.role !== "admin") {
      await writeAuditLog(user.userId, "ADMIN_BACKUP_FAILED", "failed", ip, ua, "Unauthorized backup attempt")
      throw new HttpError(403, "Acesso negado: apenas administradores podem realizar backups")
    }

    const backupJson = await generateDatabaseBackup()

    await writeAuditLog(user.userId, "ADMIN_BACKUP_GENERATE", "success", ip, ua, "Database backup generated successfully")

    return new NextResponse(backupJson, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup-${Date.now()}.json"`,
      },
    })
  }
)
