import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { getPaymentGateway } from "@/lib/billing/gateway"
import { writeAuditLog } from "@/lib/security/audit"
import { getClientIp } from "@/lib/rate-limit/rate-limiter"
import { z } from "zod"

const checkoutSchema = z.object({
  planId: z.string().min(1, "PlanId é obrigatório"),
  orgId: z.string().nullable().optional(),
})

export const POST = defineHandler(
  { schema: checkoutSchema, requireAuth: true },
  async ({ body, user, req }) => {
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    const gateway = getPaymentGateway()

    const protocol = req.headers.get("x-forwarded-proto") || "https"
    const host = req.headers.get("host") || "localhost:3000"
    const successUrl = `${protocol}://${host}/dashboard?billing=success`
    const cancelUrl = `${protocol}://${host}/dashboard?billing=canceled`

    const session = await gateway.createCheckoutSession(
      user.userId,
      body.orgId || null,
      body.planId,
      successUrl,
      cancelUrl
    )

    await writeAuditLog(
      user.userId,
      "BILLING_CHECKOUT_INIT",
      "success",
      ip,
      ua,
      `Checkout session created for plan ${body.planId} using gateway`
    )

    return {
      success: true,
      url: session.url,
      sessionId: session.sessionId,
    }
  }
)
