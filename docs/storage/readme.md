# Gerenciamento & Upload de Arquivos

O módulo de arquivos suporta upload local em ambiente de desenvolvimento e conexões diretas para Cloudflare R2 ou AWS S3 em produção de forma transparente.

## Configuração

O provedor é determinado pela variável `STORAGE_PROVIDER` no arquivo `.env`:
*   `local`: Salva os arquivos fisicamente na pasta local `public/uploads/` do projeto. A URL gerada aponta para `/uploads/nome-do-arquivo.ext`.
*   `s3`: Utiliza o cliente AWS SDK (`src/lib/services/s3.ts`) para enviar os dados de buffer para o bucket privado/público especificado nas variáveis.

## Rotas de API

*   **Upload de Arquivo** (`POST /api/storage/upload`): Recebe arquivos via multipart form data (`multipart/form-data`) no campo `file`.
    *   *Validações Internas:*
        *   Tamanho limite estrito de 10MB por arquivo.
        *   MIME-types seguros permitidos (`image/*`, `application/pdf`, `text/plain`, `application/zip`).
        *   Sanitização estrita dos nomes de arquivos removendo caracteres especiais que possam comprometer a segurança.
    *   *Retorno:* Detalhes do arquivo armazenado (id, nome sanitizado, tamanho, tipo MIME e URL pública).
