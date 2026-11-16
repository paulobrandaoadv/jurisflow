-- Etapa 5: registro dos alertas de prazo já enviados por e-mail.
-- Executar após 0004_prazos_agenda.sql.
-- Sem políticas de RLS: somente o job de alertas (service role) acessa esta tabela.

create table public.deadline_alerts (
  id uuid primary key default gen_random_uuid(),
  deadline_id uuid not null references public.deadlines (id) on delete cascade,
  momento text not null check (momento in ('7_dias', '3_dias', '2_dias', '1_dia', 'dia', 'vencido')),
  vencimento date not null,
  enviado_em timestamptz not null default now(),
  unique (deadline_id, momento, vencimento)
);

alter table public.deadline_alerts enable row level security;
