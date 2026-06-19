# Proxy Reverso HTTPS Local

Desenvolver localmente sob conexão HTTP comum impede o teste de várias políticas e cabeçalhos de segurança essenciais no desenvolvimento moderno.

## O Problema das Conexões HTTP

Navegadores modernos (Chrome, Safari, Firefox) aplicam restrições estritas:
- Cookies com a flag `Secure` são totalmente ignorados em conexões não seguras (HTTP).
- Algumas APIs do navegador (como Web Crypto, Geolocation) e regras de segurança rígidas de CSP exigem contexto seguro (HTTPS).

## A Solução: `proxy.js`

Implementamos um servidor proxy reverso nativo em Node.js (sem dependências externas):
- Ele escuta na porta **3000** (HTTPS).
- Encaminha todo o tráfego de forma transparente para a porta **3001** (HTTP) onde o Next.js roda.
- Injeta o cabeçalho `x-forwarded-proto: https` nas requisições repassadas, permitindo que a aplicação saiba que está rodando em HTTPS real.

## Como gerar os Certificados SSL

Para ativar o modo HTTPS, execute o script utilitário ou o comando openssl:

- **Via Script:**
  `node scripts/generate-certs.js`
- **Via openssl direto:**
  `openssl req -x509 -newkey rsa:2048 -keyout certs/server.key -out certs/server.crt -sha256 -days 365 -nodes -subj "/CN=localhost"`

O proxy verificará a existência de `certs/server.key` e `certs/server.crt` ao iniciar. Se não forem encontrados, ele funcionará em modo de compatibilidade (HTTP simples) emitindo um aviso explicativo no terminal.
