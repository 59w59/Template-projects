# Camada de Segurança Avançada

A segurança foi incorporada em todas as camadas da aplicação (rede, cabeçalhos, criptografia e payload).

## Cabeçalhos HTTP e CSP Dinâmico (Nonces)

No `middleware.ts`, injetamos cabeçalhos estritos que limitam o comportamento do navegador e blindam a aplicação contra XSS (Cross-Site Scripting) e Clickjacking:

- **CSP (Content Security Policy) com Nonce:**
  - Geramos um nonce aleatório e único a cada requisição HTTP na camada Edge.
  - O cabeçalho CSP restringe a execução de scripts apenas aos que possuírem este nonce específico (`script-src 'nonce-XXX'`).
  - O nonce é repassado para o servidor via cabeçalho `x-nonce`. Em Server Components, podemos ler este cabeçalho e injetar nos scripts inline de forma segura:
    `<script nonce={headers().get("x-nonce")!} />`
  - Bloqueia totalmente qualquer tentativa de injeção de script de terceiros.
- **X-Frame-Options (DENY):** Impede que a aplicação seja renderizada em `iframe` ou `embed`, neutralizando ataques de sequestro de clique (Clickjacking).
- **HSTS (Strict-Transport-Security):** Obriga o navegador a trafegar exclusivamente via HTTPS por 2 anos (`max-age=63072000`).
- **X-Content-Type-Options (nosniff):** Impede a interpretação de arquivos como scripts se o MIME type for diferente (ex: carregar imagens falsas como JS).

## Prevenção contra Timing Attacks

Ao comparar assinaturas HMAC ou tokens de segurança, o uso de operadores comuns como `===` é inseguro. Compiladores comparam caracteres sequencialmente e encerram a checagem no primeiro caractere incorreto, permitindo que atacantes descubram o token medindo variações de milissegundos no tempo de resposta (Timing Attacks).

Evitamos isso utilizando `crypto.timingSafeEqual` para comparar Buffers em tempo constante, garantindo que o tempo de resposta seja idêntico independente da validade da assinatura.

## Criptografia e Assinatura Criptográfica

A biblioteca `crypto.ts` oferece utilitários de criptografia nativa de alta performance:
- **AES-256-GCM:** Criptografia simétrica com autenticação (AEAD) para esconder dados sensíveis na base. Cada encriptação gera um IV aleatório e um tag de autenticação que assegura que o dado não foi modificado.
- **HMAC-SHA256:** Assinatura de integridade. Usado para assinar cookies e webhooks, garantindo a autenticidade dos dados transmitidos.
