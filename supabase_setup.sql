-- =============================================================
-- MARIA LUIZA — Script de configuração das tabelas Supabase
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================

-- ===================== MAMADAS =====================
create table if not exists mamadas (
  id uuid primary key default gen_random_uuid(),
  horario timestamptz not null,
  ml integer default 0,
  created_at timestamptz default now()
);

-- ===================== REMÉDIOS =====================
create table if not exists remedios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  horario_inicio timestamptz not null,
  proximo_horario timestamptz not null,
  intervalo_horas integer not null default 8,
  ultima_dose timestamptz,
  created_at timestamptz default now()
);

-- ===================== CONSULTAS =====================
create table if not exists consultas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  horario timestamptz not null,
  local text,
  modalidade text default 'Pediatra',
  created_at timestamptz default now()
);

-- ===================== EXAMES =====================
create table if not exists exames (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  horario timestamptz not null,
  local text,
  observacao text,
  created_at timestamptz default now()
);

-- ===================== VACINAS =====================
create table if not exists vacinas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_prevista date not null,
  tipo text default 'SUS',
  aplicada boolean default false,
  data_aplicacao date,
  created_at timestamptz default now()
);

-- ===================== CRESCIMENTO =====================
create table if not exists crescimento (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  peso numeric(5,2),
  altura numeric(5,1),
  created_at timestamptz default now()
);

-- ===================== COMPRAS =====================
create table if not exists compras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  quantidade text,
  comprado boolean default false,
  created_at timestamptz default now()
);

-- ===================== LEMBRETES =====================
create table if not exists lembretes (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  created_at timestamptz default now()
);

-- ===================== NOTIFICAÇÕES =====================
create table if not exists notificacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  referencia_id uuid,
  mensagem text,
  enviada boolean default false,
  agendada_para timestamptz,
  created_at timestamptz default now()
);

-- ===================== RLS: liberar acesso =====================
-- (ajuste conforme sua política de segurança)
alter table mamadas    enable row level security;
alter table remedios   enable row level security;
alter table consultas  enable row level security;
alter table exames     enable row level security;
alter table vacinas    enable row level security;
alter table crescimento enable row level security;
alter table compras    enable row level security;
alter table lembretes  enable row level security;
alter table notificacoes enable row level security;

-- Política aberta (para uso pessoal/familiar sem auth)
create policy "allow_all_mamadas"    on mamadas    for all using (true) with check (true);
create policy "allow_all_remedios"   on remedios   for all using (true) with check (true);
create policy "allow_all_consultas"  on consultas  for all using (true) with check (true);
create policy "allow_all_exames"     on exames     for all using (true) with check (true);
create policy "allow_all_vacinas"    on vacinas    for all using (true) with check (true);
create policy "allow_all_crescimento" on crescimento for all using (true) with check (true);
create policy "allow_all_compras"    on compras    for all using (true) with check (true);
create policy "allow_all_lembretes"  on lembretes  for all using (true) with check (true);
create policy "allow_all_notificacoes" on notificacoes for all using (true) with check (true);
