create table public.transactions (
  id uuid not null default extensions.uuid_generate_v4 (),
  created_at timestamp with time zone not null default now(),
  name text not null default ''::text,
  value real not null,
  category_id uuid not null default '3c3d9f8c-af23-49ed-946c-0d72a2191008'::uuid,
  constraint budget_pkey primary key (id),
  constraint transactions_created_at_key unique (created_at),
  constraint transactions_category_id_fkey foreign KEY (category_id) references categories (id)
) TABLESPACE pg_default;