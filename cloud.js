// ---- Accounts + cloud sync ----
// Layout in Firestore, per account: users/{uid} (profile, proves a valid invite code),
// users/{uid}/data/settings (everything in S except purchases) and users/{uid}/months/{YYYY-MM} (that month's purchases).
// Each document is {v:1,json:"..."}. C.syn holds what this device last wrote or applied, so save() only writes real changes.
// The month document a row is saved in. The rules only accept YYYY-MM or "none", so a row with a missing or odd date goes to "none".
const mk=t=>/^\d{4}-\d{2}/.test(t.date||"")?t.date.slice(0,7):"none";
function ser(){const o=Object.assign({},S);delete o.tx;const g=bare();S.tx.forEach(t=>(g[mk(t)]=g[mk(t)]||[]).push(t));
 const out={settings:JSON.stringify(o),months:bare()};for(const m in g)out.months[m]=JSON.stringify(g[m]);return out}
function stat(){const el=$("sync");el.textContent=!C.on||!C.ready?"":C.err||(C.pend?(navigator.onLine?"Saving…":"Offline. Changes will sync when you’re back online."):"Saved");el.classList.toggle("ok",el.textContent=="Saved")}
// C.un[key] counts this device's writes to a document that the server has not confirmed yet. While it is above zero,
// incoming versions of that document are ignored (ours is newer and will win); when it reaches zero we re-check.
function put(key,p){C.pend++;C.un[key]=(C.un[key]||0)+1;stat();
 const end=e=>{C.pend--;C.err=e?"Couldn’t save ("+(e.code||e.message)+"). Reload the page.":"";stat();if(!--C.un[key]&&C.ready&&C.again)C.again()};
 p.then(()=>end(),end)}
function cloudSave(){if(!C.ready)return;const F=C.F,cur=ser(),at=(...p)=>F.doc(C.db,"users",C.user.uid,...p);
 if(cur.settings!==C.syn.settings){C.syn.settings=cur.settings;put("s",F.setDoc(at("data","settings"),{v:1,json:cur.settings}))}
 for(const m in cur.months)if(cur.months[m]!==C.syn.months[m]){C.syn.months[m]=cur.months[m];put("m:"+m,F.setDoc(at("months",m),{v:1,json:cur.months[m]}))}
 // A month with no purchases left is written as an empty list, never deleted, so "missing" can't be mistaken for "deleted".
 for(const m in C.syn.months)if(!(m in cur.months)&&C.syn.months[m]!=="[]"){C.syn.months[m]="[]";put("m:"+m,F.setDoc(at("months",m),{v:1,json:"[]"}))}}
function stop(){C.unsub.forEach(f=>f());C.unsub=[];C.ready=false;C.again=null;C.un={}}
function remoteRender(){const a=document.activeElement;
 if(a&&/^(INPUT|TEXTAREA)$/.test(a.tagName)&&a.type!="checkbox"&&$("app").contains(a)){if(!C.defer){C.defer=true;a.addEventListener("blur",()=>{C.defer=false;later(render)},{once:true})}}
 else render()}
