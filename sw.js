// Service worker for Spend, sorted: makes the app installable and usable offline.
// VERSION is written by tools/stamp.mjs (runs before every `npm test`); it changes whenever an app file changes.
// Rules:
//  - The page (index.html): the saved copy of this version is shown at once (fast opening, also on a bad line). A new deploy arrives as
//    a new service worker (it saves its own page) and shows the "Update available, Reload" notice. First visit: the network answers.
//  - The app's own files: saved copy first (index.html asks for them as file?v=VERSION, so a new deploy asks for new names),
//    refreshed in the background as a safety net in case the stamp was ever forgotten.
//    The Firebase SDK in vendor/firebase/ is one of them (in FILES, so it is saved at install and counted in the version).
//  - Fonts (fixed addresses): saved copy first, kept across versions.
//  - The PDF and picture readers in vendor/ (about 9MB, used once a month for a payslip): saved on first use and kept across
//    versions, so an app update does not download them again. They are still refreshed in the background when used.
//  - Everything else (Firebase sign-in and data calls, the emulators) is never touched or stored here.
const VERSION="190462a8c7";
const SHELL="spend-"+VERSION,RT="spend-rt-1";
const FILES=["./","style.css?v="+VERSION,"app.js?v="+VERSION,"cloud.js?v="+VERSION,"manifest.webmanifest","icons/icon.svg","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","icons/apple-touch-icon.png","vendor/xlsx.full.min.js","vendor/firebase/firebase-app.js","vendor/firebase/firebase-auth.js","vendor/firebase/firebase-firestore.js"];
const HOME=new URL("./",location.href).pathname;

self.addEventListener("install",e=>e.waitUntil(caches.open(SHELL).then(c=>c.addAll(FILES.map(u=>new Request(u,{cache:"no-cache"}))))));
// A new version waits until the page says so (see the "hello" and "skip" messages), then replaces the old one here.
self.addEventListener("activate",e=>e.waitUntil(caches.keys()
 .then(ks=>Promise.all(ks.filter(k=>k.startsWith("spend-")&&k!=SHELL&&k!=RT).map(k=>caches.delete(k))))
 .then(()=>self.clients.claim())));

const quiet=p=>p.catch(()=>{});
async function page(e,r){const c=await caches.open(SHELL),hit=await c.match("./");
 // The saved copy of this version is shown at once. It is only replaced when a new service worker installs (it saves its own page with
 // its own file names), so the page and the files it asks for always belong to one version. First visit: the network answers.
 if(hit)return hit;
 try{const res=await fetch(r.url,{cache:"no-cache"});if(res.ok&&!res.redirected)e.waitUntil(quiet(c.put("./",res.clone())));return res}catch(x){return Response.error()}}
const BIG=/\/vendor\/(pdf\.|tesseract|worker\.|heb\.|eng\.)/;
async function asset(e,r){const c=await caches.open(BIG.test(r.url)?RT:SHELL),hit=await c.match(r.url);
 const net=fetch(r.url,{cache:"no-cache"}).then(res=>{if(res.ok)c.put(r.url,res.clone());return res});
 if(hit){e.waitUntil(quiet(net));return hit}
 try{return await net}catch(x){return (await c.match(r.url,{ignoreSearch:true}))||Response.error()}}
// Other sites we keep a copy of: "keep" = the address never changes its content, "fresh" = also refresh in the background.
function ext(u){return u.hostname=="fonts.gstatic.com"?"keep":u.hostname=="fonts.googleapis.com"?"fresh":null}
async function outside(e,url,kind){const c=await caches.open(RT),hit=await c.match(url,{ignoreVary:true});
 if(hit&&kind=="keep")return hit;
 const net=fetch(url,{mode:"cors",credentials:"omit"}).then(res=>{if(res.ok)c.put(url,res.clone());return res});
 if(hit){e.waitUntil(quiet(net));return hit}
 return net}

self.addEventListener("fetch",e=>{const r=e.request;if(r.method!="GET")return;
 const u=new URL(r.url);
 if(u.origin==location.origin){
  if(!u.pathname.startsWith(HOME))return;
  if(r.mode=="navigate"){if(u.pathname==HOME||u.pathname==HOME+"index.html")e.respondWith(page(e,r));return}
  return e.respondWith(asset(e,r))}
 const k=ext(u);if(k)e.respondWith(outside(e,r.url,k))});

self.addEventListener("message",e=>{const d=e.data||{};
 // A page that already runs this version lets it take over quietly; an older page is told to offer a reload.
 if(d.type=="hello"){if(d.v===VERSION)self.skipWaiting();else e.source.postMessage({type:"update"})}
 if(d.type=="skip")self.skipWaiting();
 // First visit: the page loaded the fonts before this worker existed, so it sends their addresses to save now.
 if(d.type=="warm")e.waitUntil(Promise.all((d.urls||[]).map(x=>{let u;try{u=new URL(x)}catch(_){return}const k=ext(u);return k&&quiet(outside(e,u.href,k))})))});
