# Roadmap

## Etapa 1 — Fundação (em andamento)

- [x] Projeto Next.js + TypeScript + Tailwind (App Router)
- [x] Matriz de permissões por papel (`src/lib/auth/permissions.ts`) com testes
- [x] Migração inicial: perfis, papéis, clientes, auditoria imutável e RLS (`supabase/migrations/0001_fundacao.sql`)
- [x] Proteção de rotas (`src/proxy.ts`) e verificação de sessão/permissão nas páginas
- [x] Login e logout (Server Actions)
- [x] Layout autenticado com menu completo
- [x] Dashboard com contagem real de clientes (via RLS)
- [ ] Validar a migração e o RLS em um projeto Supabase real (não executado: sem Supabase CLI/Docker local)
- [ ] Recuperação e troca de senha
- [ ] Bootstrap do primeiro administrador
- [ ] Tela de gerenciamento de usuários (somente administrador)
- [x] CRUD de clientes (lista com busca por nome ou CPF/CNPJ, cadastro e edição; sem exclusão, pois o RLS não permite apagar)
- [x] Validação de CPF/CNPJ com dígito verificador (`src/lib/clients/documento.ts`)
- [ ] Testes de isolamento RLS contra o banco

## Etapas seguintes

- Etapa 2 — Processos
- Etapa 3 — Documentos (buckets privados, URLs assinadas)
- Etapa 4 — Publicações, intimações, prazos e agenda
- Etapa 5 — Financeiro e atendimentos
- Etapa 6 — Gerador de documentos e relatórios

Integrações externas (eproc, DJEN) e IA não são simuladas: serão implementadas apenas quando houver acesso real autorizado.
