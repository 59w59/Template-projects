# Sanitização de Payloads & Segurança contra Injeções

Este manual descreve a estratégia de mitigação de ataques por payloads implementada no centralizador de APIs.

## 1. Proteção contra Cross-Site Scripting (XSS)

O sistema conta com um sanitizador recursivo (`src/lib/security/sanitizer.ts`) que codifica caracteres especiais HTML para prevenir a injeção e persistência de scripts maliciosos.

A função `escapeHTML` converte:
*   `&` em `&amp;`
*   `<` em `&lt;`
*   `>` em `&gt;`
*   `"` em `&quot;`
*   `'` em `&#x27;`
*   `/` em `&#x2F;`

Essa conversão impede que códigos como `<script>alert('xss')</script>` sejam interpretados pelo navegador do cliente no momento da renderização.

## 2. Proteção contra NoSQL Injection (MongoDB)

Para aplicações executando sob o MongoDB, atacantes podem tentar injetar operadores de consulta (ex: `{ "$gt": "" }`) para contornar autenticações ou ler dados não autorizados.

O método `sanitizeMongoKeys` remove recursivamente quaisquer chaves de objetos que comecem com o caractere `$`. Isso neutraliza consultas forjadas antes mesmo do Zod realizar a validação estrita.

## 3. Limite de Tamanho de Payloads (DoS Protection)

O centralizador de APIs valida o cabeçalho `Content-Length` de todas as requisições. 
*   **Limite Padrão:** 1MB (1.048.576 bytes).
*   **Tratamento:** Se ultrapassado, o handler lança imediatamente um erro `413 Payload Too Large` sem prosseguir com o processamento ou carregamento em memória da requisição.
*   **Exceção:** A rota de upload seguro de arquivos (`/api/storage/upload`) possui sua própria verificação e está autorizada a processar pacotes maiores (até 10MB).
