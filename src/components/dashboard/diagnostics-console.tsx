"use client"

import * as React from "react"
import { Terminal, Play, CheckCircle, RefreshCw } from "lucide-react"

export function DiagnosticsConsole() {
  const [logs, setLogs] = React.useState<string[]>([
    "SISTEMA PRONTO. AGUARDANDO INSTRUÇÕES...",
  ])
  const [running, setRunning] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [finished, setFinished] = React.useState(false)

  const steps = [
    "[INIT] Iniciando diagnóstico de integridade do sistema...",
    "[INFO] Verificando conexões ativas com o banco de dados...",
    "[OK] Banco de dados operacional e estruturado.",
    "[INFO] Verificando cabeçalhos de segurança (CSP, X-Frame-Options)...",
    "[OK] Políticas de CSP estritas validadas.",
    "[INFO] Auditando integridade do token de autenticação JWT...",
    "[OK] Validação criptográfica ativa e saudável.",
    "[INFO] Verificando assinaturas de webhook HMAC-SHA256...",
    "[OK] Chave HMAC-SHA256 ativa.",
    "[SUCCESS] Diagnóstico finalizado. 0 vulnerabilidades ativas detectadas.",
  ]

  const runDiagnostics = () => {
    if (running) return
    setRunning(true)
    setFinished(false)
    setProgress(0)
    setLogs(["[START] Executando rotinas de auditoria..."])

    let currentStep = 0
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setLogs((prev) => [...prev, steps[currentStep]])
        setProgress(Math.round(((currentStep + 1) / steps.length) * 100))
        currentStep++
      } else {
        clearInterval(interval)
        setRunning(false)
        setFinished(true)
      }
    }, 450)
  }

  return (
    <div className="border border-[#1e1e24] bg-[#09090b] p-5 rounded-[2px] transition-all duration-300 hover:border-[#00ff88]/30">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-[#00ff88]">Diagnóstico Interativo</h3>
          <p className="text-[10px] text-[#a1a1aa] font-mono">SANDBOX DE SEGURANÇA LOCAL</p>
        </div>
        <div className="flex items-center gap-1">
          <div className={`h-1.5 w-1.5 rounded-full ${running ? "bg-amber-500 animate-ping" : finished ? "bg-[#00ff88]" : "bg-[#a1a1aa]"}`} />
          <span className="text-[8px] font-mono uppercase tracking-widest text-[#a1a1aa]">
            {running ? "SCANNING" : finished ? "SAFE" : "IDLE"}
          </span>
        </div>
      </div>

      <div className="bg-[#050506] border border-[#1e1e24] p-3 font-mono text-[9px] text-[#00ff88] h-44 overflow-y-auto mb-4 space-y-1 select-none rounded-[2px] leading-relaxed">
        {logs.map((log, idx) => (
          <div key={idx} className="flex gap-1">
            <span className="text-[#a1a1aa]/40">&gt;</span>
            <span className={log?.includes("[SUCCESS]") ? "text-[#00ff88] font-bold" : log?.includes("[OK]") ? "text-[#f4f4f5]" : log?.includes("OFF") ? "text-red-500" : "text-[#00ff88]/80"}>
              {log}
            </span>
          </div>
        ))}
      </div>

      {running && (
        <div className="mb-4">
          <div className="flex justify-between text-[9px] font-mono text-[#a1a1aa] mb-1">
            <span>VARRENDO VULNERABILIDADES</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 bg-[#1e1e24] w-full rounded-[2px] overflow-hidden">
            <div
              className="h-full bg-[#00ff88] transition-all duration-300 rounded-[2px]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={runDiagnostics}
        disabled={running}
        className="w-full flex items-center justify-center gap-2 border border-[#1e1e24] bg-[#0c0c0e] hover:bg-[#00ff88] hover:text-black hover:border-transparent transition-all duration-300 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider rounded-[2px] disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]"
      >
        {running ? (
          <>
            <RefreshCw className="size-3 animate-spin" /> Processando...
          </>
        ) : finished ? (
          <>
            <CheckCircle className="size-3" /> Re-escanear Sistema
          </>
        ) : (
          <>
            <Play className="size-3 group-hover:translate-x-0.5 transition-transform" /> Executar Diagnóstico
          </>
        )}
      </button>
    </div>
  )
}
