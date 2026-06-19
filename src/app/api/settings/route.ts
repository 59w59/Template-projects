import { NextResponse } from "next/server"
import { getSystemSettings } from "@/lib/settings/system-settings"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const settings = await getSystemSettings()
    return NextResponse.json({
      success: true,
      data: {
        appName: settings.appName,
        appDescription: settings.appDescription,
        logoUrl: settings.logoUrl,
        faviconUrl: settings.faviconUrl,
        primaryColor: settings.primaryColor,
        borderRadius: settings.borderRadius,
        googleLoginEnabled: !!settings.googleClientId,
        githubLoginEnabled: !!settings.githubClientId,
        discordLoginEnabled: !!settings.discordClientId,
        appleLoginEnabled: !!settings.appleClientId,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
