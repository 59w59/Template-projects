import type { Metadata } from "next"
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { cookies } from "next/headers"
import { verifyAccessToken } from "@/lib/auth/auth"
import { getSystemSettings } from "@/lib/settings/system-settings"
import "./globals.css"

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
})

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
})

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSystemSettings()
  return {
    title: settings.appName || "NextJS Production Ready Template",
    description: settings.appDescription || "Template premium de Next.js com segurança avançada e design moderno",
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  let isAdmin = false
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("access_token")?.value
    if (token) {
      const user = await verifyAccessToken(token)
      if (user && user.role === "admin") {
        isAdmin = true
      }
    }
  } catch {}

  const settings = await getSystemSettings()

  const customStyles = `
    :root, .dark {
      ${settings.primaryColor ? `--primary: ${settings.primaryColor} !important;` : ""}
      ${settings.borderRadius ? `--radius: ${settings.borderRadius} !important;` : ""}
    }
  `

  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable} h-full antialiased dark`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: customStyles }} />
        {settings.faviconUrl && <link rel="icon" href={settings.faviconUrl} />}
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {settings.maintenanceMode && !isAdmin ? (
          <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-center bg-background relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-foreground/5 blur-[120px] pointer-events-none" />
            <div className="glass-card max-w-md w-full p-8 z-10 space-y-6">
              <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mx-auto bg-secondary/30">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-black tracking-tight text-gradient">Manutenção Ativa</h1>
                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  {settings.maintenanceMessage}
                </p>
              </div>
              <div className="border border-border/40 p-4 rounded-xl bg-secondary/10 text-[10px] text-muted-foreground font-mono">
                Acesso restrito a administradores.
              </div>
            </div>
          </div>
        ) : (
          children
        )}
        <Toaster />
      </body>
    </html>
  )
}
