-- Separates the person's own name (shown in the panel) from the business name
-- (owner_name, used in WhatsApp messages and public pages). Run once.
alter table public.settings add column if not exists display_name text not null default '';
update public.settings set display_name = 'Luisa' where id = 1 and display_name = '';
