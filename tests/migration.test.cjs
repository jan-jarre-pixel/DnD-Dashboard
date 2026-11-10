const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const vm=require('node:vm');
const manifest=require('../docs/migration-manifest.json');
for(const entry of manifest.files) test(`M0 source provenance: ${entry.target}`,()=>{
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(['index.html','spieltisch.html','online.js'].includes(entry.target)?`tests/fixtures/m0/${entry.target}`:entry.target)).digest('hex'),entry.sha256);
});
for(const file of ['index.html','spieltisch.html']) test(`scripts and relative paths: ${file}`,()=>{
 const html=fs.readFileSync(file,'utf8');
 for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(m[1]);
 for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  if(/^(https?:|#|data:)/.test(m[1]))continue;
  assert(!m[1].startsWith('/'),`absolute path: ${m[1]}`);
  assert(fs.existsSync(m[1]),`missing asset: ${m[1]}`);
 }
});
test('configuration contains only public Supabase key',()=>{
 const context={window:{}};vm.runInNewContext(fs.readFileSync('config.js','utf8'),context);
 assert.equal(context.window.DND_CLOUD_CONFIG.url,'https://tczmeehxpurokbmkynpd.supabase.co');
 assert.match(context.window.DND_CLOUD_CONFIG.publishableKey,/^sb_publishable_/);
});
test('deployment excludes SQL, docs and tests',()=>{
 require('../scripts/build.cjs');
 assert.deepEqual(fs.readdirSync('dist').sort(),['.nojekyll','config.js','index.html','manifest.webmanifest','online.js','public','spieltisch.html','src','sw.js']);
});

test('all extracted application scripts parse',()=>{
 const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${dir}/${e.name}`):[`${dir}/${e.name}`]);
 for(const file of walk('src').filter(p=>p.endsWith('.js')))new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
});
