create extension if not exists pgcrypto;

create table if not exists public.kexam_events (
  id uuid primary key,
  anonymous_hash text not null,
  session_hash text not null,
  event_name text not null check (event_name in ('page_view','position_select','exam_open','exam_submit','review_open')),
  position_key text,
  set_no smallint check (set_no between 1 and 10),
  score smallint check (score between 0 and 100),
  elapsed_seconds integer check (elapsed_seconds is null or elapsed_seconds >= 0),
  source text,
  device_type text,
  app_version text,
  page_path text,
  metadata jsonb not null default '{}'::jsonb,
  client_time timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists kexam_events_created_at_idx on public.kexam_events(created_at desc);
create index if not exists kexam_events_event_name_idx on public.kexam_events(event_name,created_at desc);
create index if not exists kexam_events_anon_idx on public.kexam_events(anonymous_hash,created_at desc);
create index if not exists kexam_events_position_idx on public.kexam_events(position_key,set_no,created_at desc);

alter table public.kexam_events enable row level security;
revoke all on table public.kexam_events from anon, authenticated;

create or replace function public.kexam_dashboard_snapshot(p_days integer default 30)
returns jsonb
language sql
security definer
set search_path = public
as $$
with bounds as (
  select greatest(1, least(coalesce(p_days,30),180))::int as days,
         now() as now_ts,
         date_trunc('day',now()) as today_start
),
base as (
  select e.* from public.kexam_events e,bounds b
  where e.created_at >= b.now_ts - make_interval(days => b.days)
),
summary as (
  select jsonb_build_object(
    'unique_users_total',(select count(distinct anonymous_hash) from public.kexam_events),
    'unique_users_today',(select count(distinct anonymous_hash) from public.kexam_events,bounds where created_at >= today_start),
    'page_views_today',(select count(*) from public.kexam_events,bounds where event_name='page_view' and created_at >= today_start),
    'exam_starts_today',(select count(*) from public.kexam_events,bounds where event_name='exam_open' and coalesce((metadata->>'show_result')::boolean,false)=false and created_at >= today_start),
    'submissions_today',(select count(*) from public.kexam_events,bounds where event_name='exam_submit' and created_at >= today_start),
    'active_30m',(select count(distinct anonymous_hash) from public.kexam_events where created_at >= now() - interval '30 minutes'),
    'avg_score',(select round(avg(score)::numeric,1) from base where event_name='exam_submit' and score is not null),
    'completion_rate',(
      select case when starts=0 then null else round((submits::numeric/starts::numeric)*100,1) end
      from (
        select count(*) filter (where event_name='exam_open' and coalesce((metadata->>'show_result')::boolean,false)=false) starts,
               count(*) filter (where event_name='exam_submit') submits
        from base
      ) q
    )
  ) as value
),
daily as (
  select coalesce(jsonb_agg(jsonb_build_object('day',to_char(d.day,'YYYY-MM-DD'),'page_views',coalesce(x.page_views,0),'starts',coalesce(x.starts,0),'submissions',coalesce(x.submissions,0)) order by d.day),'[]'::jsonb) value
  from bounds b
  cross join lateral generate_series(date_trunc('day',b.now_ts) - make_interval(days=>b.days-1),date_trunc('day',b.now_ts),interval '1 day') d(day)
  left join (
    select date_trunc('day',created_at) day,
           count(*) filter(where event_name='page_view') page_views,
           count(*) filter(where event_name='exam_open' and coalesce((metadata->>'show_result')::boolean,false)=false) starts,
           count(*) filter(where event_name='exam_submit') submissions
    from base group by 1
  ) x on x.day=d.day
),
sources as (
  select coalesce(jsonb_agg(jsonb_build_object('name',name,'value',value) order by value desc),'[]'::jsonb) value from (
    select coalesce(nullif(source,''),'direct') name,count(*) value from base where event_name='page_view' group by 1 order by 2 desc limit 12
  ) s
),
positions as (
  select coalesce(jsonb_agg(jsonb_build_object('name',name,'value',value) order by value desc),'[]'::jsonb) value from (
    select coalesce(position_key,'ไม่ระบุ') name,count(*) value from base where event_name in ('exam_open','exam_submit') group by 1 order by 2 desc
  ) s
),
sets as (
  select coalesce(jsonb_agg(jsonb_build_object('name',name,'value',value) order by value desc),'[]'::jsonb) value from (
    select coalesce(set_no::text,'ไม่ระบุ') name,count(*) value from base where event_name in ('exam_open','exam_submit') group by 1 order by 2 desc limit 10
  ) s
),
wrong as (
  select coalesce(jsonb_agg(jsonb_build_object('name','ข้อ '||question_no,'value',value) order by value desc),'[]'::jsonb) value
  from (
    select q.value::int question_no,count(*) value
    from base b
    cross join lateral jsonb_array_elements_text(coalesce(b.metadata->'wrong_questions','[]'::jsonb)) q(value)
    where b.event_name='exam_submit'
    group by 1 order by 2 desc limit 15
  ) s
)
select jsonb_build_object(
  'mode','remote',
  'summary',(select value from summary),
  'daily',(select value from daily),
  'sources',(select value from sources),
  'positions',(select value from positions),
  'sets',(select value from sets),
  'top_wrong',(select value from wrong),
  'generated_at',now()
);
$$;

revoke all on function public.kexam_dashboard_snapshot(integer) from public, anon, authenticated;
grant execute on function public.kexam_dashboard_snapshot(integer) to service_role;
