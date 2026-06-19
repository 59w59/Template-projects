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
    <div className="border border-[#1e1e24] bg-[#09090b] flex flex-col h-[280px] rounded-[2px] transition-all duration-300 hover:border-[#00ff88]/30">
      <div className="p-3 border-b border-[#1e1e24] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          <h4 className="text-xs font-black uppercase tracking-wider text-[#00ff88]">Suporte IA</h4>
        </div>
      </div>
      <div className="flex-1 p-3 overflow-y-auto space-y-2 text-[10px] font-mono">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`p-2 border rounded-[2px] max-w-[85%] leading-relaxed ${
                m.sender === "user"
                  ? "bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20"
                  : m.sender === "system"
                    ? "bg-[#050506] text-[#a1a1aa]/60 border-[#1e1e24]"
                    : "bg-[#050506] text-[#f4f4f5] border-[#1e1e24]"
              }`}
            >
              {m.text}
            </div>
            <span className="text-[8px] text-[#a1a1aa]/40 mt-1 px-1">{m.time}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="p-2 border-t border-[#1e1e24] flex gap-1.5">
        <Input
          placeholder="Pergunte sobre segurança..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="h-8 text-[10px] bg-[#050506] border-[#1e1e24] text-[#f4f4f5] focus-visible:ring-1 focus-visible:ring-[#00ff88]/50 focus-visible:border-transparent rounded-[2px] font-mono"
        />
        <Button type="submit" size="sm" className="h-8 text-[10px] font-mono bg-[#0c0c0e] hover:bg-[#00ff88] hover:text-black border border-[#1e1e24] hover:border-transparent rounded-[2px] transition-all px-3">
          Enviar
        </Button>
      </form>
    </div>
  )
}
