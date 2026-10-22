/**
 * Skema Postgres untuk ledger. Sumber tunggal: berkas ini dipakai untuk
 * menyiapkan tabel di Neon maupun di Postgres lokal saat pengujian, jadi
 * tidak ada dua versi skema yang bisa menyimpang.
 *
 * `user_id` adalah id pengguna dari Better Auth. Kunci utamanya gabungan
 * (user_id, id) supaya id catatan yang dibuat di perangkat tidak bisa
 * bertabrakan antar pengguna.
 */
export const SCHEMA_SQL = `
create table if not exists transactions (
  user_id text not null,
  id text not null,
  date date not null,
  time text not null,
  merchant text not null,
  note text,
  category text,
  amount integer not null check (amount >= 0),
  direction text not null check (direction in ('expense', 'income')),
  source text not null check (source in ('manual', 'email', 'scan', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists transactions_user_date_idx
  on transactions (user_id, date desc, time desc);

-- Versi lama menyimpan satu anggaran per pengguna. Tablenya diganti nama
-- lebih dulu, isinya disalin ke bulan berjalan, lalu dihapus.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = current_schema()
       and table_name = 'budgets'
       and column_name = 'user_id'
  ) and not exists (
    select 1 from information_schema.columns
     where table_schema = current_schema()
       and table_name = 'budgets'
       and column_name = 'month'
  ) then
    alter table budgets rename to budgets_legacy;
  end if;
end $$;

create table if not exists budgets (
  user_id text not null,
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  total integer not null default 0 check (total >= 0),
  limits jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

-- Alamat penerusan email per pengguna. Token dipakai di alamat
-- sisa+<token>@domain, jadi tidak perlu menebak pemilik dari pengirim.
create table if not exists email_inbox (
  user_id text primary key,
  token text not null unique,
  created_at timestamptz not null default now()
);

-- Email bank yang sudah dibaca tetapi belum dikonfirmasi pengguna. Transaksi
-- baru ditulis ke tabel transactions setelah tombol simpan ditekan.
create table if not exists email_drafts (
  user_id text not null,
  id text not null,
  message_id text,
  sender text,
  subject text,
  date date not null,
  time text not null,
  merchant text not null,
  amount integer not null check (amount >= 0),
  direction text not null check (direction in ('expense', 'income')),
  category text,
  note text,
  raw_text text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'dismissed')),
  received_at timestamptz not null default now(),
  primary key (user_id, id)
);

create unique index if not exists email_drafts_message_idx
  on email_drafts (user_id, message_id)
  where message_id is not null;

create index if not exists email_drafts_pending_idx
  on email_drafts (user_id, status, received_at desc);

do $$
begin
  if to_regclass('budgets_legacy') is not null then
    insert into budgets (user_id, month, total, limits, updated_at)
      select user_id, to_char(now(), 'YYYY-MM'), total, limits, updated_at
        from budgets_legacy
      on conflict (user_id, month) do nothing;
    drop table budgets_legacy;
  end if;
end $$;
`;

/** Urutan kolom yang dipakai pernyataan insert; dijaga tetap sinkron. */
export const TRANSACTION_COLUMNS = [
  "user_id",
  "id",
  "date",
  "time",
  "merchant",
  "note",
  "category",
  "amount",
  "direction",
  "source",
] as const;
