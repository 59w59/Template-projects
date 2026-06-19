"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Shield, 
  Users, 
  Database, 
  ArrowLeft, 
  Loader2, 
  Search, 
  Check, 
  X, 
  Download, 
  Info,
  Server,
  Settings,
  Activity,
  BarChart3,
  AlertTriangle,
  Send,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Puzzle,
  Eye,
  EyeOff,
  Sparkles
} from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import { NotificationBell } from "@/components/ui/notification-bell"

interface AuditLog {
  id: string
  userId: string | null
  action: string
  status: string
  ipAddress: string
  userAgent: string
  details: string | null
  createdAt: string
  email: string | null
}

interface UserItem {
  id: string
  email: string
  role: string
  createdAt: string
  emailVerified: boolean
  twoFactorEnabled: boolean
}

interface SystemSettings {
  maintenanceMode: boolean
  maintenanceMessage: string
  disableRegistrations: boolean
  blockedIPs: string[]
  autoPunish: boolean
  rateLimitMax: number
  rateLimitWindow: number
  stripeSecretKey: string
  stripeWebhookSecret: string
  s3AccessKeyId: string
  s3SecretAccessKey: string
  s3Bucket: string
  s3Region: string
  s3Endpoint: string
  twilioAccountSid: string
  twilioAuthToken: string
  twilioFromNumber: string
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  smtpSecure: boolean
  smtpFrom: string
  redisUrl: string
  redisToken: string
  googleClientId?: string
  googleClientSecret?: string
  githubClientId?: string
  githubClientSecret?: string
  discordClientId?: string
  discordClientSecret?: string
  appleClientId?: string
  appleTeamId?: string
  appleKeyId?: string
  applePrivateKey?: string
  appName?: string
  appDescription?: string
  primaryColor?: string
  borderRadius?: string
  logoUrl?: string
  faviconUrl?: string
  geminiApiKey?: string
}

