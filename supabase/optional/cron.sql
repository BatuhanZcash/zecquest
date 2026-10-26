-- ZecQuest — pg_cron zamanlayıcısı (ÖNERİLİR)
--
-- Planlı yarışmalar normalde katılımcıların tarayıcıları tarafından ilerletilir.
-- Bu iş, kimse bağlı olmasa bile yarışmaların zamanında ilerlemesini ve
-- terk edilmiş odaların kapanmasını garanti eder.
--
-- Supabase: Database → Extensions → "pg_cron" aç, sonra bu dosyayı SQL Editor'de çalıştır.

create extension if not exists pg_cron;

select cron.unschedule('zecquest-tick') where exists (select 1 from cron.job where jobname = 'zecquest-tick');
select cron.schedule('zecquest-tick', '5 seconds', $$select public.tick_due_games()$$);

-- Kontrol:  select * from cron.job;   select * from cron.job_run_details order by start_time desc limit 5;
