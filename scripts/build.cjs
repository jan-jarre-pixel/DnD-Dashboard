const fs=require('node:fs'),{createHash}=require('node:crypto');
fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist');
for(const file of ['index.html','spieltisch.html','online.js','config.js','manifest.webmanifest'])fs.copyFileSync(file,`dist/${file}`);
for(const dir of ['src','public'])fs.cpSync(dir,`dist/${dir}`,{recursive:true});
fs.writeFileSync('dist/.nojekyll','');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${dir}/${e.name}`):[`${dir}/${e.name}`]);
const files=walk('dist').map(p=>p.slice(5)).filter(p=>p!=='.nojekyll').sort(),hash=createHash('sha256');hash.update(fs.readFileSync('scripts/service-worker.cjs'));hash.update(fs.readFileSync('scripts/build.cjs'));for(const p of files)hash.update(p).update(fs.readFileSync('dist/'+p));
fs.writeFileSync('dist/sw.js',require('./service-worker.cjs')(hash.digest('hex').slice(0,20),['./',...files]));
