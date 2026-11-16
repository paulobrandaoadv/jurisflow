-- Etapa 5: prazos processuais e agenda (audiências, reuniões, atendimentos, tarefas).
-- Executar após 0003_documentos.sql.

create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id),
  process_id uuid references public.processes (id) on delete set null,
  descricao text not null check (length(trim(descricao)) > 0),
  providencia text,
  data_identificacao date,
  disponibilizacao date,
  publicacao date,
  ciencia date,
  marco_inicial date,
  dias integer check (dias is null or dias >= 0),
  tipo_contagem text not null default 'uteis' check (tipo_contagem in ('uteis', 'corridos', 'manual')),
  regra_aplicada text,
  vencimento_calculado date,
  vencimento_confirmado date,
  justificativa_correcao text,
  situacao text not null default 'pendente' check (situacao in ('pendente', 'confirmado', 'cumprido', 'cancelado')),
  fonte text,
  responsavel_id uuid references public.profiles (id),
  observacoes text,
  confirmado_por uuid references public.profiles (id),
  confirmado_em timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deadlines_situacao_vencimento_idx on public.deadlines (situacao, vencimento_confirmado, vencimento_calculado);
create index deadlines_process_idx on public.deadlines (process_id);

create table public.agenda_events (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(trim(titulo)) > 0),
  tipo text not null check (tipo in ('audiencia', 'pericia', 'reuniao', 'atendimento', 'compromisso', 'diligencia', 'tarefa')),
  data date not null,
  horario time,
  local text,
  client_id uuid references public.clients (id),
  process_id uuid references public.processes (id) on delete set null,
  descricao text,
  responsavel_id uuid references public.profiles (id),
  situacao text not null default 'agendado' check (situacao in ('agendado', 'realizado', 'cancelado')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agenda_events_data_idx on public.agenda_events (data);

create trigger deadlines_set_updated_at
  before update on public.deadlines
  for each row execute function public.set_updated_at();

create trigger agenda_events_set_updated_at
  before update on public.agenda_events
  for each row execute function public.set_updated_at();

create trigger deadlines_audit
  after insert or update or delete on public.deadlines
  for each row execute function public.audit_row();

create trigger agenda_events_audit
  after insert or update or delete on public.agenda_events
  for each row execute function public.audit_row();

alter table public.deadlines enable row level security;
alter table public.agenda_events enable row level security;

-- Qualquer papel ativo lê; admin, advogado e assistente escrevem. Ninguém apaga prazos.
create policy deadlines_select on public.deadlines
  for select to authenticated
  using (public.auth_role() is not null);

create policy deadlines_insert on public.deadlines
  for insert to authenticated
  with check (public.auth_role() in ('admin', 'advogado', 'assistente'));

create policy deadlines_update on public.deadlines
  for update to authenticated
  using (public.auth_role() in ('admin', 'advogado', 'assistente'))
  with check (public.auth_role() in ('admin', 'advogado', 'assistente'));

create policy agenda_events_select on public.agenda_events
  for select to authenticated
  using (public.auth_role() is not null);

create policy agenda_events_insert on public.agenda_events
  for insert to authenticated
  with check (public.auth_role() in ('admin', 'advogado', 'assistente'));

create policy agenda_events_update on public.agenda_events
  for update to authenticated
  using (public.auth_role() in ('admin', 'advogado', 'assistente'))
  with check (public.auth_role() in ('admin', 'advogado', 'assistente'));

create policy agenda_events_delete on public.agenda_events
  for delete to authenticated
  using (public.auth_role() in ('admin', 'advogado', 'assistente'));
