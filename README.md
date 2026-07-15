# Controle financeiro da casa

Base técnica do aplicativo compartilhado de Matheus e Karina.

## Pré-requisitos

- Node.js 20 ou superior
- Docker Desktop (para o PostgreSQL local)

## Configuração local

1. Copie `.env.example` para `.env`.
2. Inicie o banco: `docker compose up -d`.
3. Instale dependências: `pnpm install`.
4. Crie a estrutura do banco: `pnpm db:migrate --name init`.
5. Inicie o app: `pnpm dev`.

## Convenções principais

- `Person` é uma enumeração fixa: `MATHEUS` e `KARINA`.
- Valores monetários são armazenados como `Decimal(12,2)`.
- Datas de competência não dependem da data de criação do registro.
- Despesas individuais não integram o cálculo de acerto mensal.

## Operação local

- Verifique a disponibilidade do app e do banco em `http://127.0.0.1:3010/api/health`.
- Faça um backup antes de mudanças relevantes: `bash scripts/backup-db.sh`.
- Os arquivos gerados são armazenados em `backups/` e não entram no Git.

## Publicação futura

Antes de publicar, defina o provedor do PostgreSQL, a URL pública e se o acesso será restrito por autenticação. Em produção, use uma `DATABASE_URL` exclusiva e execute as migrações com `prisma migrate deploy`.
