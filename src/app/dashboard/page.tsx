import * as React from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyAccessToken, clearAuthCookies } from "@/lib/auth/auth"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"
import { desc } from "drizzle-orm"
import { SecurityChart } from "@/components/charts/security-chart"
import { AuditChat } from "@/components/chat/audit-chat"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"

interface AuditLogItem {
  id: string
  action: string
  status: string
  ipAddress: string
  userAgent: string
  createdAt: any
}

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

async function getAuditLogs(): Promise<AuditLogItem[]> {
  try {
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      const rawLogs = await db
        .collection("audit_logs")
        .find()
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray()

      return rawLogs.map((l: any) => ({
        id: l.id || String(l._id),
        action: l.action,
        status: l.status,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        createdAt: l.createdAt,
      }))
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const rawLogs = await db
        .select()
        .from(tables.auditLogs)
        .orderBy(desc(tables.auditLogs.createdAt))
        .limit(10)

      return rawLogs.map((l: any) => ({
        id: l.id,
        action: l.action,
        status: l.status,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        createdAt: l.createdAt,
      }))
    }
  } catch (err) {
    return []
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("access_token")?.value

  if (!token) {
    redirect("/login")
  }

  const user = await verifyAccessToken(token)
  if (!user) {
    redirect("/login")
  }

  const logs = await getAuditLogs()

  async function handleLogout() {
    "use server"
    await clearAuthCookies()
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center pb-6 border-b border-border animate-fade-in">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gradient">Painel de Segurança</h1>
            <p className="text-xs text-muted-foreground font-light">
              Logado como: <span className="font-medium text-foreground">{user.email}</span> ({user.role})
            </p>
          </div>
          <form action={handleLogout}>
            <Button type="submit" variant="outline" className="rounded-full px-5 text-xs font-semibold hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all">
              Sair
            </Button>
          </form>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-up">
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-card p-6">
              <SecurityChart />
            </div>

            <div className="glass-card p-6">
              <h3 className="text-sm font-bold tracking-tight mb-4">Últimos Logs de Auditoria</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-3 font-medium uppercase tracking-wider">Ação</th>
                      <th className="py-3 font-medium uppercase tracking-wider">Status</th>
                      <th className="py-3 font-medium uppercase tracking-wider">IP</th>
                      <th className="py-3 font-medium uppercase tracking-wider">Dispositivo</th>
                      <th className="py-3 font-medium uppercase tracking-wider">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-muted-foreground font-light">
                          Nenhum log registrado ainda.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/40 transition-colors">
                          <td className="py-3 font-semibold text-foreground">{log.action}</td>
                          <td className="py-3">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                log.status === "success"
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  : "bg-red-500/10 text-red-500 border-red-500/20"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 text-muted-foreground font-mono">{log.ipAddress}</td>
                          <td className="py-3 text-muted-foreground truncate max-w-[150px] font-light" title={log.userAgent}>
                            {log.userAgent}
                          </td>
                          <td className="py-3 text-muted-foreground font-light">
                            {formatDate(log.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-bold tracking-tight border-b border-border pb-2">Configurações Ativas</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-light">Banco de Dados:</span>
                  <span className="font-mono bg-secondary px-2 py-0.5 rounded text-foreground text-[10px] uppercase font-bold tracking-wider">{databaseType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-light">Rate Limit:</span>
                  <span className="text-foreground font-medium">Ativado (in-memory)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-light">Assinaturas HMAC:</span>
                  <span className="text-foreground font-medium">Ativado (SHA-256)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-light">Políticas CSP:</span>
                  <span className="text-foreground font-medium">Ativo (Nonce dinâmico)</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <AuditChat />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
