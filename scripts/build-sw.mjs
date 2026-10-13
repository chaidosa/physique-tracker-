import { readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const assets = (await readdir('dist/assets')).map(name=>`/assets/${name}`)
const files=['/','/index.html','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png',...assets]
const cache='form-shell-'+createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0,12)
await writeFile('dist/sw.js', `
const CACHE=${JSON.stringify(cache)}, FILES=${JSON.stringify(files)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('form-shell-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==self.location.origin)return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).catch(()=>caches.open(CACHE).then(c=>c.match('/index.html'))));
  } else if(FILES.includes(url.pathname)) {
    e.respondWith(caches.open(CACHE).then(async c=>(await c.match(url.pathname))||fetch(e.request)));
  }
});
`)
