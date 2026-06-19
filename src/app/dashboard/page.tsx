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
import { IntegrationsStatus } from "@/components/dashboard/integrations-status"
import { DiagnosticsConsole } from "@/components/dashboard/diagnostics-console"
import { getSystemSettings } from "@/lib/settings/system-settings"
import { 
  Shield, 
  Activity, 
  Database, 
  LogOut, 
  User, 
  Sparkles,
  CheckCircle2,
  Cpu,
  Globe
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
  const settings = await getSystemSettings()

  const hasGoogle = !!(settings.googleClientId && settings.googleClientSecret)
  const hasGithub = !!(settings.githubClientId && settings.githubClientSecret)
  const hasDiscord = !!(settings.discordClientId && settings.discordClientSecret)
  const hasApple = !!(settings.appleClientId && settings.applePrivateKey)

  async function handleLogout() {
    "use server"
    await clearAuthCookies()
    redirect("/login")
  }

  const systemStatus = "99.8%"
  const totalAudits = logs.length
  const lastIncident = "Nenhum"

  return (
    <div className="min-h-screen bg-[#050506] text-[#f4f4f5] font-mono selection:bg-[#00ff88] selection:text-black relative overflow-hidden pb-12">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f24_1px,transparent_1px),linear-gradient(to_bottom,#1f1f24_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.12] pointer-events-none" />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 relative z-10">
        <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-6 border-b border-[#1e1e24]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="border border-[#00ff88]/30 bg-[#00ff88]/10 text-[#00ff88] p-1.5 rounded-[2px]">
                <Shield className="size-4" strokeWidth={2.5} />
              </div>
              <h1 className="text-sm font-black tracking-widest uppercase text-[#00ff88]">Painel de Segurança HUD</h1>
            </div>
            <p className="text-[10px] text-[#a1a1aa] font-mono leading-none">
              SESSÃO: <span className="font-bold text-[#f4f4f5]">{user.email}</span> // NÍVEL: <span className="font-bold text-[#00ff88] uppercase">{user.role}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <NotificationBell />
            <Link 
              href="/profile" 
              className="text-[9px] font-bold uppercase tracking-widest bg-[#0c0c0e] hover:bg-[#121215] text-[#a1a1aa] hover:text-[#f4f4f5] border border-[#1e1e24] hover:border-[#a1a1aa]/30 px-4 py-2 rounded-[2px] transition-all flex items-center gap-1.5 active:scale-[0.98]"
            >
              <User className="size-3" /> Meu Perfil
            </Link>
            {user.role === "admin" && (
              <Link 
                href="/admin" 
                className="text-[9px] font-bold uppercase tracking-widest bg-[#00ff88] text-black hover:bg-[#00dd77] px-4 py-2 rounded-[2px] transition-all flex items-center gap-1.5 active:scale-[0.98]"
              >
                <Sparkles className="size-3" /> Painel Admin
              </Link>
            )}
            <form action={handleLogout}>
              <Button 
                type="submit" 
                variant="outline" 
                className="rounded-[2px] border-[#1e1e24] bg-transparent text-[#a1a1aa] hover:text-red-500 hover:bg-red-500/5 hover:border-red-500/30 px-4 py-2 h-auto text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 active:scale-[0.98]"
              >
                <LogOut className="size-3" /> Sair
              </Button>
            </form>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-[#1e1e24] bg-[#09090b] p-5 flex flex-col justify-between hover:border-[#00ff88]/30 transition-all rounded-[2px] group">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#a1a1aa] font-mono">Status Operacional</span>
              <div className="h-1.5 w-1.5 rounded-full bg-[#00ff88] animate-pulse" />
            </div>
            <div className="mt-4">
              <span className="text-xl font-black tracking-widest text-[#f4f4f5] font-mono">{systemStatus}</span>
              <span className="text-[8px] text-[#00ff88] block font-black mt-1 uppercase tracking-widest font-mono">SISTEMA INTEGRADO</span>
            </div>
          </div>

          <div className="border border-[#1e1e24] bg-[#09090b] p-5 flex flex-col justify-between hover:border-[#00ff88]/30 transition-all rounded-[2px] group">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#a1a1aa] font-mono">Auditorias em cache</span>
              <Activity className="size-3.5 text-[#a1a1aa]" />
            </div>
            <div className="mt-4">
              <span className="text-xl font-black tracking-widest text-[#f4f4f5] font-mono">{totalAudits}</span>
              <span className="text-[8px] text-[#a1a1aa] block font-mono uppercase tracking-widest mt-1">Registros Locais</span>
            </div>
          </div>

          <div className="border border-[#1e1e24] bg-[#09090b] p-5 flex flex-col justify-between hover:border-[#00ff88]/30 transition-all rounded-[2px] group">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#a1a1aa] font-mono">Incidentes / Alertas</span>
              <Cpu className="size-3.5 text-red-500 animate-pulse" />
            </div>
            <div className="mt-4">
              <span className="text-xl font-black tracking-widest text-[#f4f4f5] font-mono">{lastIncident}</span>
              <span className="text-[8px] text-[#00ff88] block font-black mt-1 uppercase tracking-widest font-mono">0 AMEAÇAS ATIVAS</span>
            </div>
          </div>

          <div className="border border-[#1e1e24] bg-[#09090b] p-5 flex flex-col justify-between hover:border-[#00ff88]/30 transition-all rounded-[2px] group">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#a1a1aa] font-mono">Banco de Dados</span>
              <Database className="size-3.5 text-[#a1a1aa]" />
            </div>
            <div className="mt-4">
              <span className="text-xl font-black tracking-widest text-[#00ff88] uppercase font-mono">{databaseType}</span>
              <span className="text-[8px] text-[#a1a1aa] block font-mono uppercase tracking-widest mt-1">Auto-migração ativa</span>
            </div>
          </div>
        </section>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SecurityChart />

            <div className="border border-[#1e1e24] bg-[#09090b] p-6 rounded-[2px]">
              <div className="mb-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#00ff88]">Histórico de Auditoria</h3>
                <p className="text-[9px] text-[#a1a1aa] font-mono">LOG DE AÇÕES E TRANSAÇÕES CRÍTICAS</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px] font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-[#1e1e24] text-[#a1a1aa]">
                      <th className="py-2.5 font-bold uppercase tracking-widest">Ação</th>
                      <th className="py-2.5 font-bold uppercase tracking-widest">Status</th>
                      <th className="py-2.5 font-bold uppercase tracking-widest">Endereço IP</th>
                      <th className="py-2.5 font-bold uppercase tracking-widest">Dispositivo</th>
                      <th className="py-2.5 font-bold uppercase tracking-widest">Data / Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-[#a1a1aa]/60 italic">
                          Nenhum log registrado ainda.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="border-b border-[#1e1e24]/40 last:border-0 hover:bg-[#0c0c0e]/60 transition-colors">
                          <td className="py-2.5 font-bold text-[#f4f4f5]">{log.action}</td>
                          <td className="py-2.5">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest border ${
                                log.status === "success"
                                  ? "bg-[#00ff88]/5 text-[#00ff88] border-[#00ff88]/20"
                                  : "bg-red-500/5 text-red-500 border-red-500/20"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-[#a1a1aa]">{log.ipAddress}</td>
                          <td className="py-2.5 text-[#a1a1aa] truncate max-w-[120px]" title={log.userAgent}>
                            {log.userAgent}
                          </td>
                          <td className="py-2.5 text-[#a1a1aa]">
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
            <DiagnosticsConsole />

            <IntegrationsStatus 
              hasGoogle={hasGoogle}
              hasGithub={hasGithub}
              hasDiscord={hasDiscord}
              hasApple={hasApple}
            />

            <div className="border border-[#1e1e24] bg-[#09090b] p-6 rounded-[2px]">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#00ff88] border-b border-[#1e1e24] pb-2">Configurações Ativas</h3>
              <div className="mt-3 space-y-2.5 text-[10px] font-mono">
                <div className="flex justify-between items-center py-0.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-[#00ff88]" />
                    <span className="text-[#a1a1aa]">Limites de Rotas</span>
                  </div>
                  <span className="font-bold uppercase text-[9px] text-[#00ff88]">Ativo</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-[#00ff88]" />
                    <span className="text-[#a1a1aa]">Assinatura HMAC</span>
                  </div>
                  <span className="font-bold uppercase text-[9px] text-[#f4f4f5]">SHA-256</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-[#00ff88]" />
                    <span className="text-[#a1a1aa]">Políticas CSP</span>
                  </div>
                  <span className="font-bold uppercase text-[9px] text-[#00ff88]">Nonce Ativo</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-[#00ff88]" />
                    <span className="text-[#a1a1aa]">Sessões JWT</span>
                  </div>
                  <span className="font-bold uppercase text-[9px] text-[#f4f4f5]">Exclusivas</span>
                </div>
              </div>
            </div>

            <div className="border border-[#1e1e24] bg-[#09090b] p-6 rounded-[2px]">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#00ff88] border-b border-[#1e1e24] pb-2">Faturamento</h3>
              <div className="mt-3 space-y-3 font-mono">
                {userSubs.length === 0 ? (
                  <p className="text-[10px] text-[#a1a1aa]/60 italic text-center py-2">Nenhuma fatura encontrada.</p>
                ) : (
                  userSubs.map((sub: any) => (
                    <div key={sub.id} className="flex justify-between items-center text-[10px] py-2 border-b border-[#1e1e24]/40 last:border-0 last:pb-0">
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#f4f4f5] uppercase tracking-wider block text-[9px]">
                          {sub.planId.toUpperCase()}
                        </span>
                        <span className="text-[8px] text-[#a1a1aa] block">
                          {new Date(sub.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <a
                        href={`/api/billing/invoice/${sub.id}`}
                        className="text-[8px] font-bold bg-[#0c0c0e] hover:bg-[#00ff88] hover:text-black border border-[#1e1e24] hover:border-transparent px-3 py-1 rounded-[2px] transition-all uppercase tracking-wider"
                        download
                      >
                        PDF
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border border-[#1e1e24] bg-[#09090b] rounded-[2px] overflow-hidden">
              <AuditChat />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