function listen(){const F=C.F,uid=C.user.uid,opt={includeMetadataChanges:true};let sS=null,mS=null,trust=false;stop();
 const parse=j=>{try{return JSON.parse(j)}catch(e){return null}};
 // Show the app only once the data is known to be complete: from the server, or from this device's own cache
 // (which has the settings document only if it synced before). Otherwise a new device could overwrite real data.
 const check=()=>{if(C.ready||!sS||!mS)return;
  if(sS.exists()&&sS.metadata.fromCache)trust=true;
  if(!(sS.exists()||!sS.metadata.fromCache)||!(trust||!mS.metadata.fromCache))return;
  S=Object.assign({tx:[],rules:{},cur:"₪"},sS.exists()&&own(parse(sS.data().json))||{});S.tx=[];
  mS.docs.slice().sort((a,b)=>a.id<b.id?-1:1).forEach(d=>{const a=parse(d.data().json);if(Array.isArray(a))S.tx.push(...a)});
  fixMaps();C.syn=ser();if(!sS.exists())C.syn.settings=null;mS.forEach(d=>{if(!(d.id in C.syn.months))C.syn.months[d.id]=d.data().json});
  C.ready=true;C.err="";C.again=()=>{onS(sS);onM(mS)};start();phoneListen()};
 const fail=e=>{if(C.user&&C.user.uid!=uid)return;stop();
  if(e.code=="permission-denied")authShow("code");else{$("boot").hidden=false;$("boot").textContent="Couldn’t load your data ("+(e.code||e.message)+"). Check your connection and reload."}};
 // After the first load, apply only confirmed changes that came from another device.
 const onS=d=>{sS=d;if(!C.ready)return check();
  if(d.metadata.hasPendingWrites||C.un.s||!d.exists()||d.data().json===C.syn.settings)return;
  const o=parse(d.data().json);if(!o)return;S=Object.assign({rules:{},cur:"₪"},own(o),{tx:S.tx});fixMaps();C.syn.settings=ser().settings;remoteRender()};
 const onM=q=>{mS=q;if(!C.ready)return check();
  const chg=[];q.forEach(d=>{const j=d.data().json;if(!d.metadata.hasPendingWrites&&!C.un["m:"+d.id]&&j!==C.syn.months[d.id])chg.push([d.id,parse(j),j])});
  if(!chg.length)return;
  chg.forEach(([m,a])=>{if(Array.isArray(a))S.tx=S.tx.filter(t=>mk(t)!=m).concat(a)});
  const cur=ser();chg.forEach(([m,a,j])=>{C.syn.months[m]=cur.months[m]||j});remoteRender()};
 C.unsub.push(F.onSnapshot(F.doc(C.db,"users",uid,"data","settings"),opt,onS,fail));
 C.unsub.push(F.onSnapshot(F.collection(C.db,"users",uid,"months"),opt,onM,fail))}
// ---- Phone inbox ---- (rules and layout: docs/backend.md)
// users/{uid}/data/phone = {key}: while it exists, anything that sends that key can add items to users/{uid}/inbox without signing in
// (a phone automation). This device turns each item into a purchase (inboxAdd in app.js; the row's id comes from the item's id, so two
// devices that see the same item add the same row) and deletes the item. Only items confirmed by the server are handled.
// Before the new rules are published both listeners fail with permission-denied; the panel then says so and nothing else changes.
const phoneUrl=()=>(EMU?"http://127.0.0.1:8080":"https://firestore.googleapis.com")+"/v1/projects/"+FBC.projectId+"/databases/(default)/documents/users/"+C.user.uid+"/inbox";
function phoneShow(msg){const el=$("phone"),k=C.pkey;if(!el)return;
 el.innerHTML=`<b>Add from your phone</b><div class="sub">Lets a phone automation add a purchase without opening the app. Anyone with the key can add purchases (nothing else), so keep it on your phone only.</div>`+
  (k?`<label class="row"><span style="width:70px">Address</span><input id="purl" readonly value="${esc(phoneUrl())}"><button data-copy="purl">Copy</button></label>
  <label class="row"><span style="width:70px">Key</span><input id="pkeyv" readonly value="${esc(k)}"><button data-copy="pkeyv">Copy</button></label>
  <div class="row"><button id="pnew">New key</button><button class="danger" id="poff">Turn off</button><span class="msg" id="pmsg">${esc(msg||"")}</span></div>`
  :`<div class="row"><button id="pon">Turn on</button><span class="msg" id="pmsg">${esc(msg||"")}</span></div>`)}
function phoneKey(on){const F=C.F,ref=F.doc(C.db,"users",C.user.uid,"data","phone");
 if(!navigator.onLine)return phoneShow("Connect to the internet first.");
 const key=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/\+/g,"-").replace(/\//g,"_");
 // The write's promise settles when the server has answered; only then does the panel show the new state.
 C.pwait=true;phoneShow("Saving…");
 (on?F.setDoc(ref,{key}):F.deleteDoc(ref)).then(()=>{C.pwait=false;C.pkey=on?key:"";phoneShow()},e=>{C.pwait=false;phoneShow("Couldn’t change it ("+(e.code||e.message)+").")})}
