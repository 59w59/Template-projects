import { defineHandler } from "@/lib/api/api-handler"
import { forgotPasswordSchema } from "@/lib/schemas/validation"
import { generatePasswordReset } from "@/lib/auth/auth"
import { sendPasswordResetEmail } from "@/lib/email/email"
import { writeAuditLog } from "@/lib/security/audit"
import { getClientIp } from "@/lib/rate-limit/rate-limiter"

export const POST = defineHandler(
  { schema: forgotPasswordSchema },
  async ({ body, req }) => {
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    const token = await generatePasswordReset(body.email)

    if (token) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000"
      const resetLink = `${appUrl}/reset-password?token=${token}`
      
      sendPasswordResetEmail(body.email, resetLink).catch(() => {})
      
      await writeAuditLog(null, "PASSWORD_RESET_REQUEST", "success", ip, ua, `Password reset generated for: ${body.email}`)
    } else {
      await writeAuditLog(null, "PASSWORD_RESET_REQUEST", "failed", ip, ua, `Email does not exist: ${body.email}`)
    }

    return {
      message: "Se o e-mail estiver cadastrado, você receberá um link de redefinição de senha em breve.",
    }
  }
)
