-- Etapa 2: processos, vínculo com clientes e advogados, histórico processual e RLS.
-- Executar após 0001_fundacao.sql.

create table public.processes (
  id uuid primary key default gen_random_uuid(),
  numero_cnj text check (numero_cnj ~ '^[0-9]{7}-[0-9]{2}\.[0-9]{4}\.[0-9]\.[0-9]{2}\.[0-9]{4}$'),
  tribunal text,
  sistema_processual text,
  grau text check (grau in ('primeiro', 'segundo', 'superior', 'administrativo')),
  comarca text,
  vara text,
  classe text,
  assunto text,
  area_juridica text,
  parte_autora text,
  parte_re text,
  data_distribuicao date,
  valor_causa numeric(14, 2) check (valor_causa >= 0),
  situacao text not null default 'ativo' check (situacao in ('ativo', 'suspenso', 'arquivado', 'encerrado')),
  fase text check (fase in ('conhecimento', 'recursal', 'execucao', 'outra')),
  observacoes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Número CNJ é único quando informado; processos administrativos podem não ter número.
create unique index processes_numero_cnj_unique on public.processes (numero_cnj);
create index processes_situacao_idx on public.processes (situacao);

create table public.process_clients (
  process_id uuid not null references public.processes (id) on delete cascade,
  client_id uuid not null references public.clients (id),
  polo text not null default 'outro' check (polo in ('autor', 'reu', 'outro')),
  created_at timestamptz not null default now(),
  primary key (process_id, client_id)
);

create index process_clients_client_idx on public.process_clients (client_id);

create table public.process_members (
  process_id uuid not null references public.processes (id) on delete cascade,
  profile_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  primary key (process_id, profile_id)
);

create index process_members_profile_idx on public.process_members (profile_id);

-- Movimentações são históricas: podem ser criadas, nunca alteradas nem apagadas.
create table public.process_movements (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes (id) on delete cascade,
  data date not null default current_date,
  titulo text not null check (length(trim(titulo)) > 0),
  descricao text,
  origem text not null default 'manual' check (origem in ('manual', 'integracao')),
  responsavel_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index process_movements_process_idx on public.process_movements (process_id, data desc);

-- Lista de usuários ativos para escolher advogados responsáveis, sem expor perfis inteiros.
create or replace function public.equipe_ativa()
returns table (id uuid, name text, role public.user_role)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name, p.role
  from public.profiles p
  where p.active and public.auth_role() is not null
  order by p.name
$$;

revoke all on function public.equipe_ativa() from public;
grant execute on function public.equipe_ativa() to authenticated;

create trigger processes_set_updated_at
  before update on public.processes
  for each row execute function public.set_updated_at();

create trigger processes_audit
  after insert or update or delete on public.processes
  for each row execute function public.audit_row();

create trigger process_clients_audit
  after insert or update or delete on public.process_clients
  for each row execute function public.audit_row();

create trigger process_members_audit
  after insert or update or delete on public.process_members
  for each row execute function public.audit_row();

create trigger process_movements_audit
  after insert or update or delete on public.process_movements
  for each row execute function public.audit_row();

create or replace function public.registro_somente_insercao()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Movimentações processuais não podem ser alteradas nem apagadas.';
end;
$$;

create trigger process_movements_no_update_delete
  before update or delete on public.process_movements
  for each row execute function public.registro_somente_insercao();

revoke update, delete, truncate on public.process_movements from anon, authenticated;

alter table public.processes enable row level security;
alter table public.process_clients enable row level security;
alter table public.process_members enable row level security;
alter table public.process_movements enable row level security;

-- Qualquer papel ativo lê; admin, advogado e assistente escrevem; ninguém apaga processos.
create policy processes_select on public.processes
  for select to authenticated
  using (public.auth_role() is not null);

create policy processes_insert on public.processes
  for insert to authenticated
  with check (public.auth_role() in ('admin', 'advogado', 'assistente'));

create policy processes_update on public.processes
  for update to authenticated
  using (public.auth_role() in ('admin', 'advogado', 'assistente'))
  with check (public.auth_role() in ('admin', 'advogado', 'assistente'));

-- Vínculos podem ser criados e removidos por quem escreve; a remoção fica na auditoria.
create policy process_clients_select on public.process_clients
  for select to authenticated
  using (public.auth_role() is not null);

create policy process_clients_insert on public.process_clients
  for insert to authenticated
  with check (public.auth_role() in ('admin', 'advogado', 'assistente'));

create policy process_clients_delete on public.process_clients
  for delete to authenticated
  using (public.auth_role() in ('admin', 'advogado', 'assistente'));

create policy process_members_select on public.process_members
  for select to authenticated
  using (public.auth_role() is not null);

create policy process_members_insert on public.process_members
  for insert to authenticated
  with check (public.auth_role() in ('admin', 'advogado', 'assistente'));

create policy process_members_delete on public.process_members
  for delete to authenticated
  using (public.auth_role() in ('admin', 'advogado', 'assistente'));

create policy process_movements_select on public.process_movements
  for select to authenticated
  using (public.auth_role() is not null);

create policy process_movements_insert on public.process_movements
  for insert to authenticated
  with check (public.auth_role() in ('admin', 'advogado', 'assistente'));
