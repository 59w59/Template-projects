"use client"

import * as React from "react"
import Link from "next/link"
import { ShieldCheck, Database, Zap } from "lucide-react"
import { motion } from "framer-motion"

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-between p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-foreground/5 blur-[130px] pointer-events-none animate-pulse-glow" />

      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-6xl flex justify-between items-center z-10 py-4"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="font-bold tracking-tight text-sm">NextJS.ProdTemplate</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="text-sm font-semibold hover:opacity-80 transition-opacity flex items-center px-4">
            Entrar
          </Link>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/register" className="text-sm font-bold bg-primary text-primary-foreground px-4 py-2 rounded-full hover:opacity-90 transition-opacity">
              Criar Conta
            </Link>
          </motion.div>
        </div>
      </motion.header>

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-5xl text-center space-y-16 z-10 my-auto py-12"
      >
        <motion.div variants={itemVariants} className="space-y-6">
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-gradient leading-tight">
            Next.js Production Ready
          </h1>
          <p className="max-w-xl mx-auto text-sm md:text-base text-muted-foreground leading-relaxed font-light">
            Inicie seus projetos Next.js com segurança de nível bancário, conexões multi-banco chaveadas, controle de organizações (multi-tenant) e observabilidade completa.
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-5xl mx-auto"
        >
          <motion.div
            whileHover={{ y: -6, rotateX: 2 }}
            className="card-creative space-y-4"
          >
            <div className="h-10 w-10 rounded-full border border-border flex items-center justify-center bg-secondary">
              <ShieldCheck className="h-5 w-5 text-foreground" />
            </div>
            <h3 className="text-lg font-bold tracking-tight">Segurança Máxima</h3>
            <p className="text-xs text-muted-foreground leading-relaxed font-light">
              CSP dinâmico com nonces no middleware, assinaturas HMAC-SHA256, proteção contra CSRF e controle completo de 2FA por e-mail.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -6, rotateX: 2 }}
            className="card-creative space-y-4"
          >
            <div className="h-10 w-10 rounded-full border border-border flex items-center justify-center bg-secondary">
              <Database className="h-5 w-5 text-foreground" />
            </div>
            <h3 className="text-lg font-bold tracking-tight">Multi-Database & Tenant</h3>
            <p className="text-xs text-muted-foreground leading-relaxed font-light">
              Suporte para SQLite, PostgreSQL, MySQL e MongoDB. Gestão de equipes (multi-tenant) integrada com controle hierárquico de membros.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -6, rotateX: 2 }}
            className="card-creative space-y-4"
          >
            <div className="h-10 w-10 rounded-full border border-border flex items-center justify-center bg-secondary">
              <Zap className="h-5 w-5 text-foreground" />
            </div>
            <h3 className="text-lg font-bold tracking-tight">Telemetria & Notificações</h3>
            <p className="text-xs text-muted-foreground leading-relaxed font-light">
              Injeção automática de latência, saúde de conexão e carga do sistema em todas as APIs. Motor de notificações e gateways de cobrança centralizados.
            </p>
          </motion.div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex gap-6 justify-center pt-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/register" className="btn-creative">
              <span>Começar Agora</span>
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/login" className="btn-outline-creative">
              <span>Acessar Painel</span>
            </Link>
          </motion.div>
        </motion.div>
      </motion.main>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="w-full max-w-6xl text-center py-4 border-t border-border/40 z-10 text-[10px] text-muted-foreground tracking-wider uppercase font-light"
      >
        Consulte a documentação na pasta <code className="bg-secondary px-1.5 py-0.5 rounded text-foreground font-mono">docs/</code> do projeto.
      </motion.footer>
    </div>
  )
}
