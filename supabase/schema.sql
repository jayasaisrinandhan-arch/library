-- LibraryHub schema. Run once in a new Supabase project.
create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Student',
  email text,
  role text not null default 'student' check (role in ('student','admin')),
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Student'),
    new.email,
    'student'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  isbn text unique,
  category text default 'General',
  description text default '',
  cover_url text,
  total_copies integer not null default 1 check (total_copies >= 0),
  available_copies integer not null default 1 check (available_copies >= 0),
  created_at timestamptz not null default now(),
  check (available_copies <= total_copies)
);

create table if not exists public.borrowings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  book_id uuid not null references public.books(id),
  borrow_date date not null default current_date,
  due_date date not null,
  return_date date,
  status text not null default 'borrowed'
    check (status in ('borrowed','returned','overdue')),
  created_at timestamptz not null default now()
);
create index if not exists borrowings_user_idx on public.borrowings(user_id);
create index if not exists borrowings_book_idx on public.borrowings(book_id);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  book_id uuid not null references public.books(id),
  status text not null default 'pending'
    check (status in ('pending','fulfilled','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists reservations_user_idx on public.reservations(user_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.borrowings enable row level security;
alter table public.reservations enable row level security;
alter table public.notifications enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.books from anon, authenticated;
revoke all on public.borrowings from anon, authenticated;
revoke all on public.reservations from anon, authenticated;
revoke all on public.notifications from anon, authenticated;

grant select on public.books to anon, authenticated;
grant select on public.profiles to authenticated;
grant update(full_name, avatar_url) on public.profiles to authenticated;
grant select, insert, update, delete on public.books to authenticated;
grant select on public.borrowings, public.reservations, public.notifications to authenticated;
grant update(is_read) on public.notifications to authenticated;

drop policy if exists "Read own or admin profiles" on public.profiles;
create policy "Read own or admin profiles" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "Read book catalog" on public.books;
create policy "Read book catalog" on public.books
for select to anon, authenticated using (true);

drop policy if exists "Admin insert books" on public.books;
create policy "Admin insert books" on public.books
for insert to authenticated with check ((select private.is_admin()));

drop policy if exists "Admin update books" on public.books;
create policy "Admin update books" on public.books
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "Admin delete books" on public.books;
create policy "Admin delete books" on public.books
for delete to authenticated using ((select private.is_admin()));

drop policy if exists "Read own or admin borrowings" on public.borrowings;
create policy "Read own or admin borrowings" on public.borrowings
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "Read own or admin reservations" on public.reservations;
create policy "Read own or admin reservations" on public.reservations
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "Read own notifications" on public.notifications;
create policy "Read own notifications" on public.notifications
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "Update own notifications" on public.notifications;
create policy "Update own notifications" on public.notifications
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- SECURITY DEFINER is required because student clients have no direct write
-- permissions on inventory/borrowings. Each function performs its own auth check.
create or replace function public.borrow_book(p_book_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_available integer;
  v_borrowing_id uuid;
begin
  if v_user_id is null then raise exception 'Please log in first'; end if;
  if not exists (
    select 1 from public.profiles where id = v_user_id and role = 'student'
  ) then raise exception 'Only students can borrow books'; end if;

  select available_copies into v_available
  from public.books where id = p_book_id for update;
  if not found then raise exception 'Book not found'; end if;
  if v_available <= 0 then raise exception 'Book unavailable. Reserve it instead.'; end if;

  if exists (
    select 1 from public.borrowings
    where user_id = v_user_id and book_id = p_book_id and status in ('borrowed','overdue')
  ) then raise exception 'You already have this book'; end if;

  update public.books set available_copies = available_copies - 1 where id = p_book_id;
  insert into public.borrowings(user_id, book_id, due_date)
  values(v_user_id, p_book_id, current_date + 14)
  returning id into v_borrowing_id;

  insert into public.notifications(user_id, message)
  values(v_user_id, 'Book borrowed successfully. Please return it within 14 days.');
  return v_borrowing_id;
end;
$$;

create or replace function public.reserve_book(p_book_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_available integer;
  v_reservation_id uuid;
begin
  if v_user_id is null then raise exception 'Please log in first'; end if;
  if not exists (
    select 1 from public.profiles where id = v_user_id and role = 'student'
  ) then raise exception 'Only students can reserve books'; end if;

  select available_copies into v_available
  from public.books where id = p_book_id for update;
  if not found then raise exception 'Book not found'; end if;
  if v_available > 0 then raise exception 'Book is available. Borrow it instead.'; end if;
  if exists (
    select 1 from public.reservations
    where user_id = v_user_id and book_id = p_book_id and status = 'pending'
  ) then raise exception 'You already reserved this book'; end if;

  insert into public.reservations(user_id, book_id)
  values(v_user_id, p_book_id) returning id into v_reservation_id;
  return v_reservation_id;
end;
$$;

create or replace function public.admin_return_book(p_borrowing_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_book_id uuid;
  v_user_id uuid;
begin
  if not coalesce((select private.is_admin()), false) then
    raise exception 'Admin permission required';
  end if;

  select book_id, user_id into v_book_id, v_user_id
  from public.borrowings
  where id = p_borrowing_id and status in ('borrowed','overdue')
  for update;
  if not found then raise exception 'Active borrowing not found'; end if;

  update public.borrowings
  set status = 'returned', return_date = current_date
  where id = p_borrowing_id;

  update public.books
  set available_copies = available_copies + 1
  where id = v_book_id;

  insert into public.notifications(user_id, message)
  values(v_user_id, 'Your borrowed book has been marked as returned.');
end;
$$;

revoke all on function public.borrow_book(uuid) from public, anon;
revoke all on function public.reserve_book(uuid) from public, anon;
revoke all on function public.admin_return_book(uuid) from public, anon;
grant execute on function public.borrow_book(uuid) to authenticated;
grant execute on function public.reserve_book(uuid) to authenticated;
grant execute on function public.admin_return_book(uuid) to authenticated;

-- Realtime publication
do $$
declare t text;
begin
  foreach t in array array['books','borrowings','reservations','notifications']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Optional sample catalog; safe to run once on an empty catalog.
insert into public.books(title, author, isbn, category, description, total_copies, available_copies)
values
('Clean Code', 'Robert C. Martin', '9780132350884', 'Programming', 'A practical guide to writing clean and maintainable code.', 5, 5),
('The Pragmatic Programmer', 'David Thomas', '9780135957059', 'Programming', 'A guide to software craftsmanship.', 4, 4),
('Java: The Complete Reference', 'Herbert Schildt', '9781260463415', 'Programming', 'A comprehensive Java programming reference.', 5, 5),
('Introduction to Algorithms', 'Thomas H. Cormen', '9780262046305', 'Computer Science', 'A comprehensive introduction to algorithms.', 3, 3),
('Python Crash Course', 'Eric Matthes', '9781718502703', 'Programming', 'A hands-on introduction to Python.', 4, 4),
('Database System Concepts', 'Abraham Silberschatz', '9780078022159', 'Database', 'An introduction to database system concepts.', 3, 3)
on conflict (isbn) do nothing;
