((root)=>{
 'use strict';
 let state=Object.freeze({identity:null,connection:'signed-out'});
 const listeners=new Set();
 root.DND.store=Object.freeze({get:()=>state,update(patch){state=Object.freeze({...state,...patch});for(const fn of listeners)fn(state);},subscribe(fn){listeners.add(fn);fn(state);return()=>listeners.delete(fn);}});
})(globalThis);
