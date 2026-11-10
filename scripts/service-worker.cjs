module.exports=(version,assets)=>`/* Public app shell only. Auth, RPC, map images and drafts never enter CacheStorage. */
'use strict';const PREFIX='dnd-shell-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-',CACHE=PREFIX+${JSON.stringify(version)},ASSETS=${JSON.stringify(assets)},URLS=new Set(ASSETS.map(p=>new URL(p,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);try{await cache.addAll([...URLS].map(url=>new Request(url,{cache:'reload'})));}catch(error){await caches.delete(CACHE);throw error;}})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='activate')self.skipWaiting();});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;url.search='';url.hash='';if(!URLS.has(url.href))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);return await cache.match(url.href)||fetch(request);})());});
`;
