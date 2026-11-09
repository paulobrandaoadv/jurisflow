-- Etapa 3: documentos, vínculo com clientes e processos, bucket privado e RLS.
-- Executar após 0002_processos.sql.
-- As categorias abaixo devem permanecer iguais a CATEGORIAS em src/lib/documentos/validation.ts.

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  nome_original text not null,
  categoria text not null check (categoria in (
    'rg', 'cpf', 'cnh', 'comprovante_residencia', 'certidao_nascimento',
    'certidao_casamento', 'comprovante_renda', 'outro_pessoal',
    'procuracao', 'contrato_honorarios', 'declaracao_hipossuficiencia',
    'declaracao_residencia', 'peticao_inicial', 'contestacao', 'replica',
    'recurso', 'decisao', 'sentenca', 'acordao', 'certidao', 'outro_juridico'
  )),
  descricao text,
  tags text[] not null default '{}',
  data_documento date,
  client_id uuid references public.clients (id),
  responsavel_id uuid references public.profiles (id),
  storage_path text not null unique,
  mime_type text not null,
  tamanho_bytes bigint not null check (tamanho_bytes > 0),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_client_idx on public.documents (client_id);
create index documents_categoria_idx on public.documents (categoria);

-- Um documento pode estar ligado a vários processos.
create table public.document_processes (
  document_id uuid not null references public.documents (id) on delete cascade,
  process_id uuid not null references public.processes (id),
  created_at timestamptz not null default now(),
  primary key (document_id, process_id)
);

create index document_processes_process_idx on public.document_processes (process_id);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create trigger documents_audit
  after insert or update or delete on public.documents
  for each row execute function public.audit_row();

create trigger document_processes_audit
  after insert or update or delete on public.document_processes
  for each row execute function public.audit_row();

-- Bucket privado: nenhum arquivo é acessível sem URL assinada gerada pelo servidor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos',
  'documentos',
  false,
  20971520,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

alter table public.documents enable row level security;
alter table public.document_processes enable row level security;

create policy documents_select on public.documents
  for select to authenticated
  using (public.auth_role() is not null);

create policy documents_insert on public.documents
  for insert to authenticated
  with check (public.auth_role() in ('admin', 'advogado', 'assistente'));

create policy documents_update on public.documents
  for update to authenticated
  using (public.auth_role() in ('admin', 'advogado', 'assistente'))
  with check (public.auth_role() in ('admin', 'advogado', 'assistente'));

create policy documents_delete on public.documents
  for delete to authenticated
  using (public.auth_role() in ('admin', 'advogado', 'assistente'));

create policy document_processes_select on public.document_processes
  for select to authenticated
  using (public.auth_role() is not null);

create policy document_processes_insert on public.document_processes
  for insert to authenticated
  with check (public.auth_role() in ('admin', 'advogado', 'assistente'));

create policy document_processes_delete on public.document_processes
  for delete to authenticated
  using (public.auth_role() in ('admin', 'advogado', 'assistente'));

-- Storage: leitura para qualquer papel ativo; upload e exclusão para quem escreve; sem edição de arquivos.
create policy documentos_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos' and public.auth_role() is not null);

create policy documentos_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documentos' and public.auth_role() in ('admin', 'advogado', 'assistente'));

create policy documentos_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'documentos' and public.auth_role() in ('admin', 'advogado', 'assistente'));
