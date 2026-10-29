create extension if not exists btree_gist;
create extension if not exists pgcrypto;

create table public.settings (
 id integer primary key default 1 check(id=1), owner_name text not null default 'Luisa', owner_phone text not null default '',
 slot_minutes integer not null default 40 check(slot_minutes between 10 and 180), booking_window_days integer not null default 14 check(booking_window_days between 1 and 60),
 min_notice_hours numeric not null default 2 check(min_notice_hours>=0), change_notice_hours numeric not null default 2 check(change_notice_hours>=0),
 visible_start time not null default '06:00',visible_end time not null default '22:00',timezone text not null default 'America/Lima' check(timezone='America/Lima'), check(visible_end>visible_start)
);
create table public.owner_access (email text primary key);
create table public.clients (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 100),phone text not null unique check(phone ~ '^519[0-9]{8}$'),notes text not null default '',source text not null check(source in ('public','owner')),archived_at timestamptz,created_at timestamptz not null default now()
);
create table public.fixed_rules (id uuid primary key default gen_random_uuid(),weekday integer not null check(weekday between 0 and 6),start_time time not null,end_time time not null,label text not null,active boolean not null default true,check(end_time>start_time));
create table public.blocks (id uuid primary key default gen_random_uuid(),start_at timestamptz not null,end_at timestamptz not null,reason text not null,created_at timestamptz not null default now(),check(end_at>start_at));
create table public.appointments (
 id uuid primary key default gen_random_uuid(),client_id uuid not null references public.clients(id),start_at timestamptz not null,end_at timestamptz not null,
 status text not null default 'scheduled' check(status in ('scheduled','confirmed','cancelled','completed','no_show')),
 source text not null check(source in ('public','owner')),service_note text not null default '',
 action_token text not null unique default replace(replace(rtrim(encode(gen_random_bytes(32),'base64'),'='),'+','-'),'/','_'),
 reminder_sent_at timestamptz,cancelled_by text,needs_notice boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(end_at>start_at),
 exclude using gist(tstzrange(start_at,end_at,'[)') with &&) where(status in ('scheduled','confirmed'))
);
create index appointments_start_idx on public.appointments(start_at);
create index appointments_client_idx on public.appointments(client_id);
create table public.appointment_events (id uuid primary key default gen_random_uuid(),appointment_id uuid not null references public.appointments(id),event text not null,actor text not null,payload jsonb not null default '{}',created_at timestamptz not null default now());
create table public.message_templates (key text primary key,body text not null,updated_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(),type text not null,appointment_id uuid references public.appointments(id),title text not null,read_at timestamptz,created_at timestamptz not null default now());
create table public.push_subscriptions (id uuid primary key default gen_random_uuid(),endpoint text not null unique,p256dh text not null,auth text not null,created_at timestamptz not null default now());
create table public.rate_limits (key text primary key,count integer not null default 1,expires_at timestamptz not null);

create function public.is_owner() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.owner_access where lower(email)=lower(auth.jwt()->>'email')); $$;
revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;
do $$ declare t text; begin
 foreach t in array array['settings','owner_access','clients','fixed_rules','blocks','appointments','appointment_events','message_templates','notifications','push_subscriptions','rate_limits'] loop
  execute format('alter table public.%I enable row level security',t);
  if t not in ('owner_access','rate_limits') then
   execute format('create policy owner_read on public.%I for select to authenticated using (public.is_owner())',t);
  end if;
  execute format('revoke all on public.%I from anon, authenticated',t);
  if t not in ('owner_access','rate_limits') then execute format('grant select on public.%I to authenticated',t);end if;
 end loop;
end $$;
-- All writes go through server endpoints after authentication and validation.
grant all on all tables in schema public to service_role;

