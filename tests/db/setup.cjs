// Run only after creating dnd_test in the dedicated local container.
const fs=require('node:fs');
const {sql}=require('./local.cjs');
sql(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE PUBLICATION supabase_realtime;`,'dnd_test');
for(const file of ['schema.sql','code_access.sql','multiplayer_v2.sql'])sql(fs.readFileSync(`supabase/${file}`,'utf8'),'dnd_test');
console.log('Isolated test schema initialized. No remote database connections used.');

for(const file of fs.readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort())sql(fs.readFileSync(`supabase/migrations/${file}`,'utf8'),'dnd_test');
