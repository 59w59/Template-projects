# Módulo de Cobrança e Assinaturas (Gateway Centralizado)

A biblioteca de faturamento foi desenvolvida para ser agnóstica de provedor de pagamentos (Multi-Gateway). O sistema expõe uma única interface comum e permite plugar múltiplos gateways sem alterar as rotas da aplicação.

## Arquitetura (`src/lib/billing/gateway.ts`)

A interface `PaymentGateway` abstrai as operações cruciais de um gateway de pagamento:

```typescript
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
```

O método `getPaymentGateway()` age como um factory dinâmico que instancia o gateway com base na variável `PAYMENT_GATEWAY` do arquivo `.env` (ex: `stripe` ou `asaas`).

## Rotas de API

*   **Checkout Session** (`POST /api/billing/checkout`): Inicializa o checkout para o plano solicitado e retorna a URL do gateway correspondente.
    *   *Payload:* `{ "planId": "premium-monthly", "orgId": "org_..." }`
*   **Webhook Handler** (`POST /api/billing/webhook`): Rota pública e unificada para receber os webhooks do gateway de pagamento. Se o status da assinatura for alterado para `subscription.created` ou atualizado, a rota:
    1.  Salva ou atualiza os dados na tabela `subscriptions` do banco ativo (SQLite/PG/MySQL/Mongo).
    2.  Registra no Log de Auditoria.
    3.  Dispara uma notificação interna para o usuário.
