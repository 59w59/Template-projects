"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

function ErrorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const status = searchParams.get("status") || "500"
  const message = searchParams.get("message") || "Ocorreu um erro interno no servidor."

  const errorDetails = {
    "400": { title: "Bad Request", desc: "Os dados enviados na requisição estão incorretos ou incompletos." },
    "401": { title: "Não Autorizado", desc: "Você precisa fazer login para acessar este recurso." },
    "403": { title: "Acesso Proibido", desc: "Você não tem permissão para visualizar esta página." },
    "404": { title: "Não Encontrado", desc: "A página ou recurso solicitado não pôde ser encontrado." },
    "429": { title: "Muitas Requisições", desc: "Você atingiu o limite de requisições. Por favor, aguarde alguns instantes." },
    "500": { title: "Erro de Servidor", desc: "Algo deu errado do nosso lado. Estamos trabalhando para corrigir." },
  }

  const detail = errorDetails[status as keyof typeof errorDetails] || errorDetails["500"]

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-destructive/5 blur-[120px] pointer-events-none" />

      <div className="glass-card max-w-md w-full p-8 z-10 text-center space-y-6">
        <h1 className="text-8xl font-black text-destructive/80 tracking-tighter animate-pulse">{status}</h1>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">{detail.title}</h2>
          <p className="text-muted-foreground text-xs leading-relaxed font-light">{message || detail.desc}</p>
        </div>

        <div className="flex gap-4 justify-center pt-2">
          <Button onClick={() => router.back()} variant="outline" className="rounded-full text-xs font-semibold px-5">
            Voltar
          </Button>
          <Button onClick={() => router.push("/")} className="rounded-full text-xs font-semibold px-5">
            Início
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground font-light text-sm">Carregando...</div>}>
      <ErrorContent />
    </React.Suspense>
  )
}
