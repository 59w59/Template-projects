import Stripe from "stripe"
import { getSystemSettings } from "../settings/system-settings"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_mock"

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-05-27.dahlia" as any,
})

export async function getStripeClient(): Promise<Stripe> {
  const settings = await getSystemSettings()
  const key = settings.stripeSecretKey || process.env.STRIPE_SECRET_KEY || "sk_test_mock"
  return new Stripe(key, {
    apiVersion: "2026-05-27.dahlia" as any,
  })
}

export async function createCheckoutSession(
  priceId: string,
  customerId?: string,
  customerEmail?: string
): Promise<string | null> {
  try {
    const client = await getStripeClient()
    const session = await client.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000"}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000"}/pricing`,
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
    })
    return session.url
  } catch {
    return null
  }
}

export async function verifyStripeWebhook(body: string, signature: string, endpointSecret: string): Promise<Stripe.Event | null> {
  try {
    const client = await getStripeClient()
    return client.webhooks.constructEvent(body, signature, endpointSecret)
  } catch {
    return null
  }
}
