import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import { eq, desc } from "drizzle-orm"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

export const GET = defineHandler(
  { requireAuth: true },
  async ({ user, req }) => {
    if (user.role !== "admin") {
      throw new HttpError(403, "Acesso negado")
    }

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get("status")
    const searchFilter = searchParams.get("search")

    let logs = []

    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      const pipeline: any[] = [
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "id",
            as: "user_info",
          },
        },
        {
          $project: {
            id: 1,
            userId: 1,
            action: 1,
            status: 1,
            ipAddress: 1,
            userAgent: 1,
            details: 1,
            createdAt: 1,
            email: { $arrayElemAt: ["$user_info.email", 0] },
          },
        },
        { $sort: { createdAt: -1 } },
      ]

      const matchStage: any = {}
      if (statusFilter) {
        matchStage.status = statusFilter
      }
      if (searchFilter) {
        const regex = new RegExp(searchFilter, "i")
        matchStage.$or = [
          { action: regex },
          { ipAddress: regex },
          { email: regex },
          { details: regex },
        ]
      }

      if (Object.keys(matchStage).length > 0) {
        pipeline.splice(2, 0, { $match: matchStage })
      }

      const rawLogs = await db.collection("audit_logs").aggregate(pipeline).toArray()
      logs = rawLogs.map((l: any) => ({
        id: l.id || String(l._id),
        userId: l.userId,
        action: l.action,
        status: l.status,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        details: l.details,
        createdAt: l.createdAt,
        email: l.email || null,
      }))
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const query = db
        .select({
          id: tables.auditLogs.id,
          userId: tables.auditLogs.userId,
          action: tables.auditLogs.action,
          status: tables.auditLogs.status,
          ipAddress: tables.auditLogs.ipAddress,
          userAgent: tables.auditLogs.userAgent,
          details: tables.auditLogs.details,
          createdAt: tables.auditLogs.createdAt,
          email: tables.users.email,
        })
        .from(tables.auditLogs)
        .leftJoin(tables.users, eq(tables.auditLogs.userId, tables.users.id))
        .orderBy(desc(tables.auditLogs.createdAt))

      const rawLogs = await query

      logs = rawLogs.map((l: any) => ({
        id: l.id,
        userId: l.userId,
        action: l.action,
        status: l.status,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        details: l.details,
        createdAt: l.createdAt,
        email: l.email || null,
      }))

      if (statusFilter) {
        logs = logs.filter((l: any) => l.status === statusFilter)
      }
      if (searchFilter) {
        const s = searchFilter.toLowerCase()
        logs = logs.filter(
          (l: any) =>
            (l.action && l.action.toLowerCase().includes(s)) ||
            (l.ipAddress && l.ipAddress.toLowerCase().includes(s)) ||
            (l.email && l.email.toLowerCase().includes(s)) ||
            (l.details && l.details.toLowerCase().includes(s))
        )
      }
    }

    return { logs }
  }
)
