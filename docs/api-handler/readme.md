# Centralizador de Handlers de API (`defineHandler`)

Para manter o código-fonte limpo e padronizar o comportamento dos endpoints de API do Next.js, implementamos um wrapper estruturado chamado `defineHandler`.

## O que ele faz de forma automática?

1. **Validação de Payload:**
   - Se um schema Zod for informado na chave `schema`, a requisição é validada de imediato.
   - Para métodos `GET`, ele extrai e valida os query parameters (`searchParams`).
   - Para métodos de escrita (POST, PUT, DELETE, PATCH), ele decodifica o corpo JSON e o valida.
   - Se houver falha, ele intercepta o fluxo e retorna um erro `400 Bad Request` com a lista estruturada de erros.
2. **Rate Limiting Local:**
   - Integra-se ao IP real e executa a política de limitação antes de rodar o código do endpoint. Retorna `429 Too Many Requests` se estourado.
3. **Verificação de Tokens CSRF:**
   - Se a flag `csrfCheck` estiver ativada, ele exige que o cliente envie o token CSRF no cabeçalho.
4. **Verificação de Permissões (Auth & Roles):**
   - Caso `requireAuth` seja ativado, ele valida se o usuário possui acesso válido (via Cookie ou Bearer Token).
   - Se `requireRole` for informado (ex: `['admin']`), ele valida se o cargo do usuário está na lista.
5. **Tratamento de Erros e Logs:**
   - Intercepta erros não tratados, gera logs formatados no console/banco, e devolve um payload JSON de erro padronizado para o cliente (`{ success: false, error: string }`).

## Exemplo de Rota de API Limpa

```typescript
import { defineHandler, HttpError } from "@/lib/api/api-handler";
import { z } from "zod";

const mySchema = z.object({
  name: z.string().min(3),
});

export const POST = defineHandler({
  schema: mySchema,
  requireAuth: true,
  requireRole: ["admin"],
}, async ({ body, user }) => {
  // Código da rota roda com body e user 100% validados e tipados
  return { message: `Olá ${body.name}, você é administrador.` };
});
```
