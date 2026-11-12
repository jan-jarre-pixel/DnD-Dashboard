/* Presentation helpers only. Authorization and mutations stay in the data boundary. */
((root)=>{
 'use strict';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const choice=(value,allowed,fallback)=>allowed.includes(value)?value:fallback;
 function link(href,label,active=false){return `<a href="${escape(href)}"${active?' aria-current="page"':''}>${escape(label)}</a>`;}
 function button({id,label,variant='secondary',disabled=false,busy=false,type='button'}={}){
  return `<button${id?` id="${escape(id)}"`:''} type="${choice(type,['button','submit','reset'],'button')}" class="ui-button ui-button--${choice(variant,['primary','secondary','danger'],'secondary')}"${disabled||busy?' disabled':''}${busy?' aria-busy="true"':''}>${escape(label)}</button>`;
 }
 function badge(label,tone='neutral'){return `<span class="ui-badge ui-badge--${choice(tone,['neutral','positive','warning','danger'],'neutral')}">${escape(label)}</span>`;}
 function field({id,label,value='',hint='',error='',type='text',required=false}={}){
  const key=escape(id),description=[hint?`${key}-hint`:'',error?`${key}-error`:''].filter(Boolean).join(' ');
  return `<div class="ui-field"><label for="${key}">${escape(label)}</label><input id="${key}" name="${key}" type="${choice(type,['text','search','number','password'],'text')}" value="${escape(value)}"${required?' required':''}${description?` aria-describedby="${description}"`:''}${error?' aria-invalid="true"':''}>${hint?`<p id="${key}-hint" class="ui-hint">${escape(hint)}</p>`:''}${error?`<p id="${key}-error" class="ui-error">${escape(error)}</p>`:''}</div>`;
 }
 function message(title,body,{error=false}={}){return `<section class="ui-message${error?' ui-message--error':''}"${error?' role="alert"':''}><h2>${escape(title)}</h2><p>${escape(body)}</p></section>`;}
 // Native dialog supplies modal semantics and keyboard containment. All closing paths
 // pass through the same guard; consumers own dirty-state and confirmation policy.
 function dialogController(dialog,{initialFocus,canClose=()=>true}={}){
  let previous;
  const close=()=>{if(!dialog.open||!canClose())return false;dialog.close();return true;};
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',()=>{if(previous?.isConnected)previous.focus();});
  return Object.freeze({open(trigger=document.activeElement){if(dialog.open)return;previous=trigger;dialog.showModal();(initialFocus||dialog.querySelector('button,input,select,textarea,a[href]'))?.focus();},close});
 }
 root.DND.ui=Object.freeze({escape,link,button,badge,field,message,dialogController});
})(globalThis);
