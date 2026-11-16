-- Etapa 6: publicações e intimações importadas do DJEN.
-- Executar após 0005_alertas_prazos.sql.
-- A importação usa a service role (job diário); usuários leem e tratam as publicações.

create table public.publicacoes (
  id uuid primary key default gen_random_uuid(),
  comunicacao_id bigint not null unique,
  numero_processo text not null,
  sigla_tribunal text,
  data_disponibilizacao date not null,
  tipo_comunicacao text,
  nome_orgao text,
  texto text,
  link text,
  process_id uuid references public.processes (id) on delete set null,
  status text not null default 'nova' check (status in ('nova', 'tratada', 'ignorada')),
  tratada_por uuid references public.profiles (id),
  tratada_em timestamptz,
  created_at timestamptz not null default now()
);

create index publicacoes_status_data_idx on public.publicacoes (status, data_disponibilizacao);
create index publicacoes_process_idx on public.publicacoes (process_id);

create trigger publicacoes_audit
  after insert or update or delete on public.publicacoes
  for each row execute function public.audit_row();

alter table public.publicacoes enable row level security;

create policy publicacoes_select on public.publicacoes
  for select to authenticated
  using (public.auth_role() is not null);

create policy publicacoes_update on public.publicacoes
  for update to authenticated
  using (public.auth_role() in ('admin', 'advogado', 'assistente'))
  with check (public.auth_role() in ('admin', 'advogado', 'assistente'));
