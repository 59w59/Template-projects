# 🛡️ Next.js Production Ready Template

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2.9-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Drizzle_ORM-0.45.2-C5F745?style=flat-square&logo=drizzle" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/PostgreSQL-Ready-336791?style=flat-square&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/MongoDB-Ready-47A248?style=flat-square&logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/MySQL-Ready-4479A1?style=flat-square&logo=mysql" alt="MySQL" />
  <img src="https://img.shields.io/badge/SQLite-Ready-003B57?style=flat-square&logo=sqlite" alt="SQLite" />
</p>

Boilerplate de nível empresarial para **Next.js (App Router)** com foco em **segurança**, arquitetura multi-driver de banco de dados, controle de equipes (**multi-tenant**), faturamento modular e telemetria de latência integrada a todas as APIs.

---

## ✨ Funcionalidades Principais

### 🔒 Segurança de Ponta a Ponta
*   **Sanitização Inteligente de Payloads:** Proteção recursiva automática contra **Stored & Reflected XSS** (escape de caracteres especiais HTML) e contra **NoSQL Injection** (bloqueio de operadores maliciosos como `$gt`, `$ne` no MongoDB).
*   **Mitigação DoS / Limites de Tráfego:** Rejeita requisições JSON maiores que **1MB** (`413 Payload Too Large`) diretamente no centralizador de APIs.
*   **Nonces e CSP Edge-Level:** Configuração dinâmica de CSP (Content Security Policy) injetando nonces seguros gerados na camada do Middleware.
*   **Mecanismo de Auth Avançada:** Fluxo completo de login, cadastro com auto-login direto, recuperação de senhas encriptada por AES-256-GCM, proteção CSRF (Double-Submit Cookies) e verificação de e-mail 2FA/MFA.

### 🔌 Conectividade Agnóstica (Multi-Database & Billing)
*   **Swapping de Banco de Dados:** Chaveamento automático via `.env` para SQLite, PostgreSQL, MySQL ou MongoDB com auto-migração de tabelas local zero-config.
*   **Centralizador de Checkout (Multi-Gateway):** Estrutura agnóstica de cobrança com presets de suporte integrados para **Stripe** e **Asaas**.
*   **Uploads Híbridos (R2/S3 & Local):** Armazenamento de arquivos com validação rígida de tipos de arquivos e tamanho de até 10MB, direcionando para Cloudflare R2 / AWS S3 em produção ou armazenamento local no disco rígido em ambiente de testes.

---

## 📁 Arquitetura de Diretórios

```
├── docs/                   # Manuais e documentações modulares por domínio
├── src/
│   ├── app/                # Rotas do Next.js e endpoints da API
│   ├── components/         # Design System com Tailwind v4 e Framer Motion
│   └── lib/                # Bibliotecas de lógica, conexão e segurança
├── tests/                  # Suítes de testes de segurança e fluxos estendidos
└── proxy.js                # Proxy SSL local para testes com cookies seguros
```

---

## 🚀 Como Iniciar

### 1. Instalar as Dependências
```bash
git clone <url-do-repositorio>
cd <nome-do-diretorio>
npm install
```

### 2. Configurar o Ambiente `.env`
Duplique o arquivo de exemplo e configure o driver de banco desejado (SQLite é usado por padrão):
```bash
cp .env.example .env
```

```env
DATABASE_TYPE=sqlite
DATABASE_URL=file:local.db
JWT_SECRET=seu_jwt_secret_com_no_minimo_32_caracteres
EMAIL_SERVICE=console
```

### 3. Rodar o Servidor Local com HTTPS Proxy
Como os cookies de autenticação do template exigem a diretiva `Secure` (exigência do OWASP), é necessário rodar com SSL ativado. Um proxy local está integrado para facilitar:
```bash
npm run dev
```
Abra e acesse: **`https://localhost:3000`** (o tráfego HTTPS é encaminhado de forma segura para o Next.js na porta `3001`).

---

## ⚡ Atualização de Banco e Schemas

Toda alteração de modelos em `src/lib/schemas/` deve ser propagada para o banco de dados ativo:

```bash
# 1. Gerar novos arquivos de migração SQL
npx drizzle-kit generate

# 2. Aplicar migrações ao banco remoto (ex: Postgres)
npx drizzle-kit migrate
```
*(Nota: Para SQLite, as migrações locais ocorrem de forma programática automática no startup da aplicação)*

---

## 🧪 Rodar Testes

```bash
# Rodar testes principais (HMAC, AES, 2FA, XSS, NoSQL)
npx tsx tests/security.test.ts

# Rodar testes estendidos (organizações, billing, backups)
npx tsx tests/extended.test.ts
```
