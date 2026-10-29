-- Enable pg_cron in the Supabase dashboard before executing this optional setup.
-- Run once. Re-running updates the named job rather than creating duplicates.
select cron.schedule('luisa-complete-past','*/30 * * * *','select public.complete_past_appointments();');
