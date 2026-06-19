"use client"

import * as React from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"

export function AuditChat() {
  const [messages, setMessages] = React.useState([
    { id: 1, sender: "system", text: "Conexão estabelecida. Canal de auditoria ativo.", time: "12:00" },
    { id: 2, sender: "bot", text: "Olá! Sou o assistente de segurança do template. Deseja analisar alguma atividade recente?", time: "12:01" },
  ])
  const [input, setInput] = React.useState("")

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const newMsg = {
      id: Date.now(),
      sender: "user",
      text: input,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages((prev) => [...prev, newMsg])
    setInput("")

    setTimeout(() => {
      let replyText = "Desculpe, não entendi. Você pode perguntar sobre 'logs', 'segurança' ou 'banco de dados'."
      const normalized = input.toLowerCase()
      if (normalized.includes("logs") || normalized.includes("auditoria")) {
        replyText = "Os logs de auditoria registram todas as ações críticas dos usuários (ex: login, logout, criação de chaves). Eles são estruturados e salvos no banco de dados."
      } else if (normalized.includes("segurança") || normalized.includes("cripto")) {
        replyText = "O template possui criptografia AES-256-GCM para dados sensíveis, assinaturas HMAC-SHA256 para integridade e CSP estrito contra XSS."
      } else if (normalized.includes("banco") || normalized.includes("drizzle")) {
        replyText = "O Drizzle ORM está integrado com suporte a SQLite, PostgreSQL e MySQL. O MongoDB possui um conector alternativo nativo."
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: replyText,
          time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ])
    }, 1000)
  }

  return (
    <div className="rounded-xl border border-border bg-card/30 flex flex-col h-[280px] backdrop-blur-md">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <h4 className="text-xs font-semibold text-foreground">Suporte de Segurança IA</h4>
        </div>
      </div>
      <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`p-2 rounded-lg max-w-[85%] ${
                m.sender === "user"
                  ? "bg-primary text-primary-foreground"
                  : m.sender === "system"
                    ? "bg-muted/30 text-muted-foreground border border-border"
                    : "bg-muted text-foreground"
              }`}
            >
              {m.text}
            </div>
            <span className="text-[9px] text-muted-foreground mt-0.5 px-1">{m.time}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="p-2 border-t border-border flex gap-1.5">
        <Input
          placeholder="Pergunte sobre logs, segurança ou banco..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="h-8 text-xs bg-background/50 border-input"
        />
        <Button type="submit" size="sm" className="h-8 text-xs px-3">
          Enviar
        </Button>
      </form>
    </div>
  )
}
