"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { 
  User, 
  Lock, 
  Shield, 
  Trash2, 
  Smartphone, 
  Laptop, 
  ArrowLeft, 
  Check, 
  Loader2, 
  AlertTriangle 
} from "lucide-react"
import { toast } from "sonner"
import { NotificationBell } from "@/components/ui/notification-bell"

interface UserSession {
  id: string
  ipAddress: string
  userAgent: string
  createdAt: string
  expiresAt: string
}

function parseUserAgent(ua: string) {
  const lowercase = ua.toLowerCase()
  let os = "Sistema Operacional"
  let browser = "Navegador"

  if (lowercase.includes("windows")) os = "Windows"
  else if (lowercase.includes("macintosh") || lowercase.includes("mac os")) os = "macOS"
  else if (lowercase.includes("iphone")) os = "iOS (iPhone)"
  else if (lowercase.includes("ipad")) os = "iOS (iPad)"
  else if (lowercase.includes("android")) os = "Android"
  else if (lowercase.includes("linux")) os = "Linux"

  if (lowercase.includes("firefox")) browser = "Firefox"
  else if (lowercase.includes("chrome") && !lowercase.includes("chromium")) browser = "Chrome"
  else if (lowercase.includes("safari") && !lowercase.includes("chrome")) browser = "Safari"
  else if (lowercase.includes("edge")) browser = "Edge"
  else if (lowercase.includes("opera") || lowercase.includes("opr")) browser = "Opera"

  return { os, browser }
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<"personal" | "security" | "sessions">("personal")

  const [email, setEmail] = React.useState("")
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [savingProfile, setSavingProfile] = React.useState(false)

  const [twoFactorCode, setTwoFactorCode] = React.useState("")
  const [mfaStep, setMfaStep] = React.useState<"idle" | "verifying">("idle")
  const [togglingMfa, setTogglingMfa] = React.useState(false)

  const [sessions, setSessions] = React.useState<UserSession[]>([])
  const [sessionsLoading, setSessionsLoading] = React.useState(false)

  React.useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me")
        if (!res.ok) {
          router.push("/login")
          return
        }
        const data = await res.json()
        if (data.success && data.data && data.data.user) {
          setUser(data.data.user)
          setEmail(data.data.user.email)
        } else {
          router.push("/login")
        }
      } catch {
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [router])

  React.useEffect(() => {
    if (activeTab === "sessions" && user) {
      fetchSessions()
    }
  }, [activeTab, user])

  async function fetchSessions() {
    setSessionsLoading(true)
    try {
      const res = await fetch("/api/user/sessions")
      if (res.ok) {
        const data = await res.json()
        setSessions(data.data?.sessions || [])
      }
    } catch {
      toast.error("Erro ao carregar sessões ativas")
    } finally {
      setSessionsLoading(false)
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("As novas senhas não coincidem")
      return
    }

    setSavingProfile(true)
    try {
      const payload: any = {}
      if (email !== user.email) payload.email = email
      if (newPassword) {
        payload.currentPassword = currentPassword
        payload.newPassword = newPassword
      }

      if (Object.keys(payload).length === 0) {
        toast.info("Nenhuma alteração foi realizada")
        setSavingProfile(false)
        return
      }

      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.data?.message || "Perfil atualizado com sucesso!")
        if (payload.newPassword) {
          router.push("/login")
        } else {
          setUser({ ...user, email })
          setCurrentPassword("")
          setNewPassword("")
          setConfirmPassword("")
        }
      } else {
        toast.error(data.error || "Erro ao atualizar perfil")
      }
    } catch {
      toast.error("Falha na requisição de atualização")
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleRequestEnable2FA() {
    setTogglingMfa(true)
    try {
      const res = await fetch("/api/auth/2fa/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request-enable" }),
      })
      const data = await res.json()
      if (res.ok) {
        setMfaStep("verifying")
        toast.success(data.data?.message || "Código enviado para seu e-mail")
      } else {
        toast.error(data.error || "Erro ao solicitar ativação")
      }
    } catch {
      toast.error("Falha ao se comunicar com o servidor")
    } finally {
      setTogglingMfa(false)
    }
  }

  async function handleConfirmEnable2FA(e: React.FormEvent) {
    e.preventDefault()
    if (!twoFactorCode) {
      toast.error("Por favor insira o código de confirmação")
      return
    }

    setTogglingMfa(true)
    try {
      const res = await fetch("/api/auth/2fa/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm-enable", code: twoFactorCode }),
      })
      const data = await res.json()
      if (res.ok) {
        setUser({ ...user, twoFactorEnabled: true })
        setMfaStep("idle")
        setTwoFactorCode("")
        toast.success(data.data?.message || "MFA ativado com sucesso!")
      } else {
        toast.error(data.error || "Código inválido ou expirado")
      }
    } catch {
      toast.error("Falha ao confirmar ativação")
    } finally {
      setTogglingMfa(false)
    }
  }

  async function handleDisable2FA() {
    setTogglingMfa(true)
    try {
      const res = await fetch("/api/auth/2fa/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable" }),
      })
      const data = await res.json()
      if (res.ok) {
        setUser({ ...user, twoFactorEnabled: false })
        toast.success(data.data?.message || "MFA desativado")
      } else {
        toast.error(data.error || "Erro ao desativar")
      }
    } catch {
      toast.error("Falha ao desativar 2FA")
    } finally {
      setTogglingMfa(false)
    }
  }

  async function handleRevokeSession(sessionId: string) {
    try {
      const res = await fetch("/api/user/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.data?.message || "Sessão revogada com sucesso")
        fetchSessions()
      } else {
        toast.error(data.error || "Erro ao revogar sessão")
      }
    } catch {
      toast.error("Falha ao revogar sessão")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center">
        <Loader2 className="size-8 animate-spin text-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-border animate-fade-in">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-xs">
                <ArrowLeft className="size-3" /> Voltar ao Painel
              </Link>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gradient">Configurações de Conta</h1>
            <p className="text-xs text-muted-foreground font-light">Gerencie seus dados pessoais, sessões e autenticação de duplo fator</p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <NotificationBell />
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <aside className="md:col-span-1 flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 border-b md:border-b-0 md:border-r border-border/40 pr-0 md:pr-4">
            <button
              onClick={() => setActiveTab("personal")}
              className={`flex items-center gap-2 px-4 py-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 w-full justify-start ${
                activeTab === "personal" 
                  ? "bg-foreground text-background shadow-lg" 
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="size-4" /> Dados Pessoais
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-2 px-4 py-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 w-full justify-start ${
                activeTab === "security" 
                  ? "bg-foreground text-background shadow-lg" 
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="size-4" /> Segurança (2FA)
            </button>
            <button
              onClick={() => setActiveTab("sessions")}
              className={`flex items-center gap-2 px-4 py-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 w-full justify-start ${
                activeTab === "sessions" 
                  ? "bg-foreground text-background shadow-lg" 
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Laptop className="size-4" /> Sessões Ativas
            </button>
          </aside>

          <section className="md:col-span-3">
            <AnimatePresence mode="wait">
              {activeTab === "personal" && (
                <motion.div
                  key="personal"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="glass-card p-6 space-y-6"
                >
                  <div>
                    <h3 className="text-sm font-bold tracking-tight mb-1">Informações Básicas</h3>
                    <p className="text-[11px] text-muted-foreground font-light">Atualize seu e-mail de contato ou modifique sua credencial de acesso</p>
                  </div>

                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">E-mail</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground transition-colors"
                      />
                    </div>

                    <div className="border-t border-border/40 my-6 pt-4 space-y-4">
                      <div>
                        <h4 className="text-xs font-bold mb-1">Alterar Senha</h4>
                        <p className="text-[10px] text-muted-foreground font-light">Deixe os campos abaixo em branco caso não queira alterar a senha atual</p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Senha Atual</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Requerido somente se for alterar a senha"
                          className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nova Senha</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mínimo 8 caracteres"
                            className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Confirmar Nova Senha</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Mínimo 8 caracteres"
                            className="w-full bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-foreground transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="bg-foreground text-background text-xs font-bold px-6 py-3 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {savingProfile ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" /> Salvando...
                          </>
                        ) : (
                          "Salvar Alterações"
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {activeTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="glass-card p-6 space-y-6"
                >
                  <div>
                    <h3 className="text-sm font-bold tracking-tight mb-1">Autenticação de Duplo Fator (MFA/2FA)</h3>
                    <p className="text-[11px] text-muted-foreground font-light">Adicione uma camada extra de proteção exigindo um código enviado ao seu e-mail a cada login</p>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border/60 rounded-2xl bg-secondary/20">
                    <div className="space-y-1">
                      <span className="text-xs font-bold">Status do 2FA</span>
                      <p className="text-[10px] text-muted-foreground font-light">Atualmente configurado como:</p>
                    </div>
                    <div>
                      {user.twoFactorEnabled ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          <Check className="size-3" /> Ativado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-500 border-amber-500/20">
                          Desativado
                        </span>
                      )}
                    </div>
                  </div>

                  {user.twoFactorEnabled ? (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground font-light">
                        O duplo fator está ativo. Seus logins futuros solicitarão um código de segurança temporário.
                      </p>
                      <button
                        onClick={handleDisable2FA}
                        disabled={togglingMfa}
                        className="bg-destructive/10 text-destructive border border-destructive/20 text-xs font-bold px-6 py-2.5 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-all cursor-pointer disabled:opacity-50"
                      >
                        {togglingMfa ? "Processando..." : "Desativar Autenticação 2FA"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {mfaStep === "idle" ? (
                        <div className="space-y-4">
                          <p className="text-xs text-muted-foreground font-light">
                            A ativação enviará um código de verificação de 6 dígitos para o e-mail cadastrado para validar o processo.
                          </p>
                          <button
                            onClick={handleRequestEnable2FA}
                            disabled={togglingMfa}
                            className="bg-foreground text-background text-xs font-bold px-6 py-3 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-50"
                          >
                            {togglingMfa ? "Enviando código..." : "Configurar e Ativar 2FA"}
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleConfirmEnable2FA} className="space-y-4 border-t border-border/40 pt-4">
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold">Confirmar Código</h4>
                            <p className="text-[10px] text-muted-foreground font-light">Insira o código de 6 dígitos enviado para {user.email}</p>
                            <input
                              type="text"
                              value={twoFactorCode}
                              onChange={(e) => setTwoFactorCode(e.target.value)}
                              placeholder="000000"
                              maxLength={6}
                              className="w-48 tracking-[0.5em] text-center font-mono bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground transition-colors"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={togglingMfa}
                              className="bg-foreground text-background text-xs font-bold px-6 py-2.5 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-50"
                            >
                              {togglingMfa ? "Validando..." : "Confirmar e Ativar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMfaStep("idle")
                                setTwoFactorCode("")
                              }}
                              className="border border-border text-xs font-bold px-6 py-2.5 rounded-full hover:bg-secondary transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "sessions" && (
                <motion.div
                  key="sessions"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="glass-card p-6 space-y-6"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold tracking-tight mb-1">Sessões Conectadas</h3>
                      <p className="text-[11px] text-muted-foreground font-light">Estes são os dispositivos e navegadores que acessaram a sua conta recentemente</p>
                    </div>
                    <button
                      onClick={fetchSessions}
                      className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Atualizar
                    </button>
                  </div>

                  {sessionsLoading ? (
                    <div className="py-12 flex justify-center">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground font-light">
                      Nenhuma sessão ativa encontrada.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {sessions.map((s) => {
                        const { os, browser } = parseUserAgent(s.userAgent)
                        const isMobile = s.userAgent.toLowerCase().includes("mobile") || s.userAgent.toLowerCase().includes("android") || s.userAgent.toLowerCase().includes("iphone")
                        
                        return (
                          <div key={s.id} className="py-4 flex justify-between items-center first:pt-0 last:pb-0">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-secondary/50 rounded-xl">
                                {isMobile ? (
                                  <Smartphone className="size-4 text-muted-foreground" />
                                ) : (
                                  <Laptop className="size-4 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <span className="text-xs font-bold flex items-center gap-2">
                                  {browser} no {os}
                                </span>
                                <p className="text-[10px] text-muted-foreground font-mono font-light">
                                  IP: {s.ipAddress} • Conectado em: {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                                </p>
                              </div>
                            </div>
                            <div>
                              <button
                                onClick={() => handleRevokeSession(s.id)}
                                className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                                title="Desconectar sessão"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </main>
      </div>
    </div>
  )
}
