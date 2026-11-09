const {test}=require('node:test'),assert=require('node:assert/strict'),{snap,distance}=require('../src/core/vtt.js');
const square={grid:'square',grid_size:50,offset_x:0,offset_y:0,scale:5};
test('square snap uses centers and explicit grid alignment',()=>{assert.deepEqual(snap({x:47,y:89},square),{x:25,y:75});assert.deepEqual(snap({x:47,y:89},{...square,offset_x:10,offset_y:10}),{x:35,y:85});});
test('gridless positions remain pixels; Euclidean distance includes configured scale',()=>{assert.deepEqual(snap({x:42.4,y:99.9},{...square,grid:'none'}),{x:42,y:100});assert.equal(distance({x:0,y:0},{x:150,y:200},square),25);});
test('hex snap and cube distance agree for all nearby centers including negatives',()=>{const hex={...square,grid:'hex'};for(let q=-3;q<=3;q++)for(let r=-3;r<=3;r++){const p={x:50*(q+r/2),y:50*Math.sqrt(3)/2*r},s=snap(p,hex);assert(Math.abs(s.x-p.x)<=0.5&&Math.abs(s.y-p.y)<=0.5);assert.equal(distance({x:0,y:0},s,hex),(Math.abs(q)+Math.abs(r)+Math.abs(q+r))/2*5);}});
