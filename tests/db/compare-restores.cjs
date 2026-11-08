const assert=require('node:assert/strict');
const {sql}=require('./local.cjs');
for(const table of ['public.character_slots','public.game_masters','game_private.invites','game_private.admin_access','public.dnd_room','public.dnd_rolls','public.dnd_presence']){
 const q=`SELECT md5(coalesce(jsonb_agg(v ORDER BY v::text),'[]'::jsonb)::text) FROM (SELECT to_jsonb(t) v FROM ${table} t) s`;
 assert.equal(sql(q,'dnd_restore'),sql(q,'dnd_verify'),`table mismatch: ${table}`);
}
const queries={
 functions:"select md5(string_agg(pg_get_functiondef(p.oid),E'\\n' order by n.nspname,p.proname)) from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname in ('public','game_private')",
 policies:"select md5(jsonb_agg(to_jsonb(t) order by schemaname,tablename,policyname)::text) from pg_policies t where schemaname in ('public','game_private')",
 table_grants:"select md5(jsonb_agg(to_jsonb(t)-'table_catalog' order by grantee,table_schema,table_name,privilege_type)::text) from information_schema.role_table_grants t where table_schema in ('public','game_private')",
 function_grants:"select md5(jsonb_agg(to_jsonb(t)-'specific_catalog'-'routine_catalog'-'specific_name' order by routine_schema,routine_name,grantee,privilege_type)::text) from information_schema.routine_privileges t where routine_schema in ('public','game_private')"
};
for(const [key,q] of Object.entries(queries))assert.equal(sql(q,'dnd_restore'),sql(q,'dnd_verify'),`metadata mismatch: ${key}`);
console.log('SQL-dump second restore passed: all 7 tables, function definitions, RLS policies and table/function grants match.');
