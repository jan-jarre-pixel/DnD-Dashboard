/* Pure map geometry. Distances are tools for adjudication, not automatic movement rules. */
((root)=>{
 'use strict';
 const roundCube=(q,r)=>{let x=Math.round(q),z=Math.round(r),y=Math.round(-q-r);const dx=Math.abs(x-q),dy=Math.abs(y+q+r),dz=Math.abs(z-r);if(dx>dy&&dx>dz)x=-y-z;else if(dy>dz)y=-x-z;else z=-x-y;return {q:x,r:z};};
 function axial(p,m){const radius=m.grid_size/Math.sqrt(3),x=p.x-m.offset_x,y=p.y-m.offset_y;return roundCube((Math.sqrt(3)*x/3-y/3)/radius,2*y/3/radius);}
 function snap(p,m){if(m.grid==='none')return {x:Math.round(p.x),y:Math.round(p.y)};if(m.grid==='hex'){const h=axial(p,m),r=m.grid_size/Math.sqrt(3);return {x:Math.round(m.offset_x+r*Math.sqrt(3)*(h.q+h.r/2)),y:Math.round(m.offset_y+r*1.5*h.r)};}return {x:Math.round((p.x-m.offset_x-m.grid_size/2)/m.grid_size)*m.grid_size+m.offset_x+m.grid_size/2,y:Math.round((p.y-m.offset_y-m.grid_size/2)/m.grid_size)*m.grid_size+m.offset_y+m.grid_size/2};}
 function distance(a,b,m){if(m.grid==='hex'){const x=axial(a,m),y=axial(b,m);return (Math.abs(x.q-y.q)+Math.abs(x.r-y.r)+Math.abs(x.q+x.r-y.q-y.r))/2*m.scale;}return Math.hypot(a.x-b.x,a.y-b.y)/m.grid_size*m.scale;}
 const geometry=Object.freeze({snap,distance,axial});(root.DND??={}).vttMath=geometry;if(typeof module!=='undefined')module.exports=geometry;
})(globalThis);