interface DiagnosticsReport {
  database: { status: string; latency?: number; error?: string }
  redis: { status: string; latency?: number; error?: string }
  storage: { status: string; provider?: string; latency?: number; error?: string }
  email: { status: string; user?: string }
  twilio: { status: string }
  stripe: { status: string; latency?: number; error?: string }
}

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<"settings" | "integrations" | "broadcaster" | "logs" | "users" | "diagnostics" | "insights" | "backups" | "copilot">("settings")
  const [integrationSubTab, setIntegrationSubTab] = React.useState<"stripe" | "s3" | "twilio" | "smtp" | "redis" | "oauth" | "ai">("stripe")
  const [visibleKeys, setVisibleKeys] = React.useState<Record<string, boolean>>({})

  const [settings, setSettings] = React.useState<SystemSettings>({
    maintenanceMode: false,
    maintenanceMessage: "",
    disableRegistrations: false,
    blockedIPs: [],
    autoPunish: false,
    rateLimitMax: 100,
    rateLimitWindow: 60000,
    stripeSecretKey: "",
    stripeWebhookSecret: "",
    s3AccessKeyId: "",
    s3SecretAccessKey: "",
    s3Bucket: "",
    s3Region: "",
    s3Endpoint: "",
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioFromNumber: "",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    smtpSecure: false,
    smtpFrom: "",
    redisUrl: "",
    redisToken: "",
    googleClientId: "",
    googleClientSecret: "",
    githubClientId: "",
    githubClientSecret: "",
    discordClientId: "",
    discordClientSecret: "",
    appleClientId: "",
    appleTeamId: "",
    appleKeyId: "",
    applePrivateKey: "",
    appName: "",
    appDescription: "",
    primaryColor: "",
    borderRadius: "",
    logoUrl: "",
    faviconUrl: "",
    geminiApiKey: "",
  })
  const [settingsLoading, setSettingsLoading] = React.useState(false)
  const [savingSettings, setSavingSettings] = React.useState(false)
  const [newBlockedIP, setNewBlockedIP] = React.useState("")
  const [copilotHistory, setCopilotHistory] = React.useState<{ role: string; content: string }[]>([])
  const [copilotInput, setCopilotInput] = React.useState("")
  const [copilotLoading, setCopilotLoading] = React.useState(false)

  const [logs, setLogs] = React.useState<AuditLog[]>([])
  const [logsLoading, setLogsLoading] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState("")
  const [searchFilter, setSearchFilter] = React.useState("")
  const [logTypeFilter, setLogTypeFilter] = React.useState<"all" | "admin" | "user">("all")
  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null)

  const [usersList, setUsersList] = React.useState<UserItem[]>([])
  const [usersLoading, setUsersLoading] = React.useState(false)
  const [userSearch, setUserSearch] = React.useState("")

  const [diagnostics, setDiagnostics] = React.useState<DiagnosticsReport | null>(null)
  const [diagnosticsLoading, setDiagnosticsLoading] = React.useState(false)

  const [notifTarget, setNotifTarget] = React.useState("all")
  const [notifTitle, setNotifTitle] = React.useState("")
  const [notifContent, setNotifContent] = React.useState("")
  const [notifType, setNotifType] = React.useState<"info" | "success" | "warning" | "error">("info")
  const [notifSendEmail, setNotifSendEmail] = React.useState(false)
  const [sendingNotification, setSendingNotification] = React.useState(false)

  const [backingUp, setBackingUp] = React.useState(false)

  const toggleKeyVisibility = (key: string) => {
    setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  React.useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/auth/me")
        if (!res.ok) {
          router.push("/login")
          return
        }
        const data = await res.json()
        if (!data.success || !data.data || !data.data.user || data.data.user.role !== "admin") {
          router.push("/dashboard")
          return
        }
        setUser(data.data.user)
      } catch {
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }
    checkAdmin()
  }, [router])

  React.useEffect(() => {
    if (!user) return

    if (activeTab === "settings" || activeTab === "integrations") {
      fetchSettings()
    } else if (activeTab === "logs") {
      fetchLogs()
    } else if (activeTab === "users") {
      fetchUsers()
    } else if (activeTab === "diagnostics") {
      runDiagnostics()
    }
  }, [activeTab, statusFilter, searchFilter, user])

  async function fetchSettings() {
    setSettingsLoading(true)
    try {
      const res = await fetch("/api/admin/settings")
      if (res.ok) {
        const data = await res.json()
        if (data.data?.settings) {
          setSettings(data.data.settings)
        }
      }
    } catch {
      toast.error("Erro ao carregar configurações")
    } finally {
      setSettingsLoading(false)
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.data?.message || "Configurações atualizadas!")
        if (data.data?.settings) {
          setSettings(data.data.settings)
        }
      } else {
        toast.error(data.error || "Erro ao salvar configurações")
      }
    } catch {
      toast.error("Falha ao enviar configurações")
    } finally {
      setSavingSettings(false)
    }
  }

  async function handleAddIPBlock() {
    if (!newBlockedIP) return
    if (settings.blockedIPs.includes(newBlockedIP)) {
      toast.info("Este IP já está bloqueado")
      return
    }
    const updatedIPs = [...settings.blockedIPs, newBlockedIP]
    setSettings({ ...settings, blockedIPs: updatedIPs })
    setNewBlockedIP("")
  }

  async function handleRemoveIPBlock(ipToRemove: string) {
    const updatedIPs = settings.blockedIPs.filter((ip) => ip !== ipToRemove)
    setSettings({ ...settings, blockedIPs: updatedIPs })
  }

  async function fetchLogs() {
    setLogsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append("status", statusFilter)
      if (searchFilter) params.append("search", searchFilter)

      const res = await fetch(`/api/admin/logs?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.data?.logs || [])
      }
    } catch {
      toast.error("Erro ao carregar logs de auditoria")
    } finally {
      setLogsLoading(false)
    }
  }

  async function fetchUsers() {
    setUsersLoading(true)
    try {
      const res = await fetch("/api/admin/users")
      if (res.ok) {
        const data = await res.json()
        setUsersList(data.data?.users || [])
      }
    } catch {
      toast.error("Erro ao carregar lista de usuários")
    } finally {
      setUsersLoading(false)
    }
  }

  async function handleChangeRole(targetUserId: string, newRole: "user" | "admin") {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId, role: newRole }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.data?.message || "Privilégio atualizado!")
        fetchUsers()
      } else {
        toast.error(data.error || "Erro ao alterar privilégio")
      }
    } catch {
      toast.error("Falha ao atualizar privilégio")
    }
  }

  async function runDiagnostics() {
    setDiagnosticsLoading(true)
    try {
      const res = await fetch("/api/admin/diagnostics")
      if (res.ok) {
        const data = await res.json()
        setDiagnostics(data.data?.diagnostics || null)
      }
    } catch {
      toast.error("Erro ao rodar diagnóstico")
    } finally {
      setDiagnosticsLoading(false)
    }
  }

  async function handleSendNotification(e: React.FormEvent) {
    e.preventDefault()
    setSendingNotification(true)
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: notifTarget,
          title: notifTitle,
          content: notifContent,
          type: notifType,
          sendEmail: notifSendEmail,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.data?.message || "Notificação enviada com sucesso!")
        setNotifTitle("")
        setNotifContent("")
        setNotifSendEmail(false)
      } else {
        toast.error(data.error || "Erro ao enviar notificação")
      }
    } catch {
      toast.error("Falha na requisição de notificação")
    } finally {
      setSendingNotification(false)
    }
  }

  async function triggerBackup() {
    setBackingUp(true)
    try {
      const res = await fetch("/api/admin/backup", { method: "POST" })
      if (!res.ok) {
        throw new Error()
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `backup-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success("Backup exportado com sucesso!")
    } catch {
      toast.error("Falha ao gerar backup")
    } finally {
      setBackingUp(false)
    }
  }

  async function handleSendCopilotMsg(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!copilotInput.trim() || copilotLoading) return

    const userMsg = copilotInput.trim()
    setCopilotInput("")
    const updatedHistory = [...copilotHistory, { role: "user", content: userMsg }]
    setCopilotHistory(updatedHistory)
    setCopilotLoading(true)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: copilotHistory,
        }),
      })
      const data = await res.json()
      if (res.ok && data.data?.response) {
        setCopilotHistory([...updatedHistory, { role: "model", content: data.data.response }])
      } else {
        toast.error(data.error || "Erro ao obter resposta do co-piloto")
        setCopilotHistory([...updatedHistory, { role: "model", content: `Erro: ${data.error || "Desconhecido"}` }])
      }
    } catch {
      toast.error("Falha ao comunicar com o co-piloto")
      setCopilotHistory([...updatedHistory, { role: "model", content: "Erro: Falha na conexão com o servidor." }])
    } finally {
      setCopilotLoading(false)
    }
  }

  async function sendQuickPrompt(promptText: string) {
    if (copilotLoading) return
    setCopilotLoading(true)
    const updatedHistory = [...copilotHistory, { role: "user", content: promptText }]
    setCopilotHistory(updatedHistory)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: promptText,
          history: copilotHistory,
        }),
      })
      const data = await res.json()
      if (res.ok && data.data?.response) {
        setCopilotHistory([...updatedHistory, { role: "model", content: data.data.response }])
      } else {
        toast.error(data.error || "Erro ao obter resposta do co-piloto")
        setCopilotHistory([...updatedHistory, { role: "model", content: `Erro: ${data.error || "Desconhecido"}` }])
      }
    } catch {
      toast.error("Falha ao comunicar com o co-piloto")
      setCopilotHistory([...updatedHistory, { role: "model", content: "Erro: Falha na conexão com o servidor." }])
    } finally {
      setCopilotLoading(false)
    }
  }

  const filteredUsers = usersList.filter((u) => 
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  const filteredLogs = logs.filter((l) => {
    if (logTypeFilter === "admin") {
      return l.action.startsWith("ADMIN_") || (l.email && l.email.includes("admin"))
    }
    if (logTypeFilter === "user") {
      return !l.action.startsWith("ADMIN_") && !(l.email && l.email.includes("admin"))
    }
    return true
  })

  const insightsStats = React.useMemo(() => {
    const total = logs.length
    const success = logs.filter((l) => l.status === "success").length
    const failed = logs.filter((l) => l.status === "failed").length
    const rateLimited = logs.filter((l) => l.action.includes("LIMIT") || l.details?.includes("Rate limit")).length
    
    const actionCounts: Record<string, number> = {}
    logs.forEach((l) => {
      actionCounts[l.action] = (actionCounts[l.action] || 0) + 1
    })

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return { total, success, failed, rateLimited, topActions }
  }, [logs])

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center">
        <Loader2 className="size-8 animate-spin text-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050506] text-[#f4f4f5] font-mono selection:bg-[#00ff88] selection:text-black relative overflow-hidden pb-12">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f24_1px,transparent_1px),linear-gradient(to_bottom,#1f1f24_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.12] pointer-events-none" />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 relative z-10">
        <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-[#1e1e24] animate-fade-in">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/dashboard" className="text-[#a1a1aa] hover:text-[#00ff88] transition-colors flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider">
                <ArrowLeft className="size-3" /> Voltar ao Painel
              </Link>
            </div>
            <h1 className="text-sm font-black tracking-widest uppercase text-[#00ff88]">Administração Global</h1>
            <p className="text-[10px] text-[#a1a1aa] font-mono">PAINEL ADMINISTRATIVO CENTRALIZADO DE AUDITORIA E INFRAESTRUTURA</p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <NotificationBell />
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <aside className="lg:col-span-1 flex flex-row lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 border-b lg:border-b-0 lg:border-r border-[#1e1e24] pr-0 lg:pr-4">
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 w-full justify-start border ${
                activeTab === "settings" 
                  ? "bg-[#00ff88] text-black border-transparent shadow-none" 
                  : "bg-transparent border-[#1e1e24] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/5 hover:border-[#00ff88]/30"
              }`}
            >
              <Settings className="size-4" /> Config. Segurança
            </button>
            <button
              onClick={() => setActiveTab("integrations")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 w-full justify-start border ${
                activeTab === "integrations" 
                  ? "bg-[#00ff88] text-black border-transparent shadow-none" 
                  : "bg-transparent border-[#1e1e24] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/5 hover:border-[#00ff88]/30"
              }`}
            >
              <Puzzle className="size-4" /> Integrações
            </button>
            <button
              onClick={() => setActiveTab("broadcaster")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 w-full justify-start border ${
                activeTab === "broadcaster" 
                  ? "bg-[#00ff88] text-black border-transparent shadow-none" 
                  : "bg-transparent border-[#1e1e24] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/5 hover:border-[#00ff88]/30"
              }`}
            >
              <Send className="size-4" /> Notificar Usuários
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 w-full justify-start border ${
                activeTab === "logs" 
                  ? "bg-[#00ff88] text-black border-transparent shadow-none" 
                  : "bg-transparent border-[#1e1e24] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/5 hover:border-[#00ff88]/30"
              }`}
            >
              <Shield className="size-4" /> Logs & Auditoria
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 w-full justify-start border ${
                activeTab === "users" 
                  ? "bg-[#00ff88] text-black border-transparent shadow-none" 
                  : "bg-transparent border-[#1e1e24] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/5 hover:border-[#00ff88]/30"
              }`}
            >
              <Users className="size-4" /> Usuários
            </button>
            <button
              onClick={() => setActiveTab("diagnostics")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 w-full justify-start border ${
                activeTab === "diagnostics" 
                  ? "bg-[#00ff88] text-black border-transparent shadow-none" 
                  : "bg-transparent border-[#1e1e24] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/5 hover:border-[#00ff88]/30"
              }`}
            >
              <Activity className="size-4" /> Diagnósticos
            </button>
            <button
              onClick={() => {
                setActiveTab("insights")
                fetchLogs()
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 w-full justify-start border ${
                activeTab === "insights" 
                  ? "bg-[#00ff88] text-black border-transparent shadow-none" 
                  : "bg-transparent border-[#1e1e24] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/5 hover:border-[#00ff88]/30"
              }`}
            >
              <BarChart3 className="size-4" /> Insights & Métricas
            </button>
            <button
              onClick={() => setActiveTab("backups")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 w-full justify-start border ${
                activeTab === "backups" 
                  ? "bg-[#00ff88] text-black border-transparent shadow-none" 
                  : "bg-transparent border-[#1e1e24] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/5 hover:border-[#00ff88]/30"
              }`}
            >
              <Database className="size-4" /> Backups
            </button>
            <button
              onClick={() => setActiveTab("copilot")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 w-full justify-start border ${
                activeTab === "copilot" 
                  ? "bg-[#00ff88] text-black border-transparent shadow-none" 
                  : "bg-transparent border-[#1e1e24] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/5 hover:border-[#00ff88]/30"
              }`}
            >
              <Sparkles className="size-4" /> Co-piloto IA
            </button>
          </aside>

          <section className="lg:col-span-4">
            <AnimatePresence mode="wait">
              {activeTab === "settings" && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="border border-[#1e1e24] bg-[#09090b] p-6 space-y-6 rounded-[2px]"
                >
                  <div>
                    <h3 className="text-sm font-bold tracking-tight mb-1">Controles de Segurança</h3>
                    <p className="text-[11px] text-muted-foreground font-light">Gerencie o estado do sistema, bloqueios de novos usuários e moderação de IPs</p>
                  </div>

                  {settingsLoading ? (
                    <div className="py-12 flex justify-center">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="p-4 border border-border/65 rounded-2xl bg-secondary/10 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold block">Modo Manutenção</span>
                            <span className="text-[10px] text-muted-foreground font-light">Fecha a navegação do sistema para não-admins</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                            className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                              settings.maintenanceMode ? "bg-foreground" : "bg-secondary"
                            }`}
                          >
                            <div className={`bg-background w-4 h-4 rounded-full shadow transition-transform ${
                              settings.maintenanceMode ? "translate-x-4" : ""
                            }`} />
                          </button>
                        </div>

                        <div className="p-4 border border-border/65 rounded-2xl bg-secondary/10 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold block">Bloquear Cadastros</span>
                            <span className="text-[10px] text-muted-foreground font-light">Impeça a criação de novas contas no sistema</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, disableRegistrations: !settings.disableRegistrations })}
                            className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                              settings.disableRegistrations ? "bg-foreground" : "bg-secondary"
                            }`}
                          >
                            <div className={`bg-background w-4 h-4 rounded-full shadow transition-transform ${
                              settings.disableRegistrations ? "translate-x-4" : ""
                            }`} />
                          </button>
                        </div>
                      </div>

                      {settings.maintenanceMode && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mensagem de Manutenção</label>
                          <textarea
                            value={settings.maintenanceMessage}
                            onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                            required
                            className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground min-h-[80px]"
                          />
                        </div>
                      )}

                      <div className="border-t border-border/40 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="p-4 border border-border/65 rounded-2xl bg-secondary/10 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold block">Auto-Punish (Ban Automático)</span>
                            <span className="text-[10px] text-muted-foreground font-light">Bane IPs que excederem o rate-limiting</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, autoPunish: !settings.autoPunish })}
                            className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                              settings.autoPunish ? "bg-foreground" : "bg-secondary"
                            }`}
                          >
                            <div className={`bg-background w-4 h-4 rounded-full shadow transition-transform ${
                              settings.autoPunish ? "translate-x-4" : ""
                            }`} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Limite Máximo</label>
                            <input
                              type="number"
                              value={settings.rateLimitMax}
                              onChange={(e) => setSettings({ ...settings, rateLimitMax: parseInt(e.target.value) })}
                              className="w-full bg-secondary/50 border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-foreground"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Janela (ms)</label>
                            <input
                              type="number"
                              value={settings.rateLimitWindow}
                              onChange={(e) => setSettings({ ...settings, rateLimitWindow: parseInt(e.target.value) })}
                              className="w-full bg-secondary/50 border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-foreground"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-border/40 pt-4 space-y-4">
                        <div>
                          <span className="text-xs font-bold block">IPs Bloqueados permanentemente</span>
                          <span className="text-[10px] text-muted-foreground font-light">Insira endereços de IP indesejados para negar acesso total à API</span>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Ex: 192.168.0.1"
                            value={newBlockedIP}
                            onChange={(e) => setNewBlockedIP(e.target.value)}
                            className="bg-secondary/50 border border-border/60 rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-foreground w-48"
                          />
                          <button
                            type="button"
                            onClick={handleAddIPBlock}
                            className="bg-foreground text-background text-xs font-bold px-4 py-2 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
                          >
                            Bloquear
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                          {settings.blockedIPs.length === 0 ? (
                            <span className="text-[10px] text-muted-foreground italic font-light">Nenhum IP bloqueado</span>
                          ) : (
                            settings.blockedIPs.map((ip) => (
                              <span key={ip} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                                {ip}
                                <button type="button" onClick={() => handleRemoveIPBlock(ip)} className="cursor-pointer hover:text-foreground">
                                  <X className="size-3" />
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="border-t border-border/40 pt-4 space-y-4">
                        <div>
                          <span className="text-xs font-bold block">Personalização de Marca (White-Label)</span>
                          <span className="text-[10px] text-muted-foreground font-light">Mude o visual e identidade do seu boilerplate em tempo real</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nome da Aplicação</label>
                            <input
                              type="text"
                              value={settings.appName || ""}
                              onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                              placeholder="Nome do seu SaaS"
                              className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Arredondamento (Border Radius)</label>
                            <input
                              type="text"
                              value={settings.borderRadius || ""}
                              onChange={(e) => setSettings({ ...settings, borderRadius: e.target.value })}
                              placeholder="Ex: 0.5rem ou 8px"
                              className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descrição SEO (Meta Description)</label>
                          <textarea
                            value={settings.appDescription || ""}
                            onChange={(e) => setSettings({ ...settings, appDescription: e.target.value })}
                            placeholder="Descrição que aparece nos resultados do Google"
                            className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground min-h-[60px]"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cor Primária (Hex ou HSL)</label>
                            <input
                              type="text"
                              value={settings.primaryColor || ""}
                              onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                              placeholder="Ex: #3b82f6 ou 220 90% 56%"
                              className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Logo URL</label>
                            <input
                              type="text"
                              value={settings.logoUrl || ""}
                              onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                              placeholder="https://..."
                              className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Favicon URL</label>
                            <input
                              type="text"
                              value={settings.faviconUrl || ""}
                              onChange={(e) => setSettings({ ...settings, faviconUrl: e.target.value })}
                              placeholder="https://..."
                              className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t border-border/40">
                        <button
                          type="submit"
                          disabled={savingSettings}
                          className="bg-foreground text-background text-xs font-bold px-6 py-3 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-50"
                        >
                          {savingSettings ? "Salvando..." : "Salvar Configurações"}
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              )}

              {activeTab === "integrations" && (
                <motion.div
                  key="integrations"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="border border-[#1e1e24] bg-[#09090b] p-6 space-y-6 rounded-[2px]"
                >
                  <div className="flex justify-between items-center border-b border-border/40 pb-4">
                    <div>
                      <h3 className="text-sm font-bold tracking-tight">Integrações de Terceiros</h3>
                      <p className="text-[11px] text-muted-foreground font-light">Configure chaves de API e conexões com serviços externos</p>
                    </div>
                  </div>

                  <div className="flex gap-2 border-b border-border/40 pb-3 overflow-x-auto">
                    {[
                      { id: "stripe", label: "Stripe" },
                      { id: "s3", label: "S3 / R2" },
                      { id: "twilio", label: "Twilio" },
                      { id: "smtp", label: "SMTP Mail" },
                      { id: "redis", label: "Upstash Redis" },
                      { id: "oauth", label: "Social OAuth" },
                      { id: "ai", label: "IA Hub" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setIntegrationSubTab(tab.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
                          integrationSubTab === tab.id
                            ? "bg-foreground text-background"
                            : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {settingsLoading ? (
                    <div className="py-12 flex justify-center">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                      {integrationSubTab === "stripe" && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stripe Secret Key</label>
                            <div className="relative">
                              <input
                                type={visibleKeys["stripeSecretKey"] ? "text" : "password"}
                                value={settings.stripeSecretKey || ""}
                                onChange={(e) => setSettings({ ...settings, stripeSecretKey: e.target.value })}
                                placeholder="sk_test_..."
                                className="w-full bg-secondary/50 border border-border/60 rounded-xl pl-4 pr-10 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                              />
                              <button
                                type="button"
                                onClick={() => toggleKeyVisibility("stripeSecretKey")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                {visibleKeys["stripeSecretKey"] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stripe Webhook Secret</label>
                            <div className="relative">
                              <input
                                type={visibleKeys["stripeWebhookSecret"] ? "text" : "password"}
                                value={settings.stripeWebhookSecret || ""}
                                onChange={(e) => setSettings({ ...settings, stripeWebhookSecret: e.target.value })}
                                placeholder="whsec_..."
                                className="w-full bg-secondary/50 border border-border/60 rounded-xl pl-4 pr-10 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                              />
                              <button
                                type="button"
                                onClick={() => toggleKeyVisibility("stripeWebhookSecret")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                {visibleKeys["stripeWebhookSecret"] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {integrationSubTab === "s3" && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">S3 Access Key ID</label>
                              <input
                                type="text"
                                value={settings.s3AccessKeyId || ""}
                                onChange={(e) => setSettings({ ...settings, s3AccessKeyId: e.target.value })}
                                placeholder="Chave de acesso"
                                className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">S3 Secret Access Key</label>
                              <div className="relative">
                                <input
                                  type={visibleKeys["s3SecretAccessKey"] ? "text" : "password"}
                                  value={settings.s3SecretAccessKey || ""}
                                  onChange={(e) => setSettings({ ...settings, s3SecretAccessKey: e.target.value })}
                                  placeholder="Chave secreta"
                                  className="w-full bg-secondary/50 border border-border/60 rounded-xl pl-4 pr-10 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleKeyVisibility("s3SecretAccessKey")}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  {visibleKeys["s3SecretAccessKey"] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bucket Name</label>
                              <input
                                type="text"
                                value={settings.s3Bucket || ""}
                                onChange={(e) => setSettings({ ...settings, s3Bucket: e.target.value })}
                                placeholder="nome-do-bucket"
                                className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Region</label>
                              <input
                                type="text"
                                value={settings.s3Region || ""}
                                onChange={(e) => setSettings({ ...settings, s3Region: e.target.value })}
                                placeholder="us-east-1"
                                className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Custom Endpoint (Opcional)</label>
                              <input
                                type="text"
                                value={settings.s3Endpoint || ""}
                                onChange={(e) => setSettings({ ...settings, s3Endpoint: e.target.value })}
                                placeholder="https://..."
                                className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {integrationSubTab === "twilio" && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Twilio Account SID</label>
                              <input
                                type="text"
                                value={settings.twilioAccountSid || ""}
                                onChange={(e) => setSettings({ ...settings, twilioAccountSid: e.target.value })}
                                placeholder="AC..."
                                className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Twilio Auth Token</label>
                              <div className="relative">
                                <input
                                  type={visibleKeys["twilioAuthToken"] ? "text" : "password"}
                                  value={settings.twilioAuthToken || ""}
                                  onChange={(e) => setSettings({ ...settings, twilioAuthToken: e.target.value })}
                                  placeholder="Token de autenticação"
                                  className="w-full bg-secondary/50 border border-border/60 rounded-xl pl-4 pr-10 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleKeyVisibility("twilioAuthToken")}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  {visibleKeys["twilioAuthToken"] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Twilio From Number</label>
                            <input
                              type="text"
                              value={settings.twilioFromNumber || ""}
                              onChange={(e) => setSettings({ ...settings, twilioFromNumber: e.target.value })}
                              placeholder="+1..."
                              className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                            />
                          </div>
                        </motion.div>
                      )}

                      {integrationSubTab === "smtp" && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1 sm:col-span-2">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SMTP Host</label>
                              <input
                                type="text"
                                value={settings.smtpHost || ""}
                                onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                                placeholder="smtp.example.com"
                                className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SMTP Port</label>
                              <input
                                type="number"
                                value={settings.smtpPort || 587}
                                onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) || 587 })}
                                placeholder="587"
                                className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SMTP User</label>
                              <input
                                type="text"
                                value={settings.smtpUser || ""}
                                onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                                placeholder="user@example.com"
                                className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SMTP Password</label>
                              <div className="relative">
                                <input
                                  type={visibleKeys["smtpPass"] ? "text" : "password"}
                                  value={settings.smtpPass || ""}
                                  onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                                  placeholder="Senha do SMTP"
                                  className="w-full bg-secondary/50 border border-border/60 rounded-xl pl-4 pr-10 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleKeyVisibility("smtpPass")}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  {visibleKeys["smtpPass"] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SMTP From Email</label>
                              <input
                                type="text"
                                value={settings.smtpFrom || ""}
                                onChange={(e) => setSettings({ ...settings, smtpFrom: e.target.value })}
                                placeholder="noreply@example.com"
                                className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                              />
                            </div>

                            <div className="p-4 border border-border/65 rounded-2xl bg-secondary/10 flex items-center justify-between mt-5">
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold block">Conexão Segura SSL/TLS</span>
                                <span className="text-[10px] text-muted-foreground font-light">Ative se seu servidor exigir SSL</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSettings({ ...settings, smtpSecure: !settings.smtpSecure })}
                                className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                                  settings.smtpSecure ? "bg-foreground" : "bg-secondary"
                                }`}
                              >
                                <div className={`bg-background w-4 h-4 rounded-full shadow transition-transform ${
                                  settings.smtpSecure ? "translate-x-4" : ""
                                }`} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {integrationSubTab === "redis" && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Upstash Redis REST URL</label>
                            <input
                              type="text"
                              value={settings.redisUrl || ""}
                              onChange={(e) => setSettings({ ...settings, redisUrl: e.target.value })}
                              placeholder="https://..."
                              className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Upstash Redis REST Token</label>
                            <div className="relative">
                              <input
                                type={visibleKeys["redisToken"] ? "text" : "password"}
                                value={settings.redisToken || ""}
                                onChange={(e) => setSettings({ ...settings, redisToken: e.target.value })}
                                placeholder="Token de REST"
                                className="w-full bg-secondary/50 border border-border/60 rounded-xl pl-4 pr-10 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                              />
                              <button
                                type="button"
                                onClick={() => toggleKeyVisibility("redisToken")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                {visibleKeys["redisToken"] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {integrationSubTab === "oauth" && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-6"
                        >
                          <div className="border-b border-border/20 pb-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider mb-3">Google OAuth</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Google Client ID</label>
                                <input
                                  type="text"
                                  value={settings.googleClientId || ""}
                                  onChange={(e) => setSettings({ ...settings, googleClientId: e.target.value })}
                                  placeholder="Client ID do Google"
                                  className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Google Client Secret</label>
                                <div className="relative">
                                  <input
                                    type={visibleKeys["googleClientSecret"] ? "text" : "password"}
                                    value={settings.googleClientSecret || ""}
                                    onChange={(e) => setSettings({ ...settings, googleClientSecret: e.target.value })}
                                    placeholder="Client Secret do Google"
                                    className="w-full bg-secondary/50 border border-border/60 rounded-xl pl-4 pr-10 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleKeyVisibility("googleClientSecret")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                  >
                                    {visibleKeys["googleClientSecret"] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="border-b border-border/20 pb-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider mb-3">GitHub OAuth</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GitHub Client ID</label>
                                <input
                                  type="text"
                                  value={settings.githubClientId || ""}
                                  onChange={(e) => setSettings({ ...settings, githubClientId: e.target.value })}
                                  placeholder="Client ID do GitHub"
                                  className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GitHub Client Secret</label>
                                <div className="relative">
                                  <input
                                    type={visibleKeys["githubClientSecret"] ? "text" : "password"}
                                    value={settings.githubClientSecret || ""}
                                    onChange={(e) => setSettings({ ...settings, githubClientSecret: e.target.value })}
                                    placeholder="Client Secret do GitHub"
                                    className="w-full bg-secondary/50 border border-border/60 rounded-xl pl-4 pr-10 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleKeyVisibility("githubClientSecret")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                  >
                                    {visibleKeys["githubClientSecret"] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="border-b border-border/20 pb-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider mb-3">Discord OAuth</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Discord Client ID</label>
                                <input
                                  type="text"
                                  value={settings.discordClientId || ""}
                                  onChange={(e) => setSettings({ ...settings, discordClientId: e.target.value })}
                                  placeholder="Client ID do Discord"
                                  className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Discord Client Secret</label>
                                <div className="relative">
                                  <input
                                    type={visibleKeys["discordClientSecret"] ? "text" : "password"}
                                    value={settings.discordClientSecret || ""}
                                    onChange={(e) => setSettings({ ...settings, discordClientSecret: e.target.value })}
                                    placeholder="Client Secret do Discord"
                                    className="w-full bg-secondary/50 border border-border/60 rounded-xl pl-4 pr-10 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleKeyVisibility("discordClientSecret")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                  >
                                    {visibleKeys["discordClientSecret"] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider mb-3">Apple OAuth</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Apple Client ID (Services ID)</label>
                                <input
                                  type="text"
                                  value={settings.appleClientId || ""}
                                  onChange={(e) => setSettings({ ...settings, appleClientId: e.target.value })}
                                  placeholder="com.example.app.service"
                                  className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Apple Team ID</label>
                                <input
                                  type="text"
                                  value={settings.appleTeamId || ""}
                                  onChange={(e) => setSettings({ ...settings, appleTeamId: e.target.value })}
                                  placeholder="Team ID de 10 caracteres"
                                  className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Apple Key ID</label>
                                <input
                                  type="text"
                                  value={settings.appleKeyId || ""}
                                  onChange={(e) => setSettings({ ...settings, appleKeyId: e.target.value })}
                                  placeholder="Key ID da chave privada"
                                  className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Apple Private Key (.p8 content)</label>
                                <div className="relative">
                                  <textarea
                                    value={settings.applePrivateKey || ""}
                                    onChange={(e) => setSettings({ ...settings, applePrivateKey: e.target.value })}
                                    placeholder="-----BEGIN PRIVATE KEY-----..."
                                    rows={3}
                                    className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-foreground font-mono resize-y"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {integrationSubTab === "ai" && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Gemini API Key</label>
                            <div className="relative">
                              <input
                                type={visibleKeys["geminiApiKey"] ? "text" : "password"}
                                value={settings.geminiApiKey || ""}
                                onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                                placeholder="Sua chave de API do Gemini"
                                className="w-full bg-secondary/50 border border-border/60 rounded-xl pl-4 pr-10 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                              />
                              <button
                                type="button"
                                onClick={() => toggleKeyVisibility("geminiApiKey")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                {visibleKeys["geminiApiKey"] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      <div className="flex justify-end pt-4 border-t border-border/40">
                        <button
                          type="submit"
                          disabled={savingSettings}
                          className="bg-foreground text-background text-xs font-bold px-6 py-3 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-50"
                        >
                          {savingSettings ? "Salvando..." : "Salvar Integrações"}
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              )}

              {activeTab === "broadcaster" && (
                <motion.div
                  key="broadcaster"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="border border-[#1e1e24] bg-[#09090b] p-6 space-y-6 rounded-[2px]"
                >
                  <div>
                    <h3 className="text-sm font-bold tracking-tight mb-1">Notificar Usuários</h3>
                    <p className="text-[11px] text-muted-foreground font-light">Envie mensagens do sistema para a caixa de entrada de todos ou de um usuário específico</p>
                  </div>

                  <form onSubmit={handleSendNotification} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Destinatário</label>
                      <select
                        value={notifTarget}
                        onChange={(e) => setNotifTarget(e.target.value)}
                        className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                      >
                        <option value="all">Transmitir para todos (Broadcast)</option>
                        <option value="user_direct">Usuário específico (E-mail)</option>
                      </select>
                    </div>

                    {notifTarget !== "all" && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">E-mail do Usuário</label>
                        <input
                          type="email"
                          required
                          placeholder="usuario@dominio.com"
                          value={notifTarget === "user_direct" ? "" : notifTarget}
                          onChange={(e) => setNotifTarget(e.target.value)}
                          className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Título do Alerta</label>
                        <input
                          type="text"
                          required
                          value={notifTitle}
                          onChange={(e) => setNotifTitle(e.target.value)}
                          placeholder="Título da notificação"
                          className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipo de Alerta</label>
                        <select
                          value={notifType}
                          onChange={(e) => setNotifType(e.target.value as any)}
                          className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground"
                        >
                          <option value="info">INFO (Azul)</option>
                          <option value="success">SUCCESS (Verde)</option>
                          <option value="warning">WARNING (Amarelo)</option>
                          <option value="error">ERROR (Vermelho)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conteúdo / Mensagem</label>
                      <textarea
                        required
                        value={notifContent}
                        onChange={(e) => setNotifContent(e.target.value)}
                        placeholder="Escreva a mensagem aqui..."
                        className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground min-h-[100px]"
                      />
                    </div>

                    <div className="flex items-center gap-2 py-2">
                      <input
                        type="checkbox"
                        id="notifSendEmail"
                        checked={notifSendEmail}
                        onChange={(e) => setNotifSendEmail(e.target.checked)}
                        className="rounded border-border text-foreground bg-secondary"
                      />
                      <label htmlFor="notifSendEmail" className="text-[10px] text-muted-foreground font-light cursor-pointer select-none">
                        Enviar cópia adicional por e-mail
                      </label>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-border/40">
                      <button
                        type="submit"
                        disabled={sendingNotification}
                        className="bg-foreground text-background text-xs font-bold px-6 py-3 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {sendingNotification ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" /> Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="size-3.5" /> Enviar Notificação
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {activeTab === "logs" && (
                <motion.div
                  key="logs"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div>
                      <h3 className="text-sm font-bold tracking-tight">Logs de Auditoria do Sistema</h3>
                      <p className="text-[11px] text-muted-foreground font-light">Histórico global segregado por tipo de ação no sistema</p>
                    </div>

                    <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
                      <select
                        value={logTypeFilter}
                        onChange={(e) => setLogTypeFilter(e.target.value as any)}
                        className="bg-secondary/50 border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-foreground"
                      >
                        <option value="all">Filtro: Todos</option>
                        <option value="admin">Apenas Admins</option>
                        <option value="user">Apenas Usuários</option>
                      </select>

                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-secondary/50 border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-foreground"
                      >
                        <option value="">Status: Todos</option>
                        <option value="success">Sucesso</option>
                        <option value="failed">Falha</option>
                      </select>

                      <div className="relative flex-1 sm:flex-initial">
                        <Search className="size-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          placeholder="Buscar logs..."
                          className="pl-9 pr-4 py-2 bg-secondary/50 border border-border/60 rounded-xl text-xs text-foreground focus:outline-none focus:border-foreground w-full sm:w-48"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#1e1e24] bg-[#09090b] overflow-hidden rounded-[2px]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border/60 text-muted-foreground">
                            <th className="py-3 px-4 font-medium uppercase tracking-wider">Ação</th>
                            <th className="py-3 px-4 font-medium uppercase tracking-wider">Usuário</th>
                            <th className="py-3 px-4 font-medium uppercase tracking-wider">Status</th>
                            <th className="py-3 px-4 font-medium uppercase tracking-wider">IP</th>
                            <th className="py-3 px-4 font-medium uppercase tracking-wider">Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logsLoading ? (
                            <tr>
                              <td colSpan={5} className="py-12 text-center">
                                <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
                              </td>
                            </tr>
                          ) : filteredLogs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-muted-foreground font-light">
                                Nenhum log de auditoria encontrado.
                              </td>
                            </tr>
                          ) : (
                            filteredLogs.map((log) => (
                              <tr 
                                key={log.id} 
                                onClick={() => setSelectedLog(log)}
                                className="border-b border-border/40 last:border-0 hover:bg-secondary/40 transition-colors cursor-pointer"
                              >
                                <td className="py-3 px-4 font-semibold text-foreground">{log.action}</td>
                                <td className="py-3 px-4 text-muted-foreground font-light">{log.email || "Sistema"}</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                    log.status === "success" 
                                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                      : "bg-red-500/10 text-red-500 border-red-500/20"
                                  }`}>
                                    {log.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono text-muted-foreground">{log.ipAddress}</td>
                                <td className="py-3 px-4 text-muted-foreground font-light">{formatDate(log.createdAt)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <AnimatePresence>
                    {selectedLog && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedLog(null)}
                      >
                        <div 
                          className="glass-strong max-w-lg w-full p-6 space-y-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-between items-center pb-2 border-b border-border/60">
                            <h4 className="text-sm font-bold tracking-tight">Detalhes do Evento</h4>
                            <button onClick={() => setSelectedLog(null)} className="p-1 rounded-lg hover:bg-secondary transition-colors cursor-pointer">
                              <X className="size-4" />
                            </button>
                          </div>

                          <div className="space-y-3 text-xs">
                            <div className="grid grid-cols-3">
                              <span className="text-muted-foreground font-light">Evento:</span>
                              <span className="col-span-2 font-bold text-foreground">{selectedLog.action}</span>
                            </div>
                            <div className="grid grid-cols-3">
                              <span className="text-muted-foreground font-light">Usuário:</span>
                              <span className="col-span-2 text-foreground">{selectedLog.email || "Sistema"}</span>
                            </div>
                            <div className="grid grid-cols-3">
                              <span className="text-muted-foreground font-light">Status:</span>
                              <span className="col-span-2 text-foreground font-bold uppercase">{selectedLog.status}</span>
                            </div>
                            <div className="grid grid-cols-3">
                              <span className="text-muted-foreground font-light">IP Address:</span>
                              <span className="col-span-2 font-mono text-foreground">{selectedLog.ipAddress}</span>
                            </div>
                            <div className="grid grid-cols-3">
                              <span className="text-muted-foreground font-light">User Agent:</span>
                              <span className="col-span-2 text-muted-foreground font-light font-mono truncate" title={selectedLog.userAgent}>
                                {selectedLog.userAgent}
                              </span>
                            </div>
                            <div className="grid grid-cols-3">
                              <span className="text-muted-foreground font-light">Data/Hora:</span>
                              <span className="col-span-2 text-foreground">{formatDate(selectedLog.createdAt)}</span>
                            </div>
                            <div className="border-t border-border/40 pt-3 space-y-1">
                              <span className="text-muted-foreground font-light">Descrição Detalhada:</span>
                              <pre className="bg-secondary/60 p-3 rounded-xl font-mono text-[10px] text-foreground whitespace-pre-wrap overflow-x-auto">
                                {selectedLog.details || "Nenhum detalhe adicional fornecido."}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {activeTab === "users" && (
                <motion.div
                  key="users"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div>
                      <h3 className="text-sm font-bold tracking-tight">Gerenciamento de Usuários</h3>
                      <p className="text-[11px] text-muted-foreground font-light">Visualize as contas registradas e gerencie as permissões administrativas</p>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="size-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Buscar por e-mail..."
                        className="pl-9 pr-4 py-2 bg-secondary/50 border border-border/60 rounded-xl text-xs text-foreground focus:outline-none focus:border-foreground w-full"
                      />
                    </div>
                  </div>

                  <div className="border border-[#1e1e24] bg-[#09090b] overflow-hidden rounded-[2px]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border/60 text-muted-foreground">
                            <th className="py-3 px-4 font-medium uppercase tracking-wider">E-mail</th>
                            <th className="py-3 px-4 font-medium uppercase tracking-wider">Perfil (Role)</th>
                            <th className="py-3 px-4 font-medium uppercase tracking-wider">Verificado</th>
                            <th className="py-3 px-4 font-medium uppercase tracking-wider">MFA (2FA)</th>
                            <th className="py-3 px-4 font-medium uppercase tracking-wider">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersLoading ? (
                            <tr>
                              <td colSpan={5} className="py-12 text-center">
                                <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
                              </td>
                            </tr>
                          ) : filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-muted-foreground font-light">
                                Nenhum usuário encontrado.
                              </td>
                            </tr>
                          ) : (
                            filteredUsers.map((u) => (
                              <tr key={u.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/30 transition-colors">
                                <td className="py-3 px-4 font-semibold text-foreground">{u.email}</td>
                                <td className="py-3 px-4 font-mono text-muted-foreground uppercase">{u.role}</td>
                                <td className="py-3 px-4">
                                  {u.emailVerified ? (
                                    <span className="text-emerald-500 font-bold">Sim</span>
                                  ) : (
                                    <span className="text-muted-foreground">Não</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {u.twoFactorEnabled ? (
                                    <span className="text-emerald-500 font-bold">Ativo</span>
                                  ) : (
                                    <span className="text-muted-foreground">Inativo</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {u.id === user.id ? (
                                    <span className="text-[10px] text-muted-foreground font-light italic">Sua Conta</span>
                                  ) : (
                                    <select
                                      value={u.role}
                                      onChange={(e) => handleChangeRole(u.id, e.target.value as any)}
                                      className="bg-secondary border border-border/60 rounded-xl px-2 py-1 text-[10px] text-foreground focus:outline-none cursor-pointer"
                                    >
                                      <option value="user">USER</option>
                                      <option value="admin">ADMIN</option>
                                    </select>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "diagnostics" && (
                <motion.div
                  key="diagnostics"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="border border-[#1e1e24] bg-[#09090b] p-6 space-y-6 rounded-[2px]"
                >
                  <div className="flex justify-between items-center border-b border-border/40 pb-4">
                    <div>
                      <h3 className="text-sm font-bold tracking-tight">Diagnóstico de Infraestrutura</h3>
                      <p className="text-[11px] text-muted-foreground font-light">Verifique o status de conexão de todas as chaves e APIs integradas</p>
                    </div>
                    <button
                      onClick={runDiagnostics}
                      disabled={diagnosticsLoading}
                      className="bg-foreground text-background text-xs font-bold px-4 py-2 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {diagnosticsLoading ? "Testando..." : "Rodar Testes"}
                    </button>
                  </div>

                  {diagnosticsLoading ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="size-8 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-light">Comunicando com servidores remotos...</span>
                    </div>
                  ) : diagnostics ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(diagnostics).map(([service, info]: [string, any]) => {
                        const isHealthy = info.status === "healthy" || info.status === "mock_enabled"
                        const isConfigured = info.status !== "not_configured"
                        
                        return (
                          <div key={service} className="p-4 border border-border/50 rounded-2xl bg-secondary/15 flex items-center justify-between">
                            <div className="space-y-1 min-w-0">
                              <span className="text-xs font-bold uppercase tracking-wider block">{service}</span>
                              <span className="text-[10px] text-muted-foreground truncate block font-light">
                                {info.provider || info.user || (isHealthy ? "Conexão ativa" : info.error || "Serviço inativo")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isHealthy && info.latency !== undefined && (
                                <span className="text-[9px] font-mono text-muted-foreground">{info.latency}ms</span>
                              )}
                              {!isConfigured ? (
                                <HelpCircle className="size-4.5 text-muted-foreground" />
                              ) : isHealthy ? (
                                <CheckCircle2 className="size-4.5 text-emerald-500" />
                              ) : (
                                <XCircle className="size-4.5 text-red-500" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-muted-foreground font-light">
                      Clique no botão para rodar os testes de diagnóstico de infraestrutura
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "insights" && (
                <motion.div
                  key="insights"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">Insights & Métricas Operacionais</h3>
                    <p className="text-[11px] text-muted-foreground font-light">Estatísticas acumuladas extraídas da telemetria de segurança</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 border border-border/55 rounded-2xl bg-secondary/10 text-center">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total de Eventos</span>
                      <p className="text-2xl font-black mt-1">{insightsStats.total}</p>
                    </div>
                    <div className="p-4 border border-border/55 rounded-2xl bg-secondary/10 text-center">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Operações Sucesso</span>
                      <p className="text-2xl font-black text-emerald-500 mt-1">{insightsStats.success}</p>
                    </div>
                    <div className="p-4 border border-border/55 rounded-2xl bg-secondary/10 text-center">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Erros / Bloqueios</span>
                      <p className="text-2xl font-black text-red-500 mt-1">{insightsStats.failed}</p>
                    </div>
                    <div className="p-4 border border-border/55 rounded-2xl bg-secondary/10 text-center">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Rate Limits</span>
                      <p className="text-2xl font-black text-amber-500 mt-1">{insightsStats.rateLimited}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="border border-[#1e1e24] bg-[#09090b] p-6 space-y-4 rounded-[2px]">
                      <h4 className="text-xs font-bold">Ações Mais Frequentes</h4>
                      <div className="space-y-2">
                        {insightsStats.topActions.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic font-light text-center py-4">Sem dados operacionais</p>
                        ) : (
                          insightsStats.topActions.map(({ action, count }) => (
                            <div key={action} className="flex justify-between items-center text-xs py-1 border-b border-border/30 last:border-0">
                              <span className="font-mono text-muted-foreground truncate max-w-[200px]">{action}</span>
                              <span className="font-bold">{count} vezes</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="border border-[#1e1e24] bg-[#09090b] p-6 space-y-4 flex flex-col justify-between rounded-[2px]">
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold">Eficiência do Sistema</h4>
                        <p className="text-[11px] text-muted-foreground font-light leading-relaxed">
                          A relação entre operações bem-sucedidas e falhas acumuladas ajuda a identificar tentativas de força bruta ou IPs mal-intencionados.
                        </p>
                      </div>
                      <div className="space-y-2 pt-4">
                        <div className="flex justify-between text-[10px] text-muted-foreground font-bold">
                          <span>TAXA DE SUCESSO</span>
                          <span>{insightsStats.total > 0 ? ((insightsStats.success / insightsStats.total) * 100).toFixed(1) : 100}%</span>
                        </div>
                        <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-foreground h-full transition-all duration-500" 
                            style={{ width: `${insightsStats.total > 0 ? (insightsStats.success / insightsStats.total) * 100 : 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "backups" && (
                <motion.div
                  key="backups"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="border border-[#1e1e24] bg-[#09090b] p-6 space-y-6 rounded-[2px]"
                >
                  <div className="flex items-center gap-3 pb-4 border-b border-border/40">
                    <div className="p-2.5 bg-secondary/50 rounded-xl">
                      <Server className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold tracking-tight">Cópia de Segurança do Sistema</h3>
                      <p className="text-[11px] text-muted-foreground font-light">Exportação estruturada de todo o banco de dados em formato JSON</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 border border-border/60 rounded-2xl bg-secondary/20 flex gap-3">
                      <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="text-[11px] text-muted-foreground font-light space-y-1">
                        <p className="font-bold text-foreground">O que o backup inclui?</p>
                        <p>O arquivo exportado contém tabelas completas de usuários, membros de organizações, configurações de faturamento e chaves mapeadas.</p>
                        <p>Os hashes de senhas e tokens são exportados de forma segura e não devem ser expostos fora do ambiente administrative.</p>
                      </div>
                    </div>

                    <div className="flex justify-start pt-4">
                      <button
                        onClick={triggerBackup}
                        disabled={backingUp}
                        className="bg-foreground text-background text-xs font-bold px-6 py-3 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {backingUp ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" /> Exportando...
                          </>
                        ) : (
                          <>
                            <Download className="size-3.5" /> Gerar & Baixar Backup (.json)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "copilot" && (
                <motion.div
                  key="copilot"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="border border-[#1e1e24] bg-[#09090b] p-6 space-y-6 flex flex-col h-[600px] justify-between rounded-[2px]"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-border/40 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-secondary/50 rounded-xl">
                        <Sparkles className="size-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold tracking-tight">Co-piloto de IA</h3>
                        <p className="text-[11px] text-muted-foreground font-light">Assistente autônomo integrado para monitoramento e ações administrativas</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0 text-xs">
                    {copilotHistory.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                        <Sparkles className="size-8 text-muted-foreground/45 animate-pulse" />
                        <div className="space-y-1">
                          <p className="font-bold text-muted-foreground">Como posso ajudar hoje?</p>
                          <p className="text-[10px] text-muted-foreground/60 max-w-[280px] font-light">Você pode me pedir para verificar métricas, listar usuários, banir um IP ou atualizar configurações.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md pt-2">
                          <button
                            type="button"
                            onClick={() => sendQuickPrompt("Verificar métricas e diagnóstico do sistema")}
                            className="bg-secondary/40 hover:bg-secondary/70 border border-border/45 rounded-xl px-3 py-2 text-[10px] text-left text-muted-foreground transition-colors cursor-pointer text-ellipsis overflow-hidden whitespace-nowrap"
                          >
                            Diagnosticar Sistema
                          </button>
                          <button
                            type="button"
                            onClick={() => sendQuickPrompt("Listar os usuários cadastrados e seus cargos")}
                            className="bg-secondary/40 hover:bg-secondary/70 border border-border/45 rounded-xl px-3 py-2 text-[10px] text-left text-muted-foreground transition-colors cursor-pointer text-ellipsis overflow-hidden whitespace-nowrap"
                          >
                            Listar Usuários
                          </button>
                          <button
                            type="button"
                            onClick={() => sendQuickPrompt("Envie uma notificação do tipo warning dizendo que teremos manutenção às 23h")}
                            className="bg-secondary/40 hover:bg-secondary/70 border border-border/45 rounded-xl px-3 py-2 text-[10px] text-left text-muted-foreground transition-colors cursor-pointer text-ellipsis overflow-hidden whitespace-nowrap"
                          >
                            Notificar Manutenção
                          </button>
                          <button
                            type="button"
                            onClick={() => sendQuickPrompt("Ativar o modo de manutenção com a mensagem 'Atualizações do sistema'")}
                            className="bg-secondary/40 hover:bg-secondary/70 border border-border/45 rounded-xl px-3 py-2 text-[10px] text-left text-muted-foreground transition-colors cursor-pointer text-ellipsis overflow-hidden whitespace-nowrap"
                          >
                            Modo Manutenção
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {copilotHistory.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed break-words ${
                                msg.role === "user"
                                  ? "bg-foreground text-background font-medium"
                                  : "bg-secondary/60 border border-border/30 text-foreground"
                              }`}
                            >
                              <span className="whitespace-pre-wrap">{msg.content}</span>
                            </div>
                          </div>
                        ))}
                        {copilotLoading && (
                          <div className="flex justify-start">
                            <div className="bg-secondary/40 border border-border/35 rounded-2xl px-4 py-3 flex items-center gap-2">
                              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground animate-pulse font-light">Co-piloto está trabalhando...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSendCopilotMsg} className="shrink-0 flex items-center gap-2 border-t border-border/20 pt-4">
                    <input
                      type="text"
                      value={copilotInput}
                      onChange={(e) => setCopilotInput(e.target.value)}
                      disabled={copilotLoading}
                      placeholder="Pergunte ao Co-piloto ou solicite uma ação..."
                      className="flex-1 bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={copilotLoading || !copilotInput.trim()}
                      className="bg-foreground text-background rounded-xl px-4 py-2.5 text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      Enviar
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </main>
      </div>
    </div>
  )
}
