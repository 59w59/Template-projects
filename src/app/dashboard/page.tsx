import * as React from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { verifyAccessToken, clearAuthCookies } from "@/lib/auth/auth"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"
import { desc, eq } from "drizzle-orm"
import { SecurityChart } from "@/components/charts/security-chart"
import { AuditChat } from "@/components/chat/audit-chat"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import { NotificationBell } from "@/components/ui/notification-bell"
import { 
  Shield, 
  Activity, 
  Database, 
  LogOut, 
  User, 
  Sparkles,
  CheckCircle2
} from "lucide-react"

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
        .limit(8)
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
        .limit(8)

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

async function getUserSubscriptions(userId: string): Promise<any[]> {
  try {
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      const rawSubs = await db.collection("subscriptions").find({ userId }).sort({ createdAt: -1 }).toArray()
      return rawSubs.map((s: any) => ({
        id: s.id || String(s._id),
        planId: s.planId,
        status: s.status,
        createdAt: s.createdAt,
      }))
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      return await db.select().from(tables.subscriptions).where(eq(tables.subscriptions.userId, userId)).orderBy(desc(tables.subscriptions.createdAt))
    }
  } catch {
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
  const userSubs = await getUserSubscriptions(user.id)

  async function handleLogout() {
    "use server"
    await clearAuthCookies()
    redirect("/login")
  }

  const systemStatus = "99.8%"
  const totalAudits = logs.length
  const lastIncident = "Nenhum"

  return (
    <div className="min-h-screen bg-[#070708] text-[#f4f4f5] font-sans selection:bg-foreground selection:text-background relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.03),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,255,255,0.015),transparent_70%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 relative z-10">
        <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-6 border-b border-border/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="bg-foreground text-background p-1.5 rounded-lg">
                <Shield className="size-4" strokeWidth={2.5} />
              </div>
              <h1 className="text-lg font-black tracking-tight uppercase">Painel de Segurança</h1>
            </div>
            <p className="text-[11px] text-[#a1a1aa] font-light">
              Logado como <span className="font-semibold text-[#f4f4f5]">{user.email}</span> • Classe <span className="font-bold text-foreground capitalize">{user.role}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <NotificationBell />
            <Link 
              href="/profile" 
              className="text-[10px] font-bold uppercase tracking-wider bg-secondary/30 hover:bg-secondary/70 border border-border/50 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <User className="size-3" /> Meu Perfil
            </Link>
            {user.role === "admin" && (
              <Link 
                href="/admin" 
                className="text-[10px] font-bold uppercase tracking-wider bg-foreground text-background hover:scale-[1.02] active:scale-[0.98] px-4 py-2 rounded-xl transition-transform flex items-center gap-1.5"
              >
                <Sparkles className="size-3" /> Painel Admin
              </Link>
            )}
            <form action={handleLogout}>
              <Button 
                type="submit" 
                variant="outline" 
                className="rounded-xl px-4 py-2 h-auto text-[10px] font-bold uppercase tracking-wider hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all flex items-center gap-1.5"
              >
                <LogOut className="size-3" /> Sair
              </Button>
            </form>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 space-y-4 flex flex-col justify-between hover:border-border/60 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">Status Operacional</span>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mt-1" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight">{systemStatus}</span>
              <span className="text-[10px] text-emerald-500 block font-bold mt-1">SISTEMA PROTEGIDO</span>
            </div>
          </div>

          <div className="glass-card p-5 space-y-4 flex flex-col justify-between hover:border-border/60 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">Logs Recentes</span>
              <Activity className="size-4 text-[#a1a1aa]" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight">{totalAudits}</span>
              <span className="text-[10px] text-[#a1a1aa] block font-light mt-1">Ações em cache local</span>
            </div>
          </div>

          <div className="glass-card p-5 space-y-4 flex flex-col justify-between hover:border-border/60 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">Incidentes / Alertas</span>
              <Shield className="size-4 text-red-500" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight">{lastIncident}</span>
              <span className="text-[10px] text-emerald-500 block font-bold mt-1">0 AMEAÇAS ATIVAS</span>
            </div>
          </div>

          <div className="glass-card p-5 space-y-4 flex flex-col justify-between hover:border-border/60 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">Banco Conectado</span>
              <Database className="size-4 text-[#a1a1aa]" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight uppercase">{databaseType}</span>
              <span className="text-[10px] text-[#a1a1aa] block font-light mt-1">Auto-migration habilitada</span>
            </div>
          </div>
        </section>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-0 overflow-hidden">
              <SecurityChart />
            </div>

            <div className="glass-card p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold tracking-tight mb-1">Logs de Auditoria Recentes</h3>
                <p className="text-[11px] text-[#a1a1aa] font-light">Todas as transações e acessos críticos realizados pela sua conta</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/30 text-[#a1a1aa]">
                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Ação</th>
                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Status</th>
                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">IP</th>
                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Dispositivo</th>
                      <th className="py-3 font-bold uppercase tracking-wider text-[10px]">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-[#a1a1aa] font-light">
                          Nenhum log registrado ainda.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="border-b border-border/20 last:border-0 hover:bg-secondary/20 transition-colors">
                          <td className="py-3 font-bold text-[#f4f4f5]">{log.action}</td>
                          <td className="py-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                log.status === "success"
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  : "bg-red-500/10 text-red-500 border-red-500/20"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 text-[#a1a1aa] font-mono">{log.ipAddress}</td>
                          <td className="py-3 text-[#a1a1aa] truncate max-w-[140px] font-light" title={log.userAgent}>
                            {log.userAgent}
                          </td>
                          <td className="py-3 text-[#a1a1aa] font-light">
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

          <div className="space-y-6">
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-bold tracking-tight border-b border-border/30 pb-2">Configurações Ativas</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span className="text-[#a1a1aa] font-light">Limites de Rotas</span>
                  </div>
                  <span className="font-semibold text-[10px] uppercase">Habilitado</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span className="text-[#a1a1aa] font-light">Assinatura HMAC</span>
                  </div>
                  <span className="font-semibold text-[10px] uppercase">SHA-256</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span className="text-[#a1a1aa] font-light">Políticas CSP</span>
                  </div>
                  <span className="font-semibold text-[10px] uppercase">Nonce Ativo</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span className="text-[#a1a1aa] font-light">Sessões JWT</span>
                  </div>
                  <span className="font-semibold text-[10px] uppercase">Exclusivas</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-bold tracking-tight border-b border-border/30 pb-2">Histórico de Faturamento</h3>
              <div className="space-y-3">
                {userSubs.length === 0 ? (
                  <p className="text-xs text-[#a1a1aa] italic font-light text-center py-2">Nenhuma fatura encontrada.</p>
                ) : (
                  userSubs.map((sub: any) => (
                    <div key={sub.id} className="flex justify-between items-center text-xs py-1.5 border-b border-border/20 last:border-0 last:pb-0">
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#f4f4f5] uppercase tracking-wider block text-[10px]">
                          {sub.planId.toUpperCase()}
                        </span>
                        <span className="text-[9px] text-[#a1a1aa] font-light block">
                          {new Date(sub.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <a
                        href={`/api/billing/invoice/${sub.id}`}
                        className="text-[9px] font-bold bg-secondary hover:bg-foreground hover:text-background border border-border/60 px-3 py-1 rounded-lg transition-colors uppercase tracking-wider"
                        download
                      >
                        Baixar PDF
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass-card p-6 overflow-hidden">
              <AuditChat />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