function phoneListen(){const F=C.F,uid=C.user.uid;C.pkey="";C.pwait=false;phoneShow();
 // The panel shows a key only once the server has it (and "Turn on" only once it is gone), so what is shown is what works.
 C.unsub.push(F.onSnapshot(F.doc(C.db,"users",uid,"data","phone"),{includeMetadataChanges:true},d=>{if(C.pwait||d.metadata.hasPendingWrites)return;C.pkey=d.exists()?String(d.data().key||""):"";phoneShow()},()=>phoneShow("Not available yet.")));
 C.unsub.push(F.onSnapshot(F.collection(C.db,"users",uid,"inbox"),{includeMetadataChanges:true},q=>{if(q.metadata.fromCache||!C.ready)return;
  const got=[];q.forEach(d=>{if(!d.metadata.hasPendingWrites)got.push([d.id,d.data()])});if(!got.length)return;
  const ids=inboxAdd(got);got.forEach(([id])=>F.deleteDoc(F.doc(C.db,"users",uid,"inbox",id)).catch(()=>{}));
  if(ids.length){save();remoteRender();pushUndo("Added "+ids.length+" from your phone",()=>{S.tx=S.tx.filter(t=>!ids.includes(t.id))})}},()=>{}))}
document.addEventListener("click",e=>{const t=e.target;if(!t||!t.id&&!t.dataset)return;
 if(t.id=="pon"||t.id=="pnew")phoneKey(true);else if(t.id=="poff")phoneKey(false);
 else if(t.dataset.copy){const i=$(t.dataset.copy);if(i){i.select();(navigator.clipboard?navigator.clipboard.writeText(i.value):Promise.reject()).then(()=>{t.textContent="Copied"},()=>{try{document.execCommand("copy");t.textContent="Copied"}catch(x){}})}}});
const AE={"auth/invalid-credential":"Wrong email or password.","auth/wrong-password":"Wrong email or password.","auth/user-not-found":"Wrong email or password.","auth/email-already-in-use":"That email already has an account. Sign in instead.","auth/weak-password":"Use a password of at least 6 characters.","auth/invalid-email":"That email doesn’t look right.","auth/missing-password":"Enter your password.","auth/too-many-requests":"Too many attempts. Wait a few minutes and try again.","auth/network-request-failed":"No connection. Check your internet and try again.","permission-denied":"That invite code isn’t valid."};
const authErr=e=>AE[e&&e.code]||"Something went wrong ("+(e&&(e.code||e.message)||"unknown")+").";
function authShow(m){C.mode=m;$("auth").hidden=!m;$("boot").hidden=true;if(!m)return;$("app").hidden=true;
 $("atitle").textContent=m=="in"?"Sign in":m=="up"?"Create account":"One more step";
 $("ahelp").textContent=m=="code"?"This account isn’t set up yet. Enter your invite code to finish.":m=="up"?"You need an invite code to create an account.":"";
 $("aemail").hidden=$("apassrow").hidden=m=="code";$("acode").hidden=m=="in";
 $("apass").autocomplete=m=="up"?"new-password":"current-password";
 $("ago").textContent=m=="in"?"Sign in":m=="up"?"Create account":"Finish";
 $("aswap").textContent=m=="in"?"Create account":m=="up"?"I have an account":"Sign out";
 $("aforgot").hidden=m!="in";$("amsg").textContent=""}
