"use client"

import * as React from "react"
import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"
import { motion } from "framer-motion"

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-foreground/5 blur-[130px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card max-w-md w-full p-8 z-10 space-y-6"
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-gradient">Entrar</h1>
          <p className="text-xs text-muted-foreground font-light">Insira suas credenciais para acessar a sua conta</p>
        </div>

        <LoginForm />

        <p className="text-center text-xs text-muted-foreground font-light">
          Não tem uma conta?{" "}
          <Link href="/register" className="text-foreground hover:underline font-semibold transition-colors">
            Criar conta
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
