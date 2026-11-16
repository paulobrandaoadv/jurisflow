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
- [ ] Testes de isolamento RLS contra o banco (pendente: execução no projeto real)

## Etapa 2 — Clientes e Processos (em andamento)

- [x] Migração `supabase/migrations/0002_processos.sql` (processos, vínculos com clientes e equipe, movimentações append-only, RLS e auditoria)
- [x] Validação de número CNJ (formato e dígito verificador) em `src/lib/processos/cnj.ts`
- [x] Cadastro e edição de processos com listas fechadas de grau, situação e fase
- [x] Vínculo de vários clientes por processo (com polo) e de vários processos por cliente
- [x] Equipe responsável por processo (lista de usuários ativos via `equipe_ativa()`)
- [x] Movimentações manuais em ordem cronológica, sem edição nem exclusão
- [x] Lista de processos com busca por CNJ, assunto, partes e cliente, além de filtros de situação e grau
- [x] Dossiê do cliente em abas (Dados, Processos, Documentos, Histórico); demais abas indicam a etapa em que serão implementadas
- [x] Busca global de clientes e processos (`/busca`)
- [ ] Validar a migração 0002 e o RLS no projeto Supabase real
- [ ] Integração com eproc/DJEN: não implementada (não simulada)
- [ ] Botão "Buscar no DataJud" por número CNJ: previsto para depois da integração de publicações (Etapa 6 da especificação)

## Etapa 3 — Documentos (em andamento)

- [x] Migração `supabase/migrations/0003_documentos.sql` (documentos, vínculo com vários processos, bucket privado `documentos`, RLS, auditoria)
- [x] Upload de PDF, JPG, PNG e WEBP com verificação do conteúdo pela assinatura do arquivo (limite de 20 MB por arquivo e 50 MB por envio)
- [x] Compressão automática de imagens com `sharp` (largura máxima 2000 px, qualidade 75; PNG e WEBP viram WEBP)
- [x] Compressão de PDFs com Ghostscript WASM (`@jspawn/ghostscript-wasm`, AGPL-3.0, uso privado) em worker thread: só para PDFs acima de 2 MB, timeout de 40 s, e se falhar ou não reduzir o tamanho o arquivo original é guardado
- [x] Envio de vários arquivos de uma vez, com arrastar e soltar
- [x] Categorias fechadas, tags, data do documento, responsável, cliente e vínculo com processos
- [x] Lista com busca por nome ou descrição e filtro por categoria
- [x] Abertura e download por URL assinada de 60 segundos, gerada no servidor após checagem de permissão
- [x] Aba Documentos no dossiê do cliente
- [x] Edição de dados e exclusão (o arquivo também é removido do bucket)
- [ ] Validar a migração 0003, o bucket e as políticas de storage no projeto Supabase real
- [ ] Adiado: OCR, extração automática de dados e versionamento de documentos

## Etapa 4 — Gerador automático de documentos jurídicos (em andamento)

- [x] Motor de preenchimento de modelos com marcadores `{{cliente.nome}}` etc. e lista de campos faltantes (`src/lib/gerador/modelo.ts`) com testes
- [x] Página `/gerador` com campos disponíveis e lista de modelos
- [ ] Modelos de petição, procuração e contrato (aguardando envio dos modelos pelo usuário)
- [ ] Formulário para escolher cliente, processo e modelo, com pré-visualização
- [ ] Exportação em DOCX e registro do documento gerado na aba Documentos
- [ ] Validar com um modelo real antes de usar em produção

## Etapa 5 — Prazos e agenda (em andamento)

- [x] Motor de cálculo de prazos em dias úteis e corridos (CPC arts. 220 e 224) com feriados nacionais e recesso forense, com testes (`src/lib/prazos/calculo.ts`)
- [x] Cadastro de prazos vinculados a processo e cliente, com fonte, responsável e vencimento manual
- [x] Fluxo de confirmação: pendente → confirmado → cumprido, com correção auditada (justificativa obrigatória)
- [x] Lista de prazos com indicadores de vencidos, até 7 dias e aguardando confirmação
- [x] Agenda em visão mensal com compromissos, tarefas e prazos confirmados
- [x] Migração `0004_prazos_agenda.sql` com RLS (aguardando aplicação no Supabase)
- [ ] Calendários estaduais, municipais e de cada tribunal (hoje só feriados nacionais)
- [x] Alertas por e-mail em 7, 3, 2 e 1 dia antes, no dia e após o vencimento, enviados diariamente às 08:00 via Vercel Cron e Resend (`src/lib/prazos/alertas-job.ts`, migração `0005_alertas_prazos.sql`)
- [ ] Alertas personalizados por prazo (hoje todos seguem o padrão acima)
- [ ] Visões de agenda por semana e por dia
- [x] Prazos próximos no painel inicial (próximos 7 dias, incluindo vencidos)
- [ ] Sincronização com Google Agenda (opcional)

## Etapas seguintes

- Etapa 6 — Integrações (DJEN/publicações e DataJud)
- Etapa 7 — Financeiro e atendimentos
- Etapa 8 — Finalização

Integrações externas (eproc, DJEN) e IA não são simuladas: serão implementadas apenas quando houver acesso real autorizado.
