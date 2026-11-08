// Private app-data backup -> isolated local PostgreSQL -> exact row comparison.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {sql,literal}=require('./local.cjs');
const backup=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
assert.equal(backup.character_slots.length,4);
assert(backup.character_slots.every(x=>x.owner_id===null),'Auth backup required for nonempty ownership');
sql(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE PUBLICATION supabase_realtime;`);
for(const file of ['schema.sql','code_access.sql','multiplayer_v2.sql'])sql(fs.readFileSync(`supabase/${file}`,'utf8'));
const tables={game_masters:'public.game_masters',character_slots:'public.character_slots',invites:'game_private.invites',admin_access:'game_private.admin_access',room:'public.dnd_room',rolls:'public.dnd_rolls',presence:'public.dnd_presence'};
let restore='BEGIN; SET LOCAL session_replication_role=replica;';
for(const table of Object.values(tables))restore+=`DELETE FROM ${table};`;
for(const [key,table] of Object.entries(tables)){
 const rows=backup[key]||[];
 if(rows.length)restore+=`INSERT INTO ${table} OVERRIDING SYSTEM VALUE SELECT * FROM jsonb_populate_recordset(NULL::${table},${literal(JSON.stringify(rows))}::jsonb);`;
}
restore+='COMMIT;';sql(restore);
const sort=rows=>(rows||[]).map(x=>JSON.stringify(Object.fromEntries(Object.entries(x).sort()))).sort();
for(const [key,table] of Object.entries(tables)){
 const actual=JSON.parse(sql(`SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM ${table} t;`));
 assert(JSON.stringify(sort(actual))===JSON.stringify(sort(backup[key])),`restore mismatch: ${key}`);
}
console.log('Restore passed: all 7 app tables match private backup, including code hashes and timestamps.');
