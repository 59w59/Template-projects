# Autenticação e Gestão de Sessões

O sistema de autenticação deste template foi implementado de raiz para garantir segurança absoluta sem depender de serviços externos.

## Mecanismo de Sessão (Double Token Cookie)

Usamos dois tokens principais armazenados em cookies seguros:

1. **Access Token (`access_token`)**:
   - Tipo: JWT (JSON Web Token) assinado com algoritmo HMAC-SHA256 (`jose`).
   - Duração: 15 minutos (vida curta).
   - Armazena: `userId`, `email`, `role`.
   - Propriedades: `HttpOnly`, `Secure`, `SameSite=Lax`.

2. **Refresh Token (`refresh_token`)**:
   - Tipo: UUID criptograficamente seguro e aleatório.
   - Duração: 7 dias (vida longa).
   - Armazenamento: Um hash unidirecional (HMAC-SHA256) do token é salvo no banco de dados (`sessions.tokenHash`). O token real fica apenas com o cliente no cookie.
   - Propriedades: `HttpOnly`, `Secure`, `SameSite=Lax`.

## Rotação de Refresh Tokens (Token Rotation)

Cada vez que o `access_token` expira, o cliente solicita uma nova sessão usando o `refresh_token`. A plataforma:
1. Valida se o `refresh_token` atual existe no banco de dados.
2. Invalida imediatamente o token antigo.
3. Cria um novo `refresh_token`, salva seu hash no banco e envia o novo token no cookie.
Isso impede ataques de replay e garante que, caso um token seja interceptado, o uso subsequente invalidará todas as sessões ativas do usuário.

## Impressão Digital de Sessão (Hijacking Prevention)

Ao criar uma sessão, gravamos o `ipAddress` e o `userAgent` do cliente no banco. Durante a renovação:
- Se o IP ou o navegador mudar, o sistema assume que a sessão foi sequestrada (*Session Hijacking*).
- O sistema invalida imediatamente a sessão inteira, apaga os cookies e gera um log de aviso crítico.

## Proteção contra CSRF (Cross-Site Request Forgery)

Usamos a técnica de **Double Submit Cookie**:
1. Ao fazer login, a API gera um token CSRF seguro (`generateCSRFToken`) e salva em um cookie com `SameSite=Strict`.
2. Para qualquer requisição de alteração (POST, PUT, DELETE), o cliente deve enviar este mesmo token no cabeçalho `x-csrf-token`.
3. O middleware ou handler compara o token do cookie com o do cabeçalho. Como sites de terceiros não conseguem ler cookies de outros domínios por causa das restrições de mesma origem, a requisição é bloqueada se for um ataque CSRF.
