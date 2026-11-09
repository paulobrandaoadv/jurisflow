-- Fundação: perfis, papéis, clientes e trilha de auditoria com RLS.
-- Não executada localmente (sem Supabase CLI/Docker nesta máquina). Validar em um projeto Supabase de teste.

create type public.user_role as enum ('admin', 'advogado', 'assistente', 'consulta');

-- Perfis vinculados a auth.users. Cadastro público deve ser desabilitado no painel do Supabase.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text,
  role public.user_role not null default 'consulta',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Papel do usuário autenticado; retorna null para usuários inativos ou sem perfil.
create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.active
$$;

revoke all on function public.auth_role() from public;
grant execute on function public.auth_role() to authenticated;

-- Novo usuário entra sempre como 'consulta'. Elevação de papel só por administrador.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.email), new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('pf', 'pj')),
  nome text not null check (length(trim(nome)) > 0),
  cpf_cnpj text not null,
  email text,
  telefone text,
  observacoes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_documento_formato check (
    (tipo = 'pf' and cpf_cnpj ~ '^[0-9]{11}$')
    or (tipo = 'pj' and cpf_cnpj ~ '^[0-9]{14}$')
  )
);

create unique index clients_cpf_cnpj_unique on public.clients (cpf_cnpj);

-- Registro de auditoria: somente inserção pelo trigger; nunca alterado nem apagado.
create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb
);

create or replace function public.audit_log_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log é somente de inserção.';
end;
$$;

create trigger audit_log_no_update
  before update or delete on public.audit_log
  for each row execute function public.audit_log_immutable();

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', null)::uuid,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger clients_audit
  after insert or update or delete on public.clients
  for each row execute function public.audit_row();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

revoke update, delete, truncate on public.audit_log from anon, authenticated;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.audit_log enable row level security;

-- profiles: cada um vê o próprio perfil; administradores veem e alteram todos.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.auth_role() = 'admin');

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- clients: qualquer papel ativo lê; admin, advogado e assistente escrevem; ninguém apaga.
create policy clients_select on public.clients
  for select to authenticated
  using (public.auth_role() is not null);

create policy clients_insert on public.clients
  for insert to authenticated
  with check (public.auth_role() in ('admin', 'advogado', 'assistente'));

create policy clients_update on public.clients
  for update to authenticated
  using (public.auth_role() in ('admin', 'advogado', 'assistente'))
  with check (public.auth_role() in ('admin', 'advogado', 'assistente'));

-- audit_log: somente administradores leem.
create policy audit_log_select_admin on public.audit_log
  for select to authenticated
  using (public.auth_role() = 'admin');
