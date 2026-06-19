"use client"

import * as React from "react"
import { ShieldAlert, ShieldCheck, Globe, GitBranch, Disc, Apple } from "lucide-react"

interface IntegrationsStatusProps {
  hasGoogle: boolean
  hasGithub: boolean
  hasDiscord: boolean
  hasApple: boolean
}

export function IntegrationsStatus({
  hasGoogle,
  hasGithub,
  hasDiscord,
  hasApple,
}: IntegrationsStatusProps) {
  const providers = [
    {
      id: "google",
      name: "Google OAuth",
      icon: Globe,
      active: hasGoogle,
      description: hasGoogle ? "Autenticação operacional" : "Chaves ausentes no painel",
    },
    {
      id: "github",
      name: "GitHub Client",
      icon: GitBranch,
      active: hasGithub,
      description: hasGithub ? "Conexão estabelecida" : "Aguardando credenciais",
    },
    {
      id: "discord",
      name: "Discord Gateway",
      icon: Disc,
      active: hasDiscord,
      description: hasDiscord ? "Sincronização ativa" : "Integração desativada",
    },
    {
      id: "apple",
      name: "Apple Sign-in",
      icon: Apple,
      active: hasApple,
      description: hasApple ? "Assinatura verificada" : "Falta chave privada .p8",
    },
  ]

  return (
    <div className="border border-[#1e1e24] bg-[#09090b] p-5 rounded-[2px] transition-all duration-300 hover:border-[#00ff88]/30">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-[#00ff88]">Integrações Ativas</h3>
          <p className="text-[10px] text-[#a1a1aa] font-mono">STATUS DOS PROVEDORES DE AUTH</p>
        </div>
      </div>
      <div className="space-y-3">
        {providers.map((p) => {
          const Icon = p.icon
          return (
            <div
              key={p.id}
              className="flex items-center justify-between p-2.5 border border-[#1e1e24] bg-[#050506] hover:border-[#00ff88]/20 transition-all duration-200 group rounded-[2px]"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 border border-[#1e1e24] bg-[#0c0c0e] text-[#a1a1aa] group-hover:text-[#00ff88] group-hover:border-[#00ff88]/30 transition-colors rounded-[2px]">
                  <Icon className="size-4" />
                </div>
                <div>
                  <span className="font-mono text-[10px] font-bold block text-[#f4f4f5] uppercase tracking-wider">
                    {p.name}
                  </span>
                  <span className="text-[9px] text-[#a1a1aa] font-mono block">
                    {p.description}
                  </span>
                </div>
              </div>
              <div>
                {p.active ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 border border-[#00ff88]/20 bg-[#00ff88]/5 text-[#00ff88] rounded-[2px]">
                    <ShieldCheck className="size-3" />
                    <span className="text-[9px] font-mono font-bold tracking-widest uppercase">OK</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 border border-red-500/20 bg-red-500/5 text-red-500 rounded-[2px]">
                    <ShieldAlert className="size-3" />
                    <span className="text-[9px] font-mono font-bold tracking-widest uppercase">OFF</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
