# Serviço de Envio de E-mails

Criamos um serviço de envio de e-mails flexível que permite testes rápidos em desenvolvimento e conexão de alta confiabilidade em produção.

## Preset SMTP Hostinger

Para utilizar o serviço de e-mail da Hostinger, basta definir no seu arquivo `.env`:
```env
EMAIL_SERVICE=hostinger
EMAIL_USER=seu-email@seudominio.com
EMAIL_PASS=sua-senha-smtp
EMAIL_FROM=seu-email@seudominio.com
```

Ao selecionar o preset `hostinger`, o template automaticamente configura:
- Servidor: `smtp.hostinger.com`
- Porta: `465` (SSL)
- Segurança de transporte habilitada

Outros presets inclusos em `presets.ts` são `resend`, `sendgrid` e `mailgun`.

## Modo de Desenvolvimento (Console Fallback)

Se você não preencher as credenciais de e-mail no `.env`:
- O serviço não disparará erros de conexão nem travará a aplicação.
- Ele detectará a ausência do transportador e fará um desvio (*Fallback*).
- O e-mail simulado será impresso diretamente no console em formato estruturado (remetente, destinatário, assunto e o HTML renderizado).
- Isso permite que qualquer desenvolvedor clone o template e teste fluxos de cadastro e recuperação de senha imediatamente no terminal de desenvolvimento.
