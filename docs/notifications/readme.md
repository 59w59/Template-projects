# Sistema Centralizado de Notificações

O motor de notificações unifica a entrega de avisos e mensagens críticas do sistema por múltiplos canais.

## Funcionamento (`src/lib/notifications/engine.ts`)

A função central `createNotification` realiza as seguintes operações:
1.  **Inserção no Banco:** Grava a notificação na tabela/coleção `notifications` vinculada ao `userId` de destino.
2.  **Envio de E-mail (Opcional):** Se `sendAsEmail` for definido como `true`, dispara imediatamente um e-mail estruturado via Nodemailer (usando o transportador SMTP configurado, ex: Hostinger presets).

## Rotas de API

*   **Listar Notificações** (`GET /api/notifications`): Retorna o histórico de notificações do usuário logado ordenado pelas mais recentes.
*   **Marcar como Lidas** (`POST /api/notifications`): Atualiza o status `isRead` das notificações no banco de dados para `true`.
    *   *Payload (Específico):* `{ "notificationIds": ["not_1", "not_2"] }`
    *   *Payload (Marcar todas em lote):* `{ "all": true }`
