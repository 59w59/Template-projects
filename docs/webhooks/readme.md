# Verificação de Webhooks Segura

O recebimento de eventos assíncronos (como confirmações de pagamento da Stripe, atualizações de usuários da Clerk, etc.) exige validação de autenticidade para evitar que invasores forjem payloads e simulem transações.

## Verificação de Assinatura HMAC

O utilitário `webhook-verifier.ts` oferece uma validação genérica de assinaturas HMAC-SHA256:
1. Ele recebe o corpo bruto da requisição (`rawBody`) — que não deve ter sido parseado como objeto JSON para evitar divergência de formatação de caracteres.
2. Ele computa o hash HMAC-SHA256 do payload usando a chave secreta cadastrada.
3. Compara o hash gerado com o cabeçalho de assinatura fornecido pelo remetente usando comparação em tempo constante (`crypto.timingSafeEqual`) para anular tentativas de ataques por tempo (Timing Attacks).

## Prevenção contra Replay Attacks

Para evitar que um invasor intercepte uma requisição válida de webhook e a reenvie repetidamente para o servidor (Replay Attack), implementamos a verificação por carimbo de data/hora (Timestamp):
- O remetente envia o timestamp exato do envio em um cabeçalho dedicado (ex: `x-timestamp` ou `stripe-signature`).
- Assinamos o conjunto `{timestamp}.{payload}` de forma casada.
- O validador extrai o timestamp, valida se a assinatura combina com este par e calcula a diferença de tempo com o servidor.
- Se a diferença de tempo for maior que a tolerância configurada (padrão: 5 minutos / 300 segundos), a requisição é descartada como obsoleta ou fraudulenta.
