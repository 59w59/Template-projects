"use client"

import * as React from "react"
import { Bell, Check, Info, AlertTriangle, CircleCheck, OctagonX, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

interface NotificationItem {
  id: string
  title: string
  content: string
  type: "info" | "success" | "warning" | "error"
  isRead: boolean
  createdAt: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.data?.notifications || [])
      }
    } catch {
    }
  }, [])

  React.useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  async function handleMarkAllAsRead() {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      if (res.ok) {
        setNotifications(notifications.map((n) => ({ ...n, isRead: true })))
        toast.success("Todas as notificações foram marcadas como lidas")
      }
    } catch {
      toast.error("Erro ao marcar notificações como lidas")
    }
  }

  function getIcon(type: string) {
    switch (type) {
      case "success": return <CircleCheck className="size-4 text-emerald-500" />
      case "warning": return <AlertTriangle className="size-4 text-amber-500" />
      case "error": return <OctagonX className="size-4 text-red-500" />
      default: return <Info className="size-4 text-blue-500" />
    }
  }

  function getBorderColor(type: string) {
    switch (type) {
      case "success": return "border-l-emerald-500"
      case "warning": return "border-l-amber-500"
      case "error": return "border-l-red-500"
      default: return "border-l-blue-500"
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full border border-border/60 bg-secondary/20 hover:bg-secondary transition-colors cursor-pointer"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 glass-strong z-50 overflow-hidden text-xs max-h-[400px] flex flex-col"
          >
            <div className="p-4 border-b border-border/60 flex justify-between items-center bg-secondary/10 shrink-0">
              <span className="font-bold">Notificações</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <Check className="size-3" /> Lidas
                </button>
              )}
            </div>

            <div className="overflow-y-auto divide-y divide-border/40 max-h-[300px]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground font-light">
                  Nenhuma notificação recente
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 flex gap-3 transition-colors border-l-2 ${getBorderColor(n.type)} ${
                      n.isRead ? "opacity-60 bg-transparent" : "bg-secondary/20"
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">{getIcon(n.type)}</div>
                    <div className="space-y-1 min-w-0">
                      <p className={`font-bold truncate ${n.isRead ? "text-muted-foreground" : "text-foreground"}`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed break-words font-light">
                        {n.content}
                      </p>
                      <p className="text-[9px] text-muted-foreground/60 font-light">
                        {new Date(n.createdAt).toLocaleDateString("pt-BR")} às {new Date(n.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