function enter(){authShow(null);bootLoading();$("boot").hidden=false;listen()}
// The invite code is the id of a document in /invites; the rules only let the profile be created if it exists.
function claim(code){if(/\//.test(code))return Promise.reject({code:"permission-denied"});
 return C.F.setDoc(C.F.doc(C.db,"users",C.auth.currentUser.uid),{invite:code,created:Date.now()})}
async function authGo(){const B=C.B,em=$("aemail").value.trim(),pw=$("apass").value,code=$("acode").value.trim(),msg=t=>{$("amsg").textContent=t};
 if(C.busy)return;msg("");
 if(C.mode!="code"&&(!em||!pw))return msg("Enter your email and password.");
 if(C.mode!="in"&&!code)return msg("Enter your invite code.");
 if(!navigator.onLine)return msg(AE["auth/network-request-failed"]);
 C.busy=true;$("ago").disabled=true;
 try{
  if(C.mode=="in")await B.signInWithEmailAndPassword(C.auth,em,pw);
  else if(C.mode=="up"){C.signing=true;
   try{const cred=await B.createUserWithEmailAndPassword(C.auth,em,pw);
    try{await claim(code)}catch(e){await B.deleteUser(cred.user).catch(()=>{});throw e}}
   finally{C.signing=false}
   enter()}
  else{await claim(code);enter()}
  $("apass").value="";$("acode").value="";showPass(false)}
 catch(e){msg(authErr(e))}
 finally{C.busy=false;$("ago").disabled=false}}
async function forgot(){const em=$("aemail").value.trim();if(!em)return $("amsg").textContent="Type your email first.";
 try{await C.B.sendPasswordResetEmail(C.auth,em);$("amsg").textContent="If that email has an account, a reset link is on its way."}catch(e){$("amsg").textContent=authErr(e)}}
// Leaving an account: forget this device's cached copy of the data, then start clean.
async function bye(){try{await C.F.terminate(C.db);await C.F.clearIndexedDbPersistence(C.db)}catch(e){}location.reload()}
async function signOutNow(){
 if(C.pend&&!C.outArm){C.outArm=true;$("outmsg").textContent="Some changes haven’t synced yet. Press again to sign out and lose them.";setTimeout(()=>{C.outArm=false;$("outmsg").textContent=""},6000);return}
 stop();C.leaving=true;try{await C.B.signOut(C.auth)}catch(e){}bye()}
async function delAccount(){const B=C.B,F=C.F,u=C.auth.currentUser,pw=$("delpass").value,msg=t=>{$("accmsg").textContent=t};
 if(!pw)return msg("Type your password to confirm.");
 if(!navigator.onLine)return msg("Connect to the internet first.");
 if(!C.delArm){C.delArm=true;msg("Press again to delete your account and all its data. This can’t be undone.");setTimeout(()=>{C.delArm=false},6000);return}
 C.delArm=false;
 try{await B.reauthenticateWithCredential(u,B.EmailAuthProvider.credential(u.email,pw))}catch(e){return msg(/invalid-credential|wrong-password/.test(e.code)?"Wrong password.":authErr(e))}
 stop();C.leaving=true;$("app").hidden=true;$("boot").textContent="Deleting your account…";$("boot").hidden=false;
 try{const q=await F.getDocsFromServer(F.collection(C.db,"users",u.uid,"months"));
  await Promise.all(q.docs.map(d=>F.deleteDoc(d.ref)));
  // The phone key and anything waiting in the inbox (skipped quietly if the rules for them are not published yet).
  try{await F.deleteDoc(F.doc(C.db,"users",u.uid,"data","phone"));const ib=await F.getDocsFromServer(F.collection(C.db,"users",u.uid,"inbox"));await Promise.all(ib.docs.map(d=>F.deleteDoc(d.ref)))}catch(e){}
  await F.deleteDoc(F.doc(C.db,"users",u.uid,"data","settings"));await F.deleteDoc(F.doc(C.db,"users",u.uid));
  await B.deleteUser(u);bye()}
 catch(e){$("boot").textContent="Couldn’t finish deleting ("+(e.code||e.message)+"). Reload the page and try again."}}
async function cloudBoot(){$("app").hidden=true;$("boot").hidden=false;
 // The SDK is served by this site (vendor/firebase/, copied by tools/firebase.mjs). The auth and firestore files import
 // ./firebase-app.js themselves, so it must be loaded by exactly that address (no ?v=) or there would be two copies of it.
 try{const u="./vendor/firebase/firebase-";
  const[A,B,F]=await Promise.all([import(u+"app.js"),import(u+"auth.js"),import(u+"firestore.js")]);
  const app=A.initializeApp(FBC);C.B=B;C.F=F;C.auth=B.getAuth(app);
  try{C.db=F.initializeFirestore(app,{localCache:F.persistentLocalCache({tabManager:F.persistentMultipleTabManager()})})}catch(e){C.db=F.getFirestore(app)}
  if(EMU){B.connectAuthEmulator(C.auth,"http://127.0.0.1:9099",{disableWarnings:true});F.connectFirestoreEmulator(C.db,"127.0.0.1",8080)}
  B.onAuthStateChanged(C.auth,usr=>{C.user=usr;if(C.signing||C.leaving)return;stop();if(usr)enter();else authShow("in")})}
 catch(e){$("boot").textContent="Couldn’t reach the sign-in service. Check your connection and reload."}}
function showPass(on){$("apass").type=on?"text":"password";$("ashow").textContent=on?"Hide":"Show";$("ashow").setAttribute("aria-pressed",on)}
$("ashow").onclick=()=>showPass($("apass").type=="password");
$("auth").onsubmit=e=>{e.preventDefault();authGo()};
$("aswap").onclick=()=>{if(C.mode=="code")signOutNow();else authShow(C.mode=="in"?"up":"in")};
$("aforgot").onclick=forgot;$("signout").onclick=signOutNow;$("delacc").onclick=delAccount;
addEventListener("online",stat);addEventListener("offline",stat);
if(C.on)cloudBoot();else start();
