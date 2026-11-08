((root)=>{
 'use strict';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function link(href,label,active=false){return `<a href="${escape(href)}"${active?' aria-current="page"':''}>${escape(label)}</a>`;}
 root.DND.ui=Object.freeze({escape,link});
})(globalThis);
