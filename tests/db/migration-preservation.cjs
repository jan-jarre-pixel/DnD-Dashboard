// Operator check against a private backup in a dedicated cloned local DB.
const fs=require('node:fs'),assert=require('node:assert/strict'),{sql,literal}=require('./local.cjs');
const db='dnd_phase1_restore';
const tables={character_slots:'public.character_slots',game_masters:'public.game_masters',invites:'game_private.invites',admin_access:'game_private.admin_access',room:'public.dnd_room',rolls:'public.dnd_rolls',presence:'public.dnd_presence'};
const data=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
assert(data.character_slots.every(x=>x.owner_id===null),'Auth export required for owned slots');
let restore='BEGIN; SET LOCAL session_replication_role=replica;';
for(const table of Object.values(tables))restore+=`DELETE FROM ${table};`;
for(const [key,table] of Object.entries(tables))if(data[key]?.length)restore+=`INSERT INTO ${table} OVERRIDING SYSTEM VALUE SELECT * FROM jsonb_populate_recordset(NULL::${table},${literal(JSON.stringify(data[key]))}::jsonb);`;
restore+='COMMIT;';sql(restore,db);
const checksum=table=>sql(`SELECT md5(coalesce(jsonb_agg(v ORDER BY v::text),'[]'::jsonb)::text) FROM (SELECT to_jsonb(t) v FROM ${table} t) s`,db);
const before=Object.fromEntries(Object.values(tables).map(t=>[t,checksum(t)]));
for(const file of fs.readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort())sql(fs.readFileSync(`supabase/migrations/${file}`,'utf8'),db);
for(const table of Object.values(tables))assert.equal(checksum(table),before[table],`Migration changed ${table}`);
assert.equal(sql('SELECT count(*) FROM game_private.actor_identities',db),'5');
assert.equal(sql('SELECT count(*) FROM game_private.actor_sessions',db),'0');
console.log('Migration preservation passed: all 7 existing tables unchanged, five private identities added, zero login sessions created.');
