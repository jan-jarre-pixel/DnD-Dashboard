// Dedicated, network-isolated test container only; never accepts a remote DB URL.
const {spawnSync}=require('node:child_process');
const container='dnd-m0-postgres';
function sql(query, db='dnd_restore'){
 const r=spawnSync('docker',['exec','-i',container,'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres','-d',db],{input:query,encoding:'utf8',maxBuffer:10*1024*1024});
 if(r.status!==0)throw Error(r.stderr.trim());return r.stdout.trim();
}
const literal=value=>value===null?'NULL':`'${String(value).replaceAll("'","''")}'`;
module.exports={sql,literal,container};
