import { NextResponse } from "next/server"
import { getSystemSettings } from "@/lib/settings/system-settings"

export async function GET(req: any, { params }: { params: any }) {
  const provider = params.provider
  const settings = await getSystemSettings()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const redirectUri = `${baseUrl}/api/auth/oauth/callback/${provider}`

  let authUrl = ""

  if (provider === "google") {
    if (!settings.googleClientId) {
      return NextResponse.json({ error: "Google OAuth nao configurado" }, { status: 400 })
    }
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${settings.googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent("openid email profile")}&state=google`
  } else if (provider === "github") {
    if (!settings.githubClientId) {
      return NextResponse.json({ error: "GitHub OAuth nao configurado" }, { status: 400 })
    }
    authUrl = `https://github.com/login/oauth/authorize?client_id=${settings.githubClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent("user:email")}&state=github`
  } else if (provider === "discord") {
    if (!settings.discordClientId) {
      return NextResponse.json({ error: "Discord OAuth nao configurado" }, { status: 400 })
    }
    authUrl = `https://discord.com/api/oauth2/authorize?client_id=${settings.discordClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent("identify email")}&state=discord`
  } else if (provider === "apple") {
    if (!settings.appleClientId) {
      return NextResponse.json({ error: "Apple OAuth nao configurado" }, { status: 400 })
    }
    authUrl = `https://appleid.apple.com/auth/authorize?client_id=${settings.appleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent("name email")}&response_mode=query&state=apple`
  } else {
    return NextResponse.json({ error: "Provedor invalido" }, { status: 400 })
  }

  return NextResponse.redirect(authUrl)
}
