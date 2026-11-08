const fs=require('node:fs');
fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist');
for(const file of ['index.html','spieltisch.html','online.js','config.js'])fs.copyFileSync(file,`dist/${file}`);
for(const dir of ['src','public'])fs.cpSync(dir,`dist/${dir}`,{recursive:true});
fs.writeFileSync('dist/.nojekyll','');
