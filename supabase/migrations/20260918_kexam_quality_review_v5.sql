-- K-EXAM centralized quality review queue v5
-- Combines psychometric signals and user reports into an automatic review priority queue.
-- Safe to apply after 20260918_kexam_item_psychometrics_v4.sql.

-- K-EXAM centralized item psychometrics v4
-- Uses the first response per anonymous user for p/D/DE to reduce repeat-practice bias.
-- Keeps total attempts separately for engagement volume.
-- Safe to apply after 20260918_kexam_item_discrimination_v3.sql.

-- K-EXAM centralized item analytics v3
-- Adds corrected-rest-score discrimination and distractor efficiency.
-- Safe to apply after 20260918_kexam_item_analytics_v2.sql.

alter table public.kexam_events
  drop constraint if exists kexam_events_event_name_check;

alter table public.kexam_events
  add constraint kexam_events_event_name_check
  check (event_name in ('page_view','position_select','exam_open','exam_submit','review_open','question_report'));

create index if not exists kexam_events_question_report_idx
  on public.kexam_events(event_name,created_at desc)
  where event_name='question_report';

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
submit_base as (
  select b.*,
         case
           when (b.metadata->>'total') ~ '^[0-9]+$' and (b.metadata->>'total')::int > 0
             then (b.metadata->>'total')::int
           else null
         end as total_questions,
         case
           when (b.metadata->>'total') ~ '^[0-9]+$' and (b.metadata->>'total')::int > 0
             then round((coalesce(b.score,0)::numeric * 100.0 / (b.metadata->>'total')::int),2)
           else b.score::numeric
         end as score_percent
  from base b
  where b.event_name='exam_submit'
),
summary as (
  select jsonb_build_object(
    'unique_users_total',(select count(distinct anonymous_hash) from public.kexam_events),
    'unique_users_today',(select count(distinct anonymous_hash) from public.kexam_events,bounds where created_at >= today_start),
    'page_views_today',(select count(*) from public.kexam_events,bounds where event_name='page_view' and created_at >= today_start),
    'exam_starts_today',(select count(*) from public.kexam_events,bounds where event_name='exam_open' and coalesce(metadata->>'show_result','false') not in ('true','1') and created_at >= today_start),
    'submissions_today',(select count(*) from public.kexam_events,bounds where event_name='exam_submit' and created_at >= today_start),
    'active_30m',(select count(distinct anonymous_hash) from public.kexam_events where created_at >= now() - interval '30 minutes'),
    'avg_score',(select round(avg(score_percent),1) from submit_base where score_percent is not null),
    'completion_rate',(
      select case when starts=0 then null else round((submits::numeric/starts::numeric)*100,1) end
      from (
        select count(*) filter (where event_name='exam_open' and coalesce(metadata->>'show_result','false') not in ('true','1')) starts,
               count(*) filter (where event_name='exam_submit') submits
        from base
      ) q
    )
  ) as value
),
daily as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'day',to_char(d.day,'YYYY-MM-DD'),
    'page_views',coalesce(x.page_views,0),
    'starts',coalesce(x.starts,0),
    'submissions',coalesce(x.submissions,0)
  ) order by d.day),'[]'::jsonb) value
  from bounds b
  cross join lateral generate_series(
    date_trunc('day',b.now_ts) - make_interval(days=>b.days-1),
    date_trunc('day',b.now_ts),
    interval '1 day'
  ) d(day)
  left join (
    select date_trunc('day',created_at) as bucket_day,
           count(*) filter(where event_name='page_view') page_views,
           count(*) filter(where event_name='exam_open' and coalesce(metadata->>'show_result','false') not in ('true','1')) starts,
           count(*) filter(where event_name='exam_submit') submissions
    from base group by 1
  ) x on x.bucket_day=d.day
),
sources as (
  select coalesce(jsonb_agg(jsonb_build_object('name',name,'value',value) order by value desc),'[]'::jsonb) value
  from (
    select coalesce(nullif(source,''),'direct') name,count(*) value
    from base where event_name='page_view'
    group by 1 order by 2 desc limit 12
  ) s
),
positions as (
  select coalesce(jsonb_agg(jsonb_build_object('name',name,'value',value) order by value desc),'[]'::jsonb) value
  from (
    select coalesce(position_key,'ไม่ระบุ') name,count(*) value
    from base where event_name in ('exam_open','exam_submit')
    group by 1 order by 2 desc
  ) s
),
sets as (
  select coalesce(jsonb_agg(jsonb_build_object('name',name,'value',value) order by value desc),'[]'::jsonb) value
  from (
    select coalesce(set_no::text,'ไม่ระบุ') name,count(*) value
    from base where event_name in ('exam_open','exam_submit')
    group by 1 order by 2 desc limit 12
  ) s
),
modes as (
  select coalesce(jsonb_agg(jsonb_build_object('name',name,'value',value) order by value desc),'[]'::jsonb) value
  from (
    select coalesce(nullif(metadata->>'exam_mode',''),'fixed') name,count(*) value
    from base where event_name in ('exam_open','exam_submit')
    group by 1 order by 2 desc
  ) s
),
wrong as (
  select coalesce(jsonb_agg(jsonb_build_object('name',question_id,'value',value) order by value desc),'[]'::jsonb) value
  from (
    select q.value question_id,count(*) value
    from base b
    cross join lateral jsonb_array_elements_text(case when jsonb_typeof(b.metadata->'wrong_questions')='array' then b.metadata->'wrong_questions' else '[]'::jsonb end) q(value)
    where b.event_name='exam_submit'
      and length(q.value) between 1 and 64
    group by 1 order by 2 desc limit 20
  ) s
),
item_answers as (
  select b.id event_id,
         b.created_at,
         b.position_key,
         b.anonymous_hash,
         split_part(i.value,'|',1) question_id,
         split_part(i.value,'|',2)::smallint selected_choice,
         split_part(i.value,'|',3)::smallint correct_choice,
         b.total_questions,
         case
           when b.total_questions is not null
             and b.total_questions > 1
             and b.score is not null
           then round(
             (
               (b.score - case when split_part(i.value,'|',2)=split_part(i.value,'|',3) then 1 else 0 end)::numeric
               * 100.0
               / (b.total_questions - 1)
             ),
             2
           )
           else null
         end as rest_score_percent
  from submit_base b
  cross join lateral jsonb_array_elements_text(
    case when jsonb_typeof(b.metadata->'item_responses')='array'
      then b.metadata->'item_responses' else '[]'::jsonb end
  ) i(value)
  where i.value ~ '^(RA|TA)-S[0-9]{2}-Q[0-9]{3}\|[0-3]\|[0-3]$'
),
item_first as (
  select distinct on (position_key,question_id,anonymous_hash)
         event_id,created_at,position_key,anonymous_hash,question_id,
         selected_choice,correct_choice,total_questions,rest_score_percent
  from item_answers
  order by position_key,question_id,anonymous_hash,created_at asc,event_id asc
),
item_attempts as (
  select position_key,question_id,count(*)::int attempts
  from item_answers
  group by position_key,question_id
),
item_agg as (
  select f.position_key,f.question_id,
         a.attempts,
         count(*)::int users,
         count(*) filter(where f.selected_choice=f.correct_choice)::int correct,
         count(*) filter(where f.selected_choice<>f.correct_choice)::int incorrect,
         max(f.correct_choice)::int answer,
         count(*) filter(where f.selected_choice=0)::int c0,
         count(*) filter(where f.selected_choice=1)::int c1,
         count(*) filter(where f.selected_choice=2)::int c2,
         count(*) filter(where f.selected_choice=3)::int c3,
         round(avg(f.rest_score_percent) filter(where f.selected_choice=f.correct_choice),1) avg_rest_correct,
         round(avg(f.rest_score_percent) filter(where f.selected_choice<>f.correct_choice),1) avg_rest_incorrect,
         round(
           (
             avg(f.rest_score_percent) filter(where f.selected_choice=f.correct_choice)
             -
             avg(f.rest_score_percent) filter(where f.selected_choice<>f.correct_choice)
           )::numeric,
           1
         ) discrimination
  from item_first f
  join item_attempts a
    on a.position_key is not distinct from f.position_key
   and a.question_id=f.question_id
  group by f.position_key,f.question_id,a.attempts
),
item_stats as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'question_id',question_id,
    'position',position_key,
    'attempts',attempts,
    'users',users,
    'correct',correct,
    'incorrect',incorrect,
    'accuracy',case when users=0 then null else round(correct::numeric*100.0/users,1) end,
    'difficulty_index',case when users=0 then null else round(correct::numeric/users,3) end,
    'answer',answer,
    'choices',jsonb_build_array(c0,c1,c2,c3),
    'unused_distractors',
      (case when answer<>0 and c0=0 then 1 else 0 end)+
      (case when answer<>1 and c1=0 then 1 else 0 end)+
      (case when answer<>2 and c2=0 then 1 else 0 end)+
      (case when answer<>3 and c3=0 then 1 else 0 end),
    'distractor_efficiency',round(
      (
        3-
        (
          (case when answer<>0 and c0=0 then 1 else 0 end)+
          (case when answer<>1 and c1=0 then 1 else 0 end)+
          (case when answer<>2 and c2=0 then 1 else 0 end)+
          (case when answer<>3 and c3=0 then 1 else 0 end)
        )
      )::numeric*100.0/3.0,
      1
    ),
    'avg_rest_correct',avg_rest_correct,
    'avg_rest_incorrect',avg_rest_incorrect,
    'discrimination',discrimination,
    'psychometric_basis','first-response-per-user',
    'quality_status',
      case
        when users < 5 then 'ข้อมูลยังน้อย'
        when correct::numeric/nullif(users,0) < 0.20 then 'ยากผิดปกติ'
        when correct::numeric/nullif(users,0) > 0.95 then 'ง่ายผิดปกติ'
        when discrimination is not null and discrimination < 0 then 'ควรตรวจเร่งด่วน'
        when discrimination is not null and discrimination < 10 then 'ควรตรวจ'
        when (
          (case when answer<>0 and c0=0 then 1 else 0 end)+
          (case when answer<>1 and c1=0 then 1 else 0 end)+
          (case when answer<>2 and c2=0 then 1 else 0 end)+
          (case when answer<>3 and c3=0 then 1 else 0 end)
        ) >= 2 then 'ตัวลวงควรปรับ'
        else 'ปกติ'
      end
  ) order by
      case
        when users < 5 then 5
        when discrimination is not null and discrimination < 0 then 1
        when correct::numeric/nullif(users,0) < 0.20 then 2
        when correct::numeric/nullif(users,0) > 0.95 then 2
        when discrimination is not null and discrimination < 10 then 3
        else 4
      end,
      attempts desc,
      question_id asc
  ),'[]'::jsonb) value
  from (
    select * from item_agg
    order by
      case
        when users < 5 then 5
        when discrimination is not null and discrimination < 0 then 1
        when correct::numeric/nullif(users,0) < 0.20 then 2
        when correct::numeric/nullif(users,0) > 0.95 then 2
        when discrimination is not null and discrimination < 10 then 3
        else 4
      end,
      attempts desc,
      question_id asc
    limit 100
  ) x
),
report_counts as (
  select position_key,
         coalesce(nullif(metadata->>'question_id',''),'ไม่ระบุ') question_id,
         count(*)::int reports,
         max(created_at) last_reported_at
  from base
  where event_name='question_report'
  group by 1,2
),
quality_raw as (
  select i.position_key,
         i.question_id,
         i.attempts,
         i.users,
         case when i.users=0 then null else round(i.correct::numeric*100.0/i.users,1) end accuracy,
         i.discrimination,
         (
           (case when i.answer<>0 and i.c0=0 then 1 else 0 end)+
           (case when i.answer<>1 and i.c1=0 then 1 else 0 end)+
           (case when i.answer<>2 and i.c2=0 then 1 else 0 end)+
           (case when i.answer<>3 and i.c3=0 then 1 else 0 end)
         )::int unused_distractors,
         coalesce(r.reports,0)::int reports,
         r.last_reported_at
  from item_agg i
  left join report_counts r
    on r.question_id=i.question_id
   and r.position_key is not distinct from i.position_key
),
quality_scored as (
  select q.*,
         (
           case when q.discrimination is not null and q.discrimination < 0 then 60
                when q.discrimination is not null and q.discrimination < 10 then 35 else 0 end
           + case when q.accuracy is not null and (q.accuracy < 20 or q.accuracy > 95) then 25 else 0 end
           + case when q.unused_distractors >= 2 then 20 when q.unused_distractors=1 then 10 else 0 end
           + least(q.reports*15,45)
           + case when q.users>=20 then 10 else 0 end
         )::int risk_score
  from quality_raw q
),
quality_queue as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'question_id',question_id,
    'position',position_key,
    'attempts',attempts,
    'users',users,
    'accuracy',accuracy,
    'discrimination',discrimination,
    'unused_distractors',unused_distractors,
    'reports',reports,
    'risk_score',risk_score,
    'priority',case
      when risk_score>=60 then 'เร่งด่วน'
      when risk_score>=35 then 'ควรตรวจ'
      else 'เฝ้าดู'
    end,
    'psychometric_basis','first-response-per-user',
    'last_reported_at',last_reported_at
  ) order by risk_score desc,reports desc,users desc,question_id asc),'[]'::jsonb) value
  from (
    select *
    from quality_scored
    where risk_score>0
      and (users>=5 or reports>0)
    order by risk_score desc,reports desc,users desc,question_id asc
    limit 60
  ) q
),
quality_summary as (
  select jsonb_build_object(
    'urgent',count(*) filter(where risk_score>=60 and (users>=5 or reports>0)),
    'review',count(*) filter(where risk_score>=35 and risk_score<60 and (users>=5 or reports>0)),
    'watch',count(*) filter(where risk_score>0 and risk_score<35 and (users>=5 or reports>0)),
    'total_flagged',count(*) filter(where risk_score>0 and (users>=5 or reports>0))
  ) value
  from quality_scored
),
topic_rows as (
  select b.position_key,
         t.key topic,
         case when (t.value->>'correct') ~ '^[0-9]+$' then (t.value->>'correct')::int else 0 end correct,
         case when (t.value->>'total') ~ '^[0-9]+$' then (t.value->>'total')::int else 0 end total
  from base b
  cross join lateral jsonb_each(
    case when jsonb_typeof(b.metadata->'topic_result')='object'
      then b.metadata->'topic_result' else '{}'::jsonb end
  ) t
  where b.event_name='exam_submit'
),
topic_agg as (
  select position_key,topic,sum(correct)::int correct,sum(total)::int total
  from topic_rows
  where total>0
  group by position_key,topic
),
topic_stats as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'position',position_key,
    'name',topic,
    'correct',correct,
    'total',total,
    'accuracy',round(correct::numeric*100.0/nullif(total,0),1)
  ) order by correct::numeric/nullif(total,0) asc,total desc,topic asc),'[]'::jsonb) value
  from topic_agg
),
question_reports as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'question_id',question_id,
    'position',position_key,
    'type',report_type,
    'category',category,
    'topic',topic,
    'prompt',prompt,
    'reports',reports,
    'last_reported_at',last_reported_at
  ) order by reports desc,last_reported_at desc),'[]'::jsonb) value
  from (
    select coalesce(nullif(metadata->>'question_id',''),'ไม่ระบุ') question_id,
           position_key,
           coalesce(nullif(metadata->>'report_type',''),'อื่น ๆ') report_type,
           coalesce(metadata->>'category','') category,
           coalesce(metadata->>'topic','') topic,
           left(coalesce(metadata->>'prompt',''),240) prompt,
           count(*)::int reports,
           max(created_at) last_reported_at
    from base
    where event_name='question_report'
    group by 1,2,3,4,5,6
    order by reports desc,last_reported_at desc
    limit 80
  ) q
)
select jsonb_build_object(
  'mode','remote',
  'summary',(select value from summary),
  'daily',(select value from daily),
  'sources',(select value from sources),
  'positions',(select value from positions),
  'sets',(select value from sets),
  'modes',(select value from modes),
  'top_wrong',(select value from wrong),
  'item_stats',(select value from item_stats),
  'quality_queue',(select value from quality_queue),
  'quality_summary',(select value from quality_summary),
  'topic_stats',(select value from topic_stats),
  'question_reports',(select value from question_reports),
  'generated_at',now()
);
$$;

revoke all on function public.kexam_dashboard_snapshot(integer) from public, anon, authenticated;
grant execute on function public.kexam_dashboard_snapshot(integer) to service_role;
