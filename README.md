# JurisFlow — Sistema de gestão para escritórios de advocacia

Aplicação Next.js (App Router) + TypeScript + Tailwind + Supabase (Auth, Postgres, RLS).

## Requisitos

- Node.js 20+ (testado com Node 26)
- Projeto Supabase próprio

## Configuração local

1. Instale as dependências: `npm install`
2. Copie `.env.example` para `.env.local` e preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
3. Aplique as migrações em ordem no projeto Supabase (SQL Editor ou Supabase CLI): `supabase/migrations/0001_fundacao.sql`, depois `0002_processos.sql` e por último `0003_documentos.sql`.
4. No painel do Supabase, desative o cadastro público (Authentication > Providers > Email > desabilitar "Allow new users to sign up" ou equivalente) para que usuários sejam criados apenas por um administrador.
5. Rode `npm run dev` e acesse `http://localhost:3000`.

## Papéis

| Papel | Permissões |
|---|---|
| admin | Tudo, incluindo gerenciamento de usuários e leitura da auditoria |
| advogado | Lê e escreve clientes, processos e documentos |
| assistente | Lê e escreve clientes, processos e documentos |
| consulta | Somente leitura de clientes, processos e documentos |

Novos usuários entram como `consulta`. Somente administradores alteram papéis (tabela `profiles`, protegida por RLS).

## Segurança

- Proteção de rotas em `src/proxy.ts`, com verificação de permissão também em cada página e Server Action (`src/lib/auth/session.ts`).
- RLS habilitado em `profiles`, `clients` e `audit_log`.
- `audit_log` é somente de inserção (triggers bloqueiam UPDATE e DELETE).

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — ESLint
- `npm test` — testes unitários (matriz de permissões)

## Estado

Veja [ROADMAP.md](./ROADMAP.md).
