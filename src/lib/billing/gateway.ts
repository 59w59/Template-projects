export interface CheckoutSessionResult {
  url: string
  sessionId: string
}

export interface WebhookEventResult {
  event: string
  userId: string
  subscriptionId: string
  customerId: string
  status: string
  planId: string
}

export interface PaymentGateway {
  createCheckoutSession(
    userId: string,
    orgId: string | null,
    planId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutSessionResult>

  createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }>

  cancelSubscription(subscriptionId: string): Promise<boolean>

  handleWebhook(payload: string, headers: any): Promise<WebhookEventResult | null>
}

class StripeGateway implements PaymentGateway {
  async createCheckoutSession(
    userId: string,
    orgId: string | null,
    planId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutSessionResult> {
    return {
      url: `https://checkout.stripe.com/pay/cs_mock_${Math.random().toString(36).substring(7)}`,
      sessionId: `cs_mock_${Math.random().toString(36).substring(7)}`,
    }
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }> {
    return {
      url: `https://billing.stripe.com/p/session_mock_${Math.random().toString(36).substring(7)}`,
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    return true
  }

  async handleWebhook(payload: string, headers: any): Promise<WebhookEventResult | null> {
    try {
      const data = JSON.parse(payload)
      if (data.type === "checkout.session.completed") {
        return {
          event: "subscription.created",
          userId: data.client_reference_id || "unknown",
          subscriptionId: data.subscription || `sub_mock_${Math.random().toString(36).substring(7)}`,
          customerId: data.customer || `cus_mock_${Math.random().toString(36).substring(7)}`,
          status: "active",
          planId: data.metadata?.planId || "premium",
        }
      }
      return null
    } catch {
      return null
    }
  }
}

class AsaasGateway implements PaymentGateway {
  async createCheckoutSession(
    userId: string,
    orgId: string | null,
    planId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutSessionResult> {
    return {
      url: `https://asaas.com/checkout/mock_${Math.random().toString(36).substring(7)}`,
      sessionId: `asaas_mock_${Math.random().toString(36).substring(7)}`,
    }
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }> {
    return {
      url: `https://asaas.com/customer/portal/mock`,
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    return true
  }

  async handleWebhook(payload: string, headers: any): Promise<WebhookEventResult | null> {
    try {
      const data = JSON.parse(payload)
      if (data.event === "PAYMENT_CONFIRMED") {
        return {
          event: "subscription.created",
          userId: data.payment?.externalReference || "unknown",
          subscriptionId: `sub_asaas_${data.payment?.id}`,
          customerId: data.payment?.customer,
          status: "active",
          planId: "premium",
        }
      }
      return null
    } catch {
      return null
    }
  }
}

export function getPaymentGateway(name?: string): PaymentGateway {
  const activeGateway = name || process.env.PAYMENT_GATEWAY || "stripe"
  if (activeGateway === "asaas") {
    return new AsaasGateway()
  }
  return new StripeGateway()
}
