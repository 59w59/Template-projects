# Camada de Banco de Dados e Auto-Migrações

O template suporta múltiplos bancos de dados out-of-the-box, configurados na pasta `src/lib/db/` e chaveados dinamicamente via variáveis de ambiente.

## Como Alternar o Banco de Dados

Altere a variável `DATABASE_TYPE` no arquivo `.env` para uma das opções:
- `sqlite`: SQLite local em arquivo (padrão de desenvolvimento) ou Turso na nuvem.
- `postgres`: PostgreSQL (direct driver usando `postgres.js`).
- `mysql`: MySQL (usando `mysql2`).
- `mongodb`: MongoDB (driver nativo de conexão).

Os drivers corretos e suas conexões são inicializados dinamicamente pelo arquivo `connection.ts`.

## Auto-criação de Tabelas (Auto-Migrations)

Para o banco de dados padrão (**SQLite**), criamos uma rotina de inicialização automática:
- Quando a aplicação arranca ou o primeiro acesso ao banco é efetuado, a função `initDatabase` importa dinamicamente o migrador do Drizzle (`drizzle-orm/libsql/migrator`).
- Ele executa programaticamente todos os arquivos SQL pendentes dentro da pasta `drizzle/` na raiz do projeto.
- Isso significa que o arquivo `local.db` e todas as tabelas correspondentes (users, sessions, audit_logs) se criam sozinhas instantaneamente sem exigir comandos do console.

## Drizzle Kit e Comandos Úteis

Os esquemas do banco estão localizados em `src/lib/schemas/`. Se você modificar a estrutura de tabelas, execute os comandos:

- **Gerar novas migrações SQL:**
  `npx drizzle-kit generate`
- **Executar migrações manualmente no banco (desenvolvimento):**
  `npx drizzle-kit push`
- **Abrir a interface visual do banco (Drizzle Studio):**
  `npx drizzle-kit studio`