create function public.consume_rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;begin
 delete from public.rate_limits where expires_at<now();
 insert into public.rate_limits(key,count,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set count=public.rate_limits.count+1 returning count into n;
 return n<=p_limit;
end $$;

create function public.slot_allowed(p_start timestamptz,p_end timestamptz,p_exclude uuid default null,p_owner boolean default false,p_override boolean default false) returns boolean language plpgsql security definer set search_path='' as $$
declare s public.settings;local_start timestamp;local_end timestamp;begin
 select * into s from public.settings where id=1;
 local_start:=p_start at time zone 'America/Lima';local_end:=p_end at time zone 'America/Lima';
 if p_start<now()+(case when p_owner then interval '0 hours' else make_interval(secs=>(s.min_notice_hours*3600)::integer) end) then return false;end if;
 if not p_owner and local_start::date >= (now() at time zone 'America/Lima')::date+s.booking_window_days then return false;end if;
 if local_start::date<>local_end::date or local_start::time<s.visible_start or local_end::time>s.visible_end then return false;end if;
 if mod(extract(epoch from(local_start::time-s.visible_start)),s.slot_minutes*60)<>0 then return false;end if;
 if not(p_owner and p_override) and exists(select 1 from public.fixed_rules r where active and weekday=extract(dow from local_start)::integer and local_start::time<r.end_time and local_end::time>r.start_time) then return false;end if;
 if not(p_owner and p_override) and exists(select 1 from public.blocks b where tstzrange(b.start_at,b.end_at,'[)')&&tstzrange(p_start,p_end,'[)')) then return false;end if;
 if exists(select 1 from public.appointments a where (p_exclude is null or a.id<>p_exclude) and a.status in ('scheduled','confirmed') and tstzrange(a.start_at,a.end_at,'[)')&&tstzrange(p_start,p_end,'[)')) then return false;end if;
 return true;
end $$;

create function public.create_booking(p_name text,p_phone text,p_start timestamptz,p_note text default '',p_owner boolean default false,p_override boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.settings;c public.clients;a public.appointments;finish timestamptz;begin
 select * into s from public.settings where id=1 for update;
 finish:=p_start+make_interval(mins=>s.slot_minutes);
 if not public.slot_allowed(p_start,finish,null,p_owner,p_override) then raise exception 'SLOT_UNAVAILABLE' using errcode='23P01';end if;
 insert into public.clients(name,phone,source) values(p_name,p_phone,case when p_owner then 'owner' else 'public' end)
 on conflict(phone) do update set archived_at=null returning * into c;
 insert into public.appointments(client_id,start_at,end_at,service_note,source) values(c.id,p_start,finish,p_note,case when p_owner then 'owner' else 'public' end) returning * into a;
 insert into public.appointment_events(appointment_id,event,actor) values(a.id,'created',case when p_owner then 'owner' else 'client' end);
 insert into public.notifications(type,appointment_id,title) values('created',a.id,'Nueva cita reservada');
 return jsonb_build_object('id',a.id,'start_at',a.start_at,'end_at',a.end_at,'action_token',a.action_token);
end $$;

create function public.change_appointment(p_id uuid default null,p_token text default null,p_action text default '',p_start timestamptz default null,p_note text default null,p_owner boolean default false,p_override boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.appointments;s public.settings;old_start timestamptz;finish timestamptz;changed boolean:=true;begin
 select * into s from public.settings where id=1 for update;
 if p_owner then select * into a from public.appointments where id=p_id for update;
 else select * into a from public.appointments where action_token=p_token for update;end if;
 if a.id is null then raise exception 'NOT_FOUND';end if;
 old_start:=a.start_at;
 if not p_owner then
  if a.end_at<=now() then raise exception 'TOKEN_EXPIRED';end if;
  if p_action='confirm' and a.status='confirmed' then changed:=false;
  elsif p_action='cancel' and a.status='cancelled' then changed:=false;
  elsif a.status not in ('scheduled','confirmed') then raise exception 'INVALID_STATE';end if;
  if changed and p_action in ('cancel','move') and a.start_at<now()+make_interval(secs=>(s.change_notice_hours*3600)::integer) then raise exception 'TOO_LATE';end if;
  if p_action not in ('confirm','cancel','move') then raise exception 'INVALID_ACTION';end if;
 end if;
 if changed then
  case p_action
   when 'confirm' then a.status:='confirmed';
   when 'cancel' then a.status:='cancelled';a.cancelled_by:=case when p_owner then 'owner' else 'client' end;a.needs_notice:=p_owner;
   when 'move' then
    finish:=p_start+(a.end_at-a.start_at);
    if p_start is null or not public.slot_allowed(p_start,finish,a.id,p_owner,p_override) then raise exception 'SLOT_UNAVAILABLE' using errcode='23P01';end if;
    a.start_at:=p_start;a.end_at:=finish;a.status:='scheduled';a.reminder_sent_at:=null;a.needs_notice:=p_owner;
   when 'complete' then a.status:='completed';
   when 'no_show' then a.status:='no_show';
   when 'remind' then a.reminder_sent_at:=now();
   when 'notice' then a.needs_notice:=false;
   when 'note' then null;
   else raise exception 'INVALID_ACTION';
  end case;
  if p_owner and p_note is not null then a.service_note:=p_note;end if;
  update public.appointments set status=a.status,start_at=a.start_at,end_at=a.end_at,reminder_sent_at=a.reminder_sent_at,cancelled_by=a.cancelled_by,needs_notice=a.needs_notice,service_note=a.service_note,updated_at=now() where id=a.id;
  insert into public.appointment_events(appointment_id,event,actor,payload) values(a.id,p_action,case when p_owner then 'owner' else 'client' end,jsonb_build_object('previous_start',old_start,'start_at',a.start_at));
  if not p_owner or a.needs_notice then insert into public.notifications(type,appointment_id,title) values(p_action,a.id,case when a.needs_notice then 'Recuerda avisar al cliente del cambio' when p_action='confirm' then 'Una cita fue confirmada' when p_action='cancel' then 'Una cita fue cancelada' else 'Una cita cambió de horario' end);end if;
 end if;
 return jsonb_build_object('id',a.id,'start_at',a.start_at,'end_at',a.end_at,'status',a.status,'action_token',a.action_token,'previous_start',old_start,'already',not changed);
end $$;

create function public.save_unavailability(p_kind text,p_value jsonb,p_delete boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare item uuid;begin
 perform 1 from public.settings where id=1 for update;
 item:=(p_value->>'id')::uuid;
 if p_kind='block' then
  if p_delete then delete from public.blocks where id=item;return;end if;
  if exists(select 1 from public.appointments a where a.status in ('scheduled','confirmed') and tstzrange(a.start_at,a.end_at,'[)')&&tstzrange((p_value->>'start_at')::timestamptz,(p_value->>'end_at')::timestamptz,'[)')) then raise exception 'BLOCK_CONFLICT' using errcode='23P01';end if;
  insert into public.blocks(id,start_at,end_at,reason) values(coalesce(item,gen_random_uuid()),(p_value->>'start_at')::timestamptz,(p_value->>'end_at')::timestamptz,p_value->>'reason') on conflict(id) do update set start_at=excluded.start_at,end_at=excluded.end_at,reason=excluded.reason;
 elsif p_kind='rule' then
  if p_delete then delete from public.fixed_rules where id=item;return;end if;
  if exists(select 1 from public.appointments a where a.status in ('scheduled','confirmed') and a.end_at>now() and extract(dow from a.start_at at time zone 'America/Lima')::integer=(p_value->>'weekday')::integer and (a.start_at at time zone 'America/Lima')::time<(p_value->>'end_time')::time and (a.end_at at time zone 'America/Lima')::time>(p_value->>'start_time')::time) then raise exception 'BLOCK_CONFLICT' using errcode='23P01';end if;
  insert into public.fixed_rules(id,weekday,start_time,end_time,label,active) values(coalesce(item,gen_random_uuid()),(p_value->>'weekday')::integer,(p_value->>'start_time')::time,(p_value->>'end_time')::time,p_value->>'label',coalesce((p_value->>'active')::boolean,true)) on conflict(id) do update set weekday=excluded.weekday,start_time=excluded.start_time,end_time=excluded.end_time,label=excluded.label,active=excluded.active;
 else raise exception 'INVALID_ACTION';end if;
end $$;

-- SECURITY DEFINER RPCs are exclusively for trusted server code.
revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
revoke all on function public.slot_allowed(timestamptz,timestamptz,uuid,boolean,boolean) from public,anon,authenticated;
revoke all on function public.create_booking(text,text,timestamptz,text,boolean,boolean) from public,anon,authenticated;
revoke all on function public.change_appointment(uuid,text,text,timestamptz,text,boolean,boolean) from public,anon,authenticated;
revoke all on function public.save_unavailability(text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer),public.slot_allowed(timestamptz,timestamptz,uuid,boolean,boolean),public.create_booking(text,text,timestamptz,text,boolean,boolean),public.change_appointment(uuid,text,text,timestamptz,text,boolean,boolean),public.save_unavailability(text,jsonb,boolean) to service_role;

insert into public.settings(id) values(1);
alter publication supabase_realtime add table public.notifications;

create function public.complete_past_appointments() returns integer language plpgsql security definer set search_path='' as $$
declare affected integer;begin
 perform 1 from public.settings where id=1 for update;
 with completed as (
  update public.appointments set status='completed',updated_at=now() where status in ('scheduled','confirmed') and end_at<now() returning id
 ) insert into public.appointment_events(appointment_id,event,actor) select id,'complete','system' from completed;
 get diagnostics affected=row_count;return affected;
end $$;
revoke all on function public.complete_past_appointments() from public,anon,authenticated;
grant execute on function public.complete_past_appointments() to service_role;
