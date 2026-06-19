# Conexões Adicionais Integradas (Redis, S3/R2, Stripe, Twilio)

O template vem com conectores pré-prontos estruturados sob a pasta `src/lib/services/` para integrar a aplicação com serviços externos de produção populares.

---

## 1. Redis Client (`redis.ts`)
- **Biblioteca:** `@upstash/redis` (Edge-compatible REST client).
- **Finalidade:** Utilizado para armazenamento em cache compartilhado e Rate Limiting distribuído de alta velocidade.
- **Configuração (.env):**
  ```env
  UPSTASH_REDIS_REST_URL=https://...
  UPSTASH_REDIS_REST_TOKEN=...
  ```
- **Fallback:** Se ausentes, o cliente retorna `null` e o Rate Limiting cai automaticamente para modo de processo em memória, sem interromper a execução local.

---

## 2. S3 / Object Storage Client (`s3.ts`)
- **Biblioteca:** `@aws-sdk/client-s3`.
- **Finalidade:** Upload e armazenamento de arquivos e mídia (fotos, comprovantes, etc.).
- **Compatibilidade:** Totalmente compatível com **AWS S3**, **Cloudflare R2**, **DigitalOcean Spaces** e **MinIO** local.
- **Configuração (.env):**
  ```env
  S3_ENDPOINT=https://...
  S3_ACCESS_KEY_ID=...
  S3_SECRET_ACCESS_KEY=...
  S3_BUCKET=nome-do-bucket
  S3_REGION=auto
  ```
- **Uso:** Importe `uploadFile` e passe a chave (key), o buffer do arquivo e o content-type. Para obter o link de visualização, utilize `getPublicUrl(key)`.

---

## 3. Stripe Payments (`stripe.ts`)
- **Biblioteca:** `stripe`.
- **Finalidade:** Processamento de assinaturas, pagamentos únicos, Pix, Boleto e checagem de integridade de webhooks.
- **Configuração (.env):**
  ```env
  STRIPE_SECRET_KEY=sk_test_...
  NEXT_PUBLIC_APP_URL=https://localhost:3000
  ```
- **Uso:** O conector expõe a função `createCheckoutSession` que gera URLs de pagamento customizadas e `verifyStripeWebhook` para validação de assinaturas das confirmações de pagamento.

---

## 4. Twilio SMS (`twilio.ts`)
- **Biblioteca:** `twilio`.
- **Finalidade:** Envio de SMS e códigos de autenticação em duas etapas (2FA).
- **Configuração (.env):**
  ```env
  TWILIO_ACCOUNT_SID=AC...
  TWILIO_AUTH_TOKEN=...
  TWILIO_FROM_NUMBER=+1...
  ```
- **Uso:** Importe a função `sendSMS` e envie SMS de imediato. Se as credenciais estiverem vazias, a função retorna sucesso silencioso para simplificar testes em ambiente local.
