// Synthetic PostgreSQL only. External requests are blocked, including every real backend URL.
const fs=require('node:fs'),http=require('node:http'),{rpc,codes,seed}=require('./db/rpc.cjs');
module.exports=async function harness(){
 seed();rpc('dnd_gm_manage',{p_code:codes.gm,p_action:'start',p_title:'Isolated QA'});
 const server=http.createServer(async(req,res)=>{try{
  const name=decodeURIComponent(req.url.split('?')[0]);
  if(name.startsWith('/DnD-Dashboard/__rpc/')&&req.method==='POST'){let body='';for await(const c of req){body+=c;if(body.length>2200000){res.writeHead(413).end();return;}}res.setHeader('Content-Type','application/json');try{res.end(JSON.stringify(rpc(name.split('/').pop(),JSON.parse(body))));}catch(e){res.writeHead(400).end(JSON.stringify({code:/Versionskonflikt/.test(e.message)?'40001':/abgelaufen/.test(e.message)?'28000':'P0001',message:e.message}));}return;}
  if(name==='/DnD-Dashboard/__events'){res.writeHead(503,{'Content-Type':'application/json'}).end('{}');return;}
  if(!name.startsWith('/DnD-Dashboard/')){res.writeHead(404).end();return;}
  const file=name.slice('/DnD-Dashboard/'.length)||'index.html';if(file.includes('..')||!(['index.html','spieltisch.html','online.js','config.js','manifest.webmanifest'].includes(file)||/^(src|public)\/[a-z0-9/.-]+$/.test(file))||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(file));
 }catch{res.writeHead(400).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const engine=process.env.BROWSER||'chromium';if(!['chromium','firefox','webkit'].includes(engine))throw Error('Unknown engine');const browser=await require('playwright')[engine].launch({headless:true,...(engine==='chromium'?{...(fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox']}:{})}).catch(error=>{server.closeAllConnections();server.close();throw error;}),base=`http://127.0.0.1:${server.address().port}/DnD-Dashboard/`,errors=[],external=[];
 async function page(actor=null,entry='',viewport={width:1440,height:900}){
  const context=await browser.newContext({viewport});await context.addInitScript(()=>{const original=window.fetch;window.fetch=(url,options)=>{const raw=typeof url==='string'?url:url?.url||String(url);if(/^https:\/\/[a-z0-9-]+\.supabase\.co\/rest\/v1\/rpc\//.test(raw))return original(location.origin+'/DnD-Dashboard/__rpc/'+raw.split('/').pop(),options);if(raw.includes('/functions/v1/dnd-events'))return original(location.origin+'/DnD-Dashboard/__events',options);return original(url,options);};});await context.route('https://**/*',r=>{external.push(new URL(r.request().url()).hostname);return r.abort('blockedbyclient');});const p=await context.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>errors.push(e.message));await p.goto(base+entry);
  if(actor){const tabletop=entry.startsWith('spieltisch.html');await p.selectOption(tabletop?'#role':'#loginCharacter',actor);await p.fill(tabletop?'#accessCode':'#loginCode',codes[actor]);await p.locator(tabletop?'#loginForm button[type=submit]':'#sheet button[type=submit]').click();await p.getByText('Abmelden',{exact:true}).waitFor();}
  return p;
 }
 return {page,browser,base,errors,external,rpc,codes,async close(){await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}};
};
