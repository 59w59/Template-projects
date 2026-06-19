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
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
  }

  return (
    <div className="min-h-screen w-full bg-[#050506] text-[#f4f4f5] font-mono flex flex-col items-center justify-between p-6 relative overflow-hidden selection:bg-[#00ff88] selection:text-black">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f24_1px,transparent_1px),linear-gradient(to_bottom,#1f1f24_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-[0.12] pointer-events-none" />

      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-6xl flex justify-between items-center z-10 py-4 border-b border-[#1e1e24]"
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          <span className="font-black tracking-widest text-xs uppercase text-[#00ff88]">NextJS.ProdTemplate</span>
        </div>
        <div className="flex gap-2">
          <Link href="/login" className="text-[10px] font-bold uppercase tracking-wider bg-transparent hover:bg-white/5 border border-[#1e1e24] hover:border-[#00ff88]/30 text-[#a1a1aa] hover:text-[#f4f4f5] px-4 py-2 rounded-[2px] transition-all duration-300">
            Entrar
          </Link>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link href="/register" className="text-[10px] font-bold bg-[#00ff88] text-black hover:bg-[#00dd77] px-4 py-2 rounded-[2px] transition-colors uppercase tracking-wider">
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
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="inline-block px-3 py-1 border border-[#00ff88]/20 bg-[#00ff88]/5 text-[#00ff88] text-[9px] font-bold tracking-widest uppercase rounded-[2px]">
            SISTEMA DE PRODUÇÃO SEGURO
          </div>
          <h1 className="text-4xl md:text-7xl font-black tracking-widest text-[#f4f4f5] leading-none uppercase">
            Next.js Production Ready
          </h1>
          <p className="max-w-xl mx-auto text-[10px] text-[#a1a1aa] leading-relaxed font-mono uppercase tracking-wide">
            INICIE SEUS PROJETOS NEXT.JS COM SEGURANÇA DE NÍVEL BANCÁRIO, CONEXÕES MULTI-BANCO CHAVEADAS, CONTROLE DE ORGANIZAÇÕES E OBSERVABILIDADE COMPLETA.
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto"
        >
          <motion.div
            whileHover={{ y: -4 }}
            className="border border-[#1e1e24] bg-[#09090b] p-6 space-y-4 rounded-[2px] transition-all hover:border-[#00ff88]/30 group"
          >
            <div className="h-9 w-9 border border-[#1e1e24] bg-[#0c0c0e] flex items-center justify-center rounded-[2px] text-[#a1a1aa] group-hover:text-[#00ff88] group-hover:border-[#00ff88]/20 transition-colors">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#f4f4f5]">Segurança Máxima</h3>
            <p className="text-[10px] text-[#a1a1aa] leading-relaxed font-mono font-light">
              CSP dinâmico com nonces no middleware, assinaturas HMAC-SHA256, proteção contra CSRF e controle completo de 2FA por e-mail.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="border border-[#1e1e24] bg-[#09090b] p-6 space-y-4 rounded-[2px] transition-all hover:border-[#00ff88]/30 group"
          >
            <div className="h-9 w-9 border border-[#1e1e24] bg-[#0c0c0e] flex items-center justify-center rounded-[2px] text-[#a1a1aa] group-hover:text-[#00ff88] group-hover:border-[#00ff88]/20 transition-colors">
              <Database className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#f4f4f5]">Multi-Database & Tenant</h3>
            <p className="text-[10px] text-[#a1a1aa] leading-relaxed font-mono font-light">
              Suporte para SQLite, PostgreSQL, MySQL e MongoDB. Gestão de equipes integrada com controle hierárquico de membros.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="border border-[#1e1e24] bg-[#09090b] p-6 space-y-4 rounded-[2px] transition-all hover:border-[#00ff88]/30 group"
          >
            <div className="h-9 w-9 border border-[#1e1e24] bg-[#0c0c0e] flex items-center justify-center rounded-[2px] text-[#a1a1aa] group-hover:text-[#00ff88] group-hover:border-[#00ff88]/20 transition-colors">
              <Zap className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#f4f4f5]">Telemetria & Notificações</h3>
            <p className="text-[10px] text-[#a1a1aa] leading-relaxed font-mono font-light">
              Injeção automática de latência, saúde de conexão e carga do sistema em todas as APIs. Motor de notificações e gateways de cobrança centralizados.
            </p>
          </motion.div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex gap-4 justify-center pt-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link href="/register" className="text-[10px] font-bold bg-[#00ff88] text-black hover:bg-[#00dd77] px-6 py-3 rounded-[2px] transition-colors uppercase tracking-widest">
              Começar Agora
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link href="/login" className="text-[10px] font-bold bg-transparent hover:bg-white/5 border border-[#1e1e24] hover:border-[#00ff88]/30 text-[#f4f4f5] px-6 py-3 rounded-[2px] transition-all uppercase tracking-widest">
              Acessar Painel
            </Link>
          </motion.div>
        </motion.div>
      </motion.main>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-6xl text-center py-4 border-t border-[#1e1e24] z-10 text-[9px] text-[#a1a1aa] tracking-widest uppercase"
      >
        DOCUMENTAÇÃO DISPONÍVEL NO DIRETÓRIO <code className="bg-[#0c0c0e] border border-[#1e1e24] px-1.5 py-0.5 rounded-[2px] text-[#00ff88] font-mono">docs/</code> DO PROJETO.
      </motion.footer>
    </div>
  )
}
