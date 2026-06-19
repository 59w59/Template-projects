# Backups Administrativos do Sistema

O módulo de backups administrativos fornece uma ferramenta de exportação completa do estado atual de todas as tabelas em formato JSON estruturado e portável.

## Funcionamento

*   **Independência de Driver:** Em vez de depender de binários como `pg_dump` ou `mysqldump` que podem falhar ou não existir no ambiente de execução, o script executa consultas nativas e compila o banco de dados inteiro em um objeto JSON.
*   **Segurança:** A rota administrativa é restrita exclusivamente a usuários logados cuja permissão no banco seja `role = 'admin'`. Tentativas de acesso por usuários comuns disparam bloqueios e logs de auditoria de falha.

## Rotas de API

*   **Gerar Backup** (`POST /api/admin/backup`): Rota restrita para administradores.
    *   *Retorno:* Força o download de um arquivo JSON compactado chamado `backup-[timestamp].json` contendo todos os dados do banco ativo.
