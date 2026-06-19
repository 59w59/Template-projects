import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { hashPassword, verifyPasswordReset } from "@/lib/auth/auth"
import { writeAuditLog } from "@/lib/security/audit"
import { getClientIp } from "@/lib/rate-limit/rate-limiter"
import { z } from "zod"

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
})

export const POST = defineHandler(
  { schema: resetPasswordSchema },
  async ({ body, req }) => {
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    const newPasswordHash = await hashPassword(body.password)
    const success = await verifyPasswordReset(body.token, newPasswordHash)

    if (!success) {
      await writeAuditLog(null, "PASSWORD_RESET_SUBMIT", "failed", ip, ua, `Invalid or expired token used`)
      throw new HttpError(400, "Token inválido ou expirado")
    }

    await writeAuditLog(null, "PASSWORD_RESET_SUBMIT", "success", ip, ua, `Password reset successfully`)

    return { message: "Senha redefinida com sucesso!" }
  }
)
