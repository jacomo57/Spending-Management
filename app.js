const CATS={
"Groceries":["סופרמרקט","חצי חינם","סטופמרקט","מכולת","מינימרקט","ירקות","פירות","קצביית","מעדניית","shufersal","שופרסל","rami levy","רמי לוי","victory","ויקטורי","yochananof","יוחננוף","osher ad","אושר עד","mega","tiv taam","טיב טעם","supermarket","grocery","market","אלונית","am:pm","ampm","tesco","aldi","lidl","carrefour","whole foods","trader joe"],
"Eating out":["מסעדת","בייקרי","בית קפה","מאפיית","מאפיה","פיצרייה","גלידה","שווארמה","חומוס","בורגר","סושי","קונדיטוריה","wolt","וולט","10bis","תן ביס","cafe","קפה","coffee","aroma","ארומה","restaurant","מסעדה","pizza","פיצה","burger","sushi","bar ","pub","mcdonald","starbucks","falafel","פלאפל","bakery","מאפה","doordash","uber eats","deliveroo","grubhub","diner","bistro","eatery"],
"Transport":["מונית","תחנת דלק","חניון","אוטובוס","מוסך","gett","uber","pango","פנגו","cellopark","סלופארק","fuel","delek","דלק","paz","פז","sonol","סונול","rav kav","רב קו","israel railways","רכבת","bus","taxi","parking","חניה","shell","bp ","lyft","metro","toll","כביש 6"],
"Bills & home":["electric","חשמל","iec","water","מים","arnona","ארנונה","gas ","גז","internet","bezeq","בזק","partner","פרטנר","cellcom","סלקום","hot ","utility","comcast","verizon"],
"Rent & payments":["rent ","שכירות","שכר דירה","ועד בית","mortgage","משכנתא","loan","הלוואה","הוראת קבע","העברה","transfer","paybox","פייבוקס","paypal","ביטוח לאומי","מס הכנסה","מע״מ"],
"Insurance":["insurance","ביטוח","הראל","מגדל","הפניקס","מנורה","איילון","שומרה","הכשרה","harel","migdal","phoenix","menora","ayalon","clal","aig","geico","allstate","state farm"],
"House stuff":["ikea","איקאה","ace hardware","אייס","home center","הום סנטר","homecenter","zara home","זארה הום","hardware","חומרי בניין","טמבור","tambour","אינסטלטור","plumber","מנעולן","locksmith","ניקיון","מנקה","cleaning","רהיט","furniture","מטבח","גינה","home depot","bed bath"],
"Health":["בית מרקחת","פארם","שיניים","אופטיקה","וטרינר","פיזיותרפיה","מרפאה","pharm","סופר פארם","super-pharm","pharmacy","מכבי","maccabi","clalit","כללית","meuhedet","מאוחדת","dental","רופא","doctor","clinic","קליניקה","cvs","walgreens","optic"],
"Shopping":["פרח","מקס סטוק","flower","florist","מתנה","gift","בגדי","נעלי","הנעלה","אופנה","ספרים","סטימצקי","ריהוט","צעצועי","amazon","aliexpress","ebay","zara","h&m","castro","קסטרו","fox","פוקס","renuar","shein","next","terminal x","ksp","ivory","איבורי","bug","nike","adidas","mango","golf","target","walmart","etsy","apple store","best buy"],
"Fun & travel":["קולנוע","חדר כושר","כושר","ספא","סטודיו","cinema","סינמה","cinema city","yes planet","netflix","spotify","hotel","מלון","booking","airbnb","el al","אל על","israir","arkia","flight","ryanair","wizz","easyjet","ticket","eventim","leaan","museum","theater","תיאטרון","gym","הולמס","holmes","concert","steam","playstation","xbox"],
"Subscriptions":["subscription","apple.com/bill","icloud","google one","google *","youtube","disney","hbo","prime video","chatgpt","openai","anthropic","claude","dropbox","adobe","notion","microsoft","patreon","audible","membership"]
};
let ORDER=[];
const COL={};
let S={tx:[],rules:{},cur:"₪"};
let cardF="all",CL=[],crdMsg="",cat=null,catMsg="",panel=null,focusCat=null;
// Accounts + cloud sync (Firebase): see docs/backend.md. The cloud code is in cloud.js.
// FB_REAL = the real project's firebaseConfig (public by design; firestore.rules is the protection).
// If it is set to null the site falls back to local-only mode (localStorage, no sign-in).
// On localhost the page talks to the local Firebase emulators only, never the real project. Add ?local=1 for local-only mode.
const FB_VER="13.3.0",FB_REAL={apiKey:"AIzaSyBeXWekBAG26oele2v7hAMDmLnIDW6D_uk",authDomain:"spending-management-608d5.firebaseapp.com",projectId:"spending-management-608d5",storageBucket:"spending-management-608d5.firebasestorage.app",messagingSenderId:"206144783820",appId:"1:206144783820:web:fd52344da11667da054969"};
const LOCALHOST=/^(localhost|127\.0\.0\.1)$/.test(location.hostname),LOCALONLY=LOCALHOST&&/[?&]local=1/.test(location.search);
const EMU=LOCALHOST&&!LOCALONLY;
const FBC=EMU?{apiKey:"demo-key",authDomain:"demo-spend.firebaseapp.com",projectId:"demo-spend"}:LOCALONLY?null:FB_REAL;
const C={on:!!FBC,un:{},ready:false,user:null,syn:{settings:null,months:{}},pend:0,err:"",unsub:[],mode:null};
if(!C.on)try{const r=localStorage.getItem("spend-v1");if(r)S=Object.assign(S,JSON.parse(r))}catch(e){}
function save(){if(C.on)return cloudSave();try{localStorage.setItem("spend-v1",JSON.stringify(S))}catch(e){}}
// Card rules: S.cards[name] = percent of that card's purchases that counts (100 full, 50 half, 0 not counted).
// syncCards also converts the old format (purchase.kind mine/joint + S.half) once.
function syncCards(){if(S.cards)return;S.cards={};const j=S.half===false?100:50,mine=new Set(S.tx.filter(t=>t.kind!="joint").map(t=>t.card));
 S.tx.forEach(t=>{if(!t.card)t.card=t.kind=="joint"?"Joint":"Mine";if(t.kind=="joint"){if(mine.has(t.card))t.card+=" (joint)";S.cards[t.card]=j}delete t.kind});
 (S.recur||[]).forEach(r=>{if(r.kind=="joint"){r.card="Recurring (joint)";S.cards[r.card]=j}delete r.kind});delete S.half}
syncCards();
const pct=c=>S.cards[c]==null?100:S.cards[c];
const v=t=>t.amt*pct(t.card)/100;
const rl=p=>p==100?"":p==50?"counts at half":p==0?"not counted":"counts at "+p+"%";
const ruleOpts=(p,custom)=>[[100,"Counts in full"],[50,"Counts at half"],[0,"Not counted"]].map(([x,l])=>`<option value="${x}"${p==x?" selected":""}>${l}</option>`).join("")+(![100,50,0].includes(p)?`<option value="${p}" selected>Custom: ${p}%</option>`:custom?`<option value="c">Custom %…</option>`:"");
function impRule(){$("irule").innerHTML=ruleOpts(pct($("card").value.trim()||"My card"))}
function renameCard(old,nv){crdMsg="";if(!nv||nv==old)return render();
 if(CL.includes(nv)){crdMsg="That name is already used.";return render()}
 S.tx.forEach(t=>{if(t.card==old)t.card=nv});S.recur.forEach(r=>{if((r.card||"Recurring")==old)r.card=nv});
 if(S.cards[old]!=null){S.cards[nv]=S.cards[old];delete S.cards[old]}if(cardF==old)cardF=nv;save();render()}
// Default categories for a new account. "Bills & home" and "House stuff" are not offered by default; their keywords
// stay in CATS and are routed by FB to "Rent & payments" and "Shopping" (unless the user adds categories with those names).
const NODEF=["Bills & home","House stuff"];
function syncCats(){if(!Array.isArray(S.cats))S.cats=Object.keys(CATS).filter(c=>!NODEF.includes(c));if(!S.alias)S.alias={};ORDER=[...S.cats,"Other"];if(!S.hue)S.hue={};S.cats.forEach(c=>{if(S.hue[c]==null)S.hue[c]=(Object.keys(S.hue).length*41+150)%360});ORDER.forEach(c=>COL[c]=c=="Other"?"hsl(150 8% 55%)":`hsl(${S.hue[c]} 55% 46%)`)}
syncCats();
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const key=d=>d.toLowerCase().replace(/[\d*#\/\\.\-_]+/g," ").replace(/\s+/g," ").trim().slice(0,24);
const FB={"Bills & home":"Rent & payments","House stuff":"Shopping"};
const cur=b=>S.alias[b]||b;
function tgt(c){let a=cur(c);if(!S.cats.includes(a)&&S.cats.includes(c))a=c;if(!S.cats.includes(a)&&FB[c])a=cur(FB[c]);return S.cats.includes(a)?a:"Other"}
// The issuer's own category column (Max has one). Used only when the merchant itself is not recognized.
const HINT=[["מזון","Groceries"],["מסעד","Eating out"],["תחבורה","Transport"],["דלק","Transport"],["רפואה","Health"],["ביטוח","Insurance"],["פנאי","Fun & travel"],["טיסות","Fun & travel"],["תיירות","Fun & travel"],["אופנה","Shopping"],["טיפוח","Shopping"],["מחשבים","Shopping"],["ספרים","Shopping"],["עיצוב הבית","House stuff"],["עירייה","Bills & home"],["תקשורת","Bills & home"],["העברת","Rent & payments"]];
function guess(d,hint){const k=key(d);if(S.rules[k])return S.rules[k];const l=d.toLowerCase();
 for(const c in CATS)if(CATS[c].some(w=>l.includes(w)))return tgt(c);
 const h=hint&&HINT.find(x=>hint.includes(x[0]));return h?tgt(h[1]):"Other"}
function splitLine(l,d){const o=[];let c="",q=false;for(let i=0;i<l.length;i++){const ch=l[i];
 if(ch=='"'){if(q&&l[i+1]=='"'){c+='"';i++}else q=!q}else if(ch==d&&!q){o.push(c);c=""}else c+=ch}o.push(c);return o.map(s=>s.trim())}
function num(s){if(s==null)return NaN;s=String(s);const neg=/^\(.*\)$/.test(s.trim())||/[-−]/.test(s);
 s=s.replace(/[^\d.,]/g,"");if(!s)return NaN;
 if(s.includes(",")&&s.includes("."))s=s.lastIndexOf(",")>s.lastIndexOf(".")?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"");
 else if(s.includes(",")){s=/,\d{1,2}$/.test(s)?s.replace(",","."):s.replace(/,/g,"")}
 const v=parseFloat(s);return neg?-v:v}
function date(s){s=String(s).trim();let m;
 if(m=s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/))return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
 if(m=s.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/)){let y=m[3].length==2?"20"+m[3]:m[3];return `${y}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`}return null}
function loose(text){const out=[];
 text.split(/\r?\n/).forEach(l=>{const m=l.match(/\d{4}-\d{2}-\d{2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/);if(!m)return;
  const dt=date(m[0]);const rest=l.replace(m[0]," ").replace(/\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}/g," ");
  const toks=[...rest.matchAll(/\(?-?\d[\d,]*(?:\.\d+)?\)?/g)].filter(t=>!isNaN(num(t[0])));
  if(!toks.length)return;const t=toks[toks.length-1];const a=Math.abs(num(t[0]));
  const desc=(rest.slice(0,t.index)+" "+rest.slice(t.index+t[0].length)).replace(/[₪$€]|ILS|[|\t]+/g," ").replace(/\s+/g," ").trim();
  if(dt&&a&&/\D{3}/.test(desc))out.push({date:dt,desc,amt:a})});
 return out}
// Import. A statement is read as a table of cells. table() finds every header row (an Excel file can hold several sheets)
// and from it the purchase date, merchant and charged amount columns: "סכום חיוב" (what was charged, in shekels) wins over
// "סכום עסקה" (which can be the full price of an installment plan, or a foreign-currency figure).
// A file with no header row falls back to guessing the columns from its first row. Returns null if no columns are found.
const HD=/date|תאריך/i,HS=/desc|merchant|name|details|payee|memo|בית ה?עסק|תיאור|פרטים/i,HA=/amount|sum|debit|charge|סכום|חיוב/i,HX=/מטבע|currency|תאריך|date/i,HB=/חיוב|charge|billing|debit|post/i,HL=/date|תאריך|desc|amount|סכום|name|merchant|עסק/i;
const addM=(d,n)=>{let[y,m,day]=d.split("-").map(Number);m+=n;y+=Math.floor((m-1)/12);m=(m-1)%12+1;return y+"-"+String(m).padStart(2,"0")+"-"+String(Math.min(day,new Date(y,m,0).getDate())).padStart(2,"0")};
function table(rows){rows=rows.map(r=>r.map(x=>String(x==null?"":x).trim())).filter(r=>r.some(Boolean));if(!rows.length)return[];
 const dc=x=>x&&x.length<25?date(x):null,isH=r=>!r.some(dc)&&r.some(x=>HD.test(x))&&r.some(x=>HA.test(x)&&!HX.test(x));
 let di=-1,si=-1,ai=-1,ci=-1,need=true;const out=[];
 const head=h=>{const pick=(re,no,pref)=>{const c=h.map((x,i)=>i).filter(i=>re.test(h[i])&&!(no&&no.test(h[i])));return c.length?(c.find(i=>pref(h[i]))??c[0]):-1};
  di=pick(HD,null,x=>!HB.test(x));ai=pick(HA,HX,x=>HB.test(x));si=h.findIndex((x,i)=>i!=di&&i!=ai&&HS.test(x));ci=h.findIndex(x=>/^(קטגוריה|category)$/i.test(x));need=true;out.card=ai>=0&&HB.test(h[ai])};
 let i=rows.slice(0,25).findIndex(isH);
 if(i<0){i=0;if(!rows[0].some(dc)&&rows[0].some(x=>HL.test(x))){head(rows[0]);i=1}}
 for(;i<rows.length;i++){const r=rows[i];if(isH(r)){head(r);continue}
  if(need){need=false;
   if(di<0)di=r.findIndex(dc);
   if(ai<0)for(let k=r.length-1;k>=0;k--)if(k!=di&&k!=si&&/\d/.test(r[k])&&!isNaN(num(r[k]))){ai=k;break}
   if(si<0)si=r.findIndex((x,k)=>k!=di&&k!=ai&&/\D{3}/.test(x));
   if(di<0||ai<0||si<0)return out.length?out:null}
  let d=dc(r[di]),desc=r[si];const a=num(r[ai]);if(!d||!desc||isNaN(a)||a===0)continue;
  // Installments ("תשלום 3 מתוך 5"): the row carries the original purchase date, so move this payment to its own month.
  const m=r.join(" ").match(/תשלום\s*(\d+)\s*מתוך\s*(\d+)/);if(m&&+m[1]>=1&&+m[1]<=+m[2]){d=addM(d,m[1]-1);desc+=" "+m[1]+"/"+m[2]}
  out.push({date:d,desc,amt:a,hint:ci>=0?r[ci]||"":""})}
 return out}
// Returns purchases with signed amounts: positive = spending, negative = refund or credit.
// A file where most amounts are negative is a bank-style export (spending shown as minus): its positive rows are income and are left out.
// Not applied to a card statement (its amount column is a "charged" one) or to fewer than 3 rows, where a minus is a refund.
function parse(text){const lines=text.split(/\r?\n/).filter(l=>l.trim());if(!lines.length)return[];
 const top=lines.slice(0,8),cnt=x=>(top.join("\n").match(new RegExp(x=="\t"?"\t":"\\"+x,"g"))||[]).length;
 const d=cnt("\t")>=2*top.length?"\t":[";","\t",","].map(x=>[x,cnt(x)]).sort((a,b)=>b[1]-a[1])[0][0];
 const out=table(lines.map(l=>splitLine(l,d)))||loose(text);
 return !out.card&&out.length>2&&out.filter(x=>x.amt<0).length>out.length/2?out.filter(x=>x.amt<0).map(x=>(x.amt=-x.amt,x)):out}
// Identical rows inside one file are all kept (two coffees on the same day are two purchases).
// When a file is imported again, a row is skipped only for as many identical copies as are already saved on that card.
function add(list,card){const id=x=>[x.date,x.desc,x.amt].join("|"),have={};let n=0;
 S.tx.forEach(t=>{if(t.card==card)have[id(t)]=(have[id(t)]||0)+1});
 list.forEach(x=>{if(have[id(x)]>0){have[id(x)]--;return}
  S.tx.push({id:Math.random().toString(36).slice(2),date:x.date,desc:x.desc,amt:x.amt,card,cat:guess(x.desc,x.hint)});n++});
 save();return n}
// Excel: every sheet becomes tab-separated text in the paste box (dates as yyyy-mm-dd, numbers unformatted). The library loads on first use.
function loadXlsx(){return window.XLSX?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement("script");s.src="vendor/xlsx.full.min.js";s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
function sheetText(ws){if(!ws["!ref"])return "";const R=XLSX.utils.decode_range(ws["!ref"]),out=[];
 for(let r=R.s.r;r<=Math.min(R.e.r,R.s.r+20000);r++){const row=[];
  for(let c=R.s.c;c<=R.e.c;c++){const x=ws[XLSX.utils.encode_cell({r,c})];let s="";
   if(x&&x.v!=null)s=x.t=="n"?(x.z&&XLSX.SSF.is_date(x.z)?XLSX.SSF.format("yyyy-mm-dd",x.v):String(x.v)):x.v instanceof Date?x.v.toISOString().slice(0,10):String(x.v);
   s=s.replace(/[‎‏‪-‮]/g,"").replace(/\s*[\r\n]+\s*/g," ").trim();row.push(/["\t]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s)}
  while(row.length&&!row[row.length-1])row.pop();if(row.length)out.push(row.join("\t"))}
 return out.join("\n")}
// The card's last 4 digits, from the lines above the table ("5315-MAX…", "… - 0599") or the file name ("0599_11_2026.xlsx").
function cardDigits(text,name){for(const l of text.split("\n").slice(0,8))for(const x of l.split("\t")){const m=x.match(/^(\d{4})-\D/)||x.match(/\D\s*-\s*(\d{4})$/);if(m)return m[1]}
 const m=name.match(/^(\d{4})_/);return m?m[1]:""}
let autoCard="";
function readFile(f){const m=$("msg"),r=new FileReader();
 if(!/\.xlsx?$/i.test(f.name)){r.onload=()=>{$("paste").value=r.result};return r.readAsText(f)}
 m.textContent="Reading the file…";
 r.onload=()=>loadXlsx().then(()=>{const w=XLSX.read(r.result,{type:"array",cellNF:true}),text=w.SheetNames.map(n=>sheetText(w.Sheets[n])).filter(Boolean).join("\n");
   $("paste").value=text;const d4=cardDigits(text,f.name),c=$("card");
   if(d4&&(!c.value.trim()||c.value==autoCard)){c.value=autoCard=CL.find(x=>x.includes(d4))||"Card "+d4;impRule()}
   m.textContent="File read. Check the card name, then press Import and sort."})
  .catch(()=>{m.textContent="Couldn’t read that Excel file. Export it as CSV instead, or paste the rows."});
 r.readAsArrayBuffer(f)}
// A backup or restore file is the user's own, but its values end up inside the page's HTML, so force the risky ones into shape.
function clean(o){const id=x=>String(x||Math.random().toString(36).slice(2)).replace(/[^\w:.-]/g,"");
 if(!o||!Array.isArray(o.tx)||o.tx.some(t=>!t||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||typeof t.amt!="number"))return null;
 o.tx.forEach(t=>{t.id=id(t.id);t.desc=String(t.desc||"");t.card=String(t.card||"My card");t.cat=String(t.cat||"Other")});
 if(!Array.isArray(o.recur))o.recur=[];o.recur.forEach(r=>{r.id=id(r.id);r.amt=+r.amt||0;r.day=Math.min(28,Math.max(1,parseInt(r.day)||1));r.desc=String(r.desc||"")});
 for(const k of["hue","cards"])if(o[k]&&typeof o[k]=="object")for(const c in o[k])o[k][c]=+o[k][c]||0;else delete o[k];
 if(!Array.isArray(o.cats)||o.cats.some(c=>typeof c!="string"))delete o.cats;
 return Object.assign({tx:[],rules:{},cur:"₪"},o)}
function fmt(n){return esc(S.cur)+" "+n.toLocaleString(undefined,{maximumFractionDigits:0})}
function mname(m){const[y,mo]=m.split("-");return new Date(y,mo-1,1).toLocaleString(undefined,{month:"long",year:"numeric"})}
function fsel(e){const d=e&&e.dataset;if(!d)return null;
 if(d.skip)return `[data-skip="${d.skip}"]`;
 if(d.tid)return `[data-tid="${d.tid}"][data-f="${d.f}"]`;
 if(d.id)return `[data-id="${d.id}"]`;
 if(d.rid)return `[data-rid="${d.rid}"][data-f="${d.f}"]`;
 if(d.ci)return `[data-ci="${d.ci}"][data-f="${d.f}"]`;
 if(d.ren!==undefined)return `[data-ren="${d.ren}"]`;return null}
const later=f=>setTimeout(f,0);
// An added purchase that was left empty is dropped, but only from an earlier day: today's may be one another device is still typing.
function dropEmpty(){const d=new Date().toISOString().slice(0,10);S.tx=S.tx.filter(t=>t.amt||t.desc||t.date>=d)}
const undo=[];let toastT=null;
function pushUndo(label,fn){undo.push({label,fn});if(undo.length>20)undo.shift();showToast()}
function showToast(){const el=$("toast");clearTimeout(toastT);if(!undo.length){el.hidden=true;return}
 const u=undo[undo.length-1];el.innerHTML=`<span>${esc(u.label)}</span><button id="undo">Undo</button>`;el.hidden=false;toastT=setTimeout(()=>{el.hidden=true},8000)}
function doUndo(){const u=undo.pop();if(!u)return;u.fn();save();render();showToast()}
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key=="z"&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName||"")&&undo.length){e.preventDefault();doUndo()}});
let pendingMonth=null,focusTid=null;
function addPurchase(){const id=Math.random().toString(36).slice(2),d=new Date().toISOString().slice(0,10);
 dropEmpty();
 S.tx.push({id,date:d,desc:"",amt:0,card:cardF!="all"?cardF:CL.find(c=>c!="Recurring")||"My card",cat:cat||"Other"});
 pendingMonth=d.slice(0,7);focusTid=id;save();render()}
function render(){
 const fs=fsel(document.activeElement);
 syncCats();if(!Array.isArray(S.recur))S.recur=[];
 $("cur").value=S.cur;syncCards();
 CL=[...new Set([...S.tx.map(t=>t.card),...S.recur.map(r=>r.card||"Recurring")])].sort((a,b)=>a.localeCompare(b));
 if(cardF!="all"&&!CL.includes(cardF))cardF="all";
 const rc=[...new Set(["Recurring",...CL])],copt=s=>rc.map(c=>`<option${c==s?" selected":""}>${esc(c)}</option>`).join("");
 ["imp","crd","rec","bak","acc"].forEach(p=>{$("p-"+p).hidden=panel!=p});
 document.querySelectorAll("[data-p]").forEach(b=>b.classList.toggle("on",b.dataset.p==panel));
 $("cardrules").innerHTML=CL.map((c,i)=>{const p=pct(c),n=S.tx.filter(t=>t.card==c).length;return `<div class="row"><input data-ci="${i}" data-f="name" value="${esc(c)}" style="width:170px" aria-label="Card name"><select data-ci="${i}" data-f="rule" aria-label="How this card counts">${ruleOpts(p,1)}</select>${[100,50,0].includes(p)?"":`<input data-ci="${i}" data-f="pct" type="number" min="0" max="100" value="${p}" style="width:70px" aria-label="Percent that counts"><span class="sub">%</span>`}<span class="sub">${n} purchase${n==1?"":"s"}</span></div>`}).join("")||`<span class="msg">No cards yet. Import or add a purchase first.</span>`;
 $("crdmsg").textContent=crdMsg;
 if(!$("irule").options.length)impRule();
 {const rv=$("rcard").value;$("rcard").innerHTML=copt(rc.includes(rv)?rv:"Recurring")}
 $("reclist").innerHTML=S.recur.map(r=>`<div class="row"><input data-rid="${r.id}" data-f="desc" value="${esc(r.desc)}" style="width:150px" aria-label="Description"><input data-rid="${r.id}" data-f="amt" type="number" step="0.01" value="${r.amt}" style="width:90px" aria-label="Amount"><input data-rid="${r.id}" data-f="day" type="number" min="1" max="28" value="${r.day}" style="width:60px" aria-label="Day of month"><select data-rid="${r.id}" data-f="card" aria-label="Card">${copt(r.card||"Recurring")}</select><button class="x" data-delrec="${r.id}" aria-label="Delete">✕</button></div>`).join("")||`<span class="msg">None yet.</span>`;
 $("cardlist").innerHTML=CL.map(c=>`<option value="${esc(c)}">`).join("");
 $("cardf").innerHTML='<option value="all">All cards</option>'+CL.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");$("cardf").value=cardF;
 const months=[...new Set(S.tx.map(t=>t.date.slice(0,7)))].sort().reverse();
 const cm=pendingMonth||$("month").value||"all";pendingMonth=null;
 $("month").innerHTML='<option value="all">All time</option>'+months.map(m=>`<option value="${m}">${mname(m)}</option>`).join("");
 $("month").value=months.includes(cm)||cm=="all"?cm:"all";
 const m=$("month").value;
 const base=S.tx.filter(t=>(m=="all"||t.date.startsWith(m))&&(cardF=="all"||t.card==cardF));
 const act=base.filter(t=>!t.skip),ign=base.filter(t=>t.skip),tot=act.reduce((a,t)=>a+v(t),0);
 const per={};act.forEach(t=>per[t.card]=(per[t.card]||0)+v(t));
 const shown=Object.keys(per).sort((a,b)=>per[b]-per[a]||a.localeCompare(b)),one=shown.length==1?rl(pct(shown[0])):"";
 $("big").innerHTML=`<div><div class="n">${fmt(tot)}</div><div class="l">spent${one?" · "+one:""}</div></div>`+
  (shown.length>1?shown.map(c=>`<div><div style="font-size:22px;font-weight:600">${fmt(per[c])}</div><div class="l">${esc(c)}${rl(pct(c))?" · "+rl(pct(c)):""}</div></div>`).join(""):"")+(ign.length?`<div class="l">Not counting ${ign.length} ignored (${fmt(ign.reduce((a,t)=>a+v(t),0))})</div>`:"");
 const by={};act.forEach(t=>by[t.cat]=(by[t.cat]||0)+v(t));
 const mx=Math.max(1,...Object.values(by));
 const bw=(c,x)=>`<span class="bw" data-c="${esc(c)}"><span class="bar"><i style="width:${Math.max(0,x)/mx*100}%;background:${COL[c]||"var(--mute)"}"></i></span><span class="amt">${fmt(x)}</span></span>`;
 const ord=S.cats.map((_,i)=>i);if(S.catSort!="manual")ord.sort((a,b)=>(by[S.cats[b]]||0)-(by[S.cats[a]]||0));
 $("cats").innerHTML=ord.map(i=>{const c=S.cats[i];return `<div class="cat${cat==c?" sel":""}" data-row="${i}"><span class="grip" title="Drag to reorder" aria-label="Drag to reorder">⋮⋮</span><input class="cn" data-ren="${i}" value="${esc(c)}" aria-label="Category name">${bw(c,by[c]||0)}<button class="x" data-delcat="${i}" aria-label="Delete category">✕</button></div>`}).join("")+(by.Other?`<div class="cat${cat=="Other"?" sel":""}"><span></span><span class="cn" style="padding:6px 8px">Other</span>${bw("Other",by.Other)}<span></span></div>`:"");
 $("catmsg").textContent=catMsg;
 document.querySelectorAll("[data-cs]").forEach(b=>b.classList.toggle("on",b.dataset.cs==(S.catSort=="manual"?"manual":"size")));
 $("chip").innerHTML=cat?`<button id="clearcat">${esc(cat)} ✕</button>`:"";
 const sk=S.sk||"date",sd=S.sd=="asc"?1:-1,val=t=>sk=="amt"?v(t):String(t[sk]||"").toLowerCase();
 const list=base.filter(t=>!cat||t.cat==cat).sort((a,b)=>{const x=val(a),y=val(b),c=typeof x=="number"?x-y:x.localeCompare(y);return (c*sd)||b.date.localeCompare(a.date)});
 const cols=[["date","Date"],["desc","Description"],["cat","Category"],["card","Card"],["amt","Amount"]];
 $("head").innerHTML=cols.map(([k,l])=>`<th${k=="amt"?' class="amt"':""} aria-sort="${sk==k?(sd==1?"ascending":"descending"):"none"}"><button data-sort="${k}">${l}${sk==k?(sd==1?" ▲":" ▼"):""}</button></th>`).join("")+`<th class="k">Ignore</th><th></th>`;
 $("rows").innerHTML=list.length?list.map(t=>{const os=ORDER.includes(t.cat)?ORDER:[...ORDER,t.cat],note=[t.amt<0?"refund":"",pct(t.card)==100?"":pct(t.card)?"counts "+fmt(v(t)):"not counted"].filter(Boolean).join(" · ");
  return `<tr${t.skip?' class="skip"':""}><td><input type="date" data-tid="${t.id}" data-f="date" value="${t.date}"></td>
  <td><input data-tid="${t.id}" data-f="desc" placeholder="Description" value="${esc(t.desc)}" style="min-width:190px"></td>
  <td><select data-id="${t.id}">${os.map(c=>`<option${c==t.cat?" selected":""}>${esc(c)}</option>`).join("")}</select></td>
  <td><input data-tid="${t.id}" data-f="card" list="cardlist" value="${esc(t.card||"")}" style="width:115px"></td>
  <td class="amt"><input type="number" step="0.01" data-tid="${t.id}" data-f="amt" value="${t.amt}">${note?`<small class="c amt">${note}</small>`:""}</td>
  <td class="k"><input type="checkbox" data-skip="${t.id}"${t.skip?" checked":""} aria-label="Ignore this purchase"></td><td class="k"><button class="x" data-del="${t.id}" aria-label="Delete">✕</button></td></tr>`}).join("")
  :`<tr><td colspan="7" class="empty">${S.tx.length?"Nothing matches these filters.":"No purchases yet. Press Import above, or load the sample data to try it out."}</td></tr>`;
 if(fs){const el=document.querySelector(fs);if(el&&el!==document.activeElement)el.focus()}
 if(focusCat!=null){const el=document.querySelector(`[data-ren="${focusCat}"]`);if(el){el.focus();el.select()}focusCat=null}
 if(focusTid){const el=document.querySelector(`[data-tid="${focusTid}"][data-f="desc"]`);if(el)el.focus();focusTid=null}
}
$("go").onclick=()=>{const p=parse($("paste").value);const m=$("msg");
 if(!p){m.textContent="Couldn’t find date, description and amount columns. Check the first row has headers like Date, Description, Amount.";return}
 if(!p.length){m.textContent="No purchases found in that text.";return}
 const card=$("card").value.trim()||"My card";S.cards[card]=+$("irule").value;
 const n=add(p,card);m.textContent=`Added ${n} purchase${n==1?"":"s"}${p.length-n?`, skipped ${p.length-n} already saved`:""}.`;$("paste").value="";$("file").value="";render()};
$("sample").onclick=()=>{const a=[["2026-11-02","Shufersal Deal Ramat Gan",312.4],["2026-11-03","Wolt Tel Aviv",89],["2026-11-04","Pango Parking",24],["2026-11-05","Netflix.com",54.9],["2026-11-06","Super-Pharm",67.5],["2026-11-08","Aroma Cafe",38],["2026-11-09","Zara",259],["2026-10-28","Rami Levy",420.1],["2026-10-30","Cinema City",96],["2026-10-21","Delek Fuel",250]];
 const b=[["2026-11-01","Arnona Tel Aviv",640],["2026-11-03","Rami Levy",488.3],["2026-11-07","Electric IEC",402],["2026-11-08","Wolt Dinner",142],["2026-11-10","Booking.com Hotel",1380],["2026-10-29","Yochananof",276.8],["2026-10-25","Partner Internet",99]];
 if(S.cards["Joint card"]==null)S.cards["Joint card"]=50;
 add(a.map(x=>({date:x[0],desc:x[1],amt:x[2]})),"My Visa");add(b.map(x=>({date:x[0],desc:x[1],amt:x[2]})),"Joint card");render()};
$("card").oninput=impRule;
function recGen(){
 if(!Array.isArray(S.recur))S.recur=[];if(!S.recDone)S.recDone={};
 delete S.recSeeded;
 const today=new Date().toISOString().slice(0,10),nowM=today.slice(0,7);
 S.recur.forEach(r=>{let m=r.start,g=0;
  while(m&&m<=nowM&&g++<120){const k=r.id+":"+m,dt=m+"-"+String(Math.min(r.day||1,28)).padStart(2,"0");
   if(!S.recDone[k]&&dt<=today){S.recDone[k]=1;S.tx.push({id:"rec-"+k,date:dt,desc:r.desc,amt:r.amt,card:r.card||"Recurring",cat:guess(r.desc)})}
   const[y,mo]=m.split("-").map(Number);m=mo==12?(y+1)+"-01":y+"-"+String(mo+1).padStart(2,"0")}});
 save()}
function addRec(){const d=$("rdesc").value.trim(),a=parseFloat($("ramt").value);if(!d||!a)return;
 S.recur.push({id:"r"+Math.random().toString(36).slice(2,8),desc:d,amt:a,day:Math.min(28,Math.max(1,parseInt($("rday").value)||1)),card:$("rcard").value||"Recurring",start:new Date().toISOString().slice(0,7)});
 $("rdesc").value="";$("ramt").value="";recGen();render()}
function renameCat(i,nv){nv=nv.trim();const old=S.cats[i];catMsg="";
 if(!nv||nv==old)return render();
 if(nv=="Other"||S.cats.includes(nv)){catMsg="That name is already used.";return render()}
 S.cats[i]=nv;if(S.hue)S.hue[nv]=S.hue[old];S.tx.forEach(t=>{if(t.cat==old)t.cat=nv});
 for(const k in S.rules)if(S.rules[k]==old)S.rules[k]=nv;
 for(const b in CATS)if((S.alias[b]||b)==old)S.alias[b]=nv;
 if(cat==old)cat=nv;save();render()}
function addCat(){let n="New category",i=2;while(S.cats.includes(n))n="New category "+i++;
 S.cats.push(n);focusCat=S.cats.length-1;catMsg="";save();render()}
function delCat(i){const old=S.cats[i],oAlias={...S.alias},oRules={},oTx=S.tx.filter(t=>t.cat==old).map(t=>t.id);for(const k in S.rules)if(S.rules[k]==old)oRules[k]=old;S.cats.splice(i,1);
 S.tx.forEach(t=>{if(t.cat==old)t.cat="Other"});
 for(const k in S.rules)if(S.rules[k]==old)delete S.rules[k];
 for(const b in CATS)if((S.alias[b]||b)==old)S.alias[b]="Other";
 if(cat==old)cat=null;catMsg="";pushUndo("Deleted category “"+old+"”",()=>{S.cats.splice(Math.min(i,S.cats.length),0,old);S.alias=oAlias;Object.assign(S.rules,oRules);S.tx.forEach(t=>{if(oTx.includes(t.id))t.cat=old})});save();render()}
let wp=false;$("wipe").onclick=()=>{if(!wp){wp=true;$("wipe").textContent="Press again to delete everything";$("wmsg").textContent="This removes all purchases, recurring items and learned corrections.";setTimeout(()=>{wp=false;$("wipe").textContent="Delete all data";$("wmsg").textContent=""},6000);return}
 const snap={tx:S.tx,rules:S.rules,recur:S.recur,recDone:S.recDone};S.tx=[];S.rules={};S.recur=[];S.recDone={};pushUndo("Deleted all data",()=>{S.tx=snap.tx.concat(S.tx);S.rules=Object.assign({},snap.rules,S.rules);S.recur=snap.recur.concat(S.recur);S.recDone=Object.assign({},snap.recDone,S.recDone)});save();wp=false;cat=null;$("wipe").textContent="Delete all data";$("wmsg").textContent="All clear.";render()};
$("bkshow").onclick=()=>{$("bk").value=JSON.stringify(S);$("bk").select();let ok=false;try{ok=document.execCommand("copy")}catch(e){}$("bkmsg").textContent=ok?"Backup copied. Paste it somewhere safe.":"Select all the text and copy it."};
$("bkrestore").onclick=()=>{let o=null;try{o=clean(JSON.parse($("bk").value))}catch(e){}if(!o)return $("bkmsg").textContent="That doesn’t look like a backup.";S=o;syncCards();save();render();$("bkmsg").textContent="Restored "+S.tx.length+" purchases."};
// Download my data / Restore from file (Account panel). The file holds everything in S. Restoring replaces what is saved, after a second press.
$("dl").onclick=()=>{const a=document.createElement("a"),u=URL.createObjectURL(new Blob([JSON.stringify({app:"spend-sorted",v:1,saved:new Date().toISOString(),data:S})],{type:"application/json"}));
 a.href=u;a.download="spend-backup-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);$("rsmsg").textContent="Saved to your downloads. Keep the file somewhere private."};
let rsPend=null,rsT=null;
function rsReset(){rsPend=null;clearTimeout(rsT);$("rsbtn").textContent="Restore from file";$("rsfile").value=""}
$("rsbtn").onclick=()=>{if(!rsPend)return $("rsfile").click();const old=S;S=rsPend;rsReset();syncCards();cat=null;cardF="all";
 pushUndo("Restored from file",()=>{S=old});save();render();$("rsmsg").textContent="Restored "+S.tx.length+" purchases."};
$("rsfile").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
 r.onload=()=>{let o=null;try{o=JSON.parse(r.result);o=clean(o&&o.data||o)}catch(x){o=null}rsReset();
  if(!o)return $("rsmsg").textContent="That file isn’t a Spend, sorted backup.";
  rsPend=o;$("rsbtn").textContent="Replace everything with this file ("+o.tx.length+" purchases)";$("rsmsg").textContent="This replaces all the data in your account.";
  rsT=setTimeout(()=>{rsReset();$("rsmsg").textContent=""},20000)};
 r.readAsText(f)};
let drag=null;
document.addEventListener("pointerdown",e=>{const h=e.target.closest&&e.target.closest(".grip");if(!h)return;
 const box=$("cats"),rows=[...box.querySelectorAll(".cat[data-row]")],row=h.closest(".cat"),from=rows.indexOf(row);if(from<0)return;
 const tops=rows.map(r=>r.getBoundingClientRect().top),step=rows.length>1?tops[1]-tops[0]:row.offsetHeight;
 drag={rows,row,from,to:from,step,y:e.clientY,moved:false};
 try{h.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
document.addEventListener("pointermove",e=>{if(!drag)return;const d=drag;
 if(!d.moved){if(Math.abs(e.clientY-d.y)<5)return;d.moved=true;d.row.classList.add("lift")}
 const n=d.rows.length,dy=Math.max(-d.from*d.step,Math.min((n-1-d.from)*d.step,e.clientY-d.y));
 d.row.style.transform=`translateY(${dy}px) scale(1.02)`;
 d.to=Math.max(0,Math.min(n-1,Math.round(d.from+dy/d.step)));
 d.rows.forEach((r,k)=>{if(r===d.row)return;r.style.transform=d.from<d.to&&k>d.from&&k<=d.to?`translateY(${-d.step}px)`:d.from>d.to&&k>=d.to&&k<d.from?`translateY(${d.step}px)`:""})});
function endDrag(){if(!drag)return;const d=drag;drag=null;if(!d.moved)return;
 d.row.classList.remove("lift");d.row.style.transform=`translateY(${(d.to-d.from)*d.step}px)`;
 setTimeout(()=>{const arr=d.rows.map(r=>S.cats[+r.dataset.row]);
  if(arr.length==S.cats.length&&arr.every(Boolean)){arr.splice(d.to,0,arr.splice(d.from,1)[0]);S.cats=arr;S.catSort="manual";save()}render()},180)}
document.addEventListener("pointerup",endDrag);document.addEventListener("pointercancel",endDrag);
document.addEventListener("click",e=>{const t=e.target;
 if(t.dataset.cs){S.catSort=t.dataset.cs;save();render()}
 if(t.dataset.p){panel=panel==t.dataset.p?null:t.dataset.p;render();return}
 const b=t.closest&&t.closest("[data-c]");if(b){cat=cat==b.dataset.c?null:b.dataset.c;render()}
 if(t.id=="clearcat"){cat=null;render()}
 if(t.id=="addcat")addCat();
 if(t.id=="addp")addPurchase();
 if(t.id=="radd")addRec();
 if(t.dataset.delcat!==undefined)delCat(+t.dataset.delcat);
 if(t.dataset.delrec){const i=S.recur.findIndex(x=>x.id==t.dataset.delrec);if(i>=0){const it=S.recur[i];S.recur.splice(i,1);pushUndo("Deleted recurring “"+it.desc.slice(0,28)+"”",()=>{S.recur.splice(Math.min(i,S.recur.length),0,it)})}save();render()}
 if(t.dataset.del){const i=S.tx.findIndex(x=>x.id==t.dataset.del);if(i>=0){const it=S.tx[i];S.tx.splice(i,1);pushUndo("Deleted “"+(it.desc||"purchase").slice(0,28)+"”",()=>{S.tx.splice(Math.min(i,S.tx.length),0,it)})}save();render()}
 if(t.id=="undo")doUndo();
 const sb=t.closest&&t.closest("[data-sort]");if(sb){const c=sb.dataset.sort;if((S.sk||"date")==c)S.sd=(S.sd||"desc")=="asc"?"desc":"asc";else{S.sk=c;S.sd=(c=="amt"||c=="date")?"desc":"asc"}save();render()}});
document.addEventListener("change",e=>{const t=e.target;
 if(t.dataset.skip){const x=S.tx.find(y=>y.id==t.dataset.skip);if(x){if(t.checked)x.skip=1;else delete x.skip;save();render()}}
 else if(t.dataset.tid){const x=S.tx.find(y=>y.id==t.dataset.tid),f=t.dataset.f;
  if(x){let val=t.value;
   if(f=="amt"){val=parseFloat(val);if(!val)return later(render)}
   if(f=="date"&&!val)return later(render);
   if(f=="desc"&&!val.trim())return later(render);
   x[f]=(f=="desc"||f=="card")?val.trim():val;if(f=="desc"&&x.cat=="Other")x.cat=guess(x.desc);save();later(render)}}
 else if(t.dataset.rid){const r=S.recur.find(x=>x.id==t.dataset.rid),f=t.dataset.f;
  if(r){r[f]=f=="amt"?(parseFloat(t.value)||0):f=="day"?Math.min(28,Math.max(1,parseInt(t.value)||1)):t.value;recGen();save();later(render)}}
 else if(t.dataset.ren!==undefined){const i=+t.dataset.ren,nv=t.value;later(()=>renameCat(i,nv))}
 else if(t.dataset.id){const x=S.tx.find(y=>y.id==t.dataset.id);if(x){x.cat=t.value;const k=key(x.desc);if(k){S.rules[k]=t.value;S.tx.forEach(y=>{if(key(y.desc)==k)y.cat=t.value})}save();later(render)}}
 else if(t.id=="month")render();
 else if(t.dataset.ci){const c=CL[+t.dataset.ci],f=t.dataset.f;if(c==null)return;
  if(f=="name"){const nv=t.value.trim();later(()=>renameCard(c,nv))}
  else{S.cards[c]=t.value=="c"?25:Math.min(100,Math.max(0,parseFloat(t.value)||0));save();later(render)}}
 else if(t.id=="cardf"){cardF=t.value;render()}
 else if(t.id=="cur"){S.cur=t.value||"₪";save();render()}
 else if(t.id=="file"&&t.files[0])readFile(t.files[0])});
// Installable app: sw.js keeps a copy of the app's files so it opens offline (rules at the top of sw.js).
// APPV is the version this page was loaded as (stamped by tools/stamp.mjs). A newer sw.js that finishes installing is told
// our version: if they match it takes over quietly, otherwise it answers "update" and the Reload notice is shown.
// On localhost the worker is off (so edits always show) unless the address has ?sw=1.
const APPV=new URL(document.currentScript.src).searchParams.get("v")||"dev";
(function(){const sw=navigator.serviceWorker;if(!sw)return;
 if(LOCALHOST&&!/[?&]sw=1/.test(location.search)){sw.getRegistrations().then(a=>a.forEach(r=>r.unregister())).catch(()=>{});
  if(window.caches)caches.keys().then(ks=>ks.forEach(k=>{if(k.startsWith("spend-"))caches.delete(k)})).catch(()=>{});return}
 let reg=null,go=false;
 const hello=w=>w.postMessage({type:"hello",v:APPV});
 const watch=w=>{if(!w)return;if(w.state=="installed")hello(w);else w.addEventListener("statechange",()=>{if(w.state=="installed")hello(w)})};
 sw.addEventListener("message",e=>{if(e.data&&e.data.type=="update")$("upd").hidden=false});
 sw.addEventListener("controllerchange",()=>{if(go)location.reload()});
 $("updgo").onclick=()=>{go=true;$("updgo").disabled=true;if(reg&&reg.waiting)reg.waiting.postMessage({type:"skip"});else location.reload()};
 const first=!sw.controller;
 sw.register("sw.js").then(r=>{reg=r;if(r.waiting)hello(r.waiting);watch(r.installing);
  r.addEventListener("updatefound",()=>watch(r.installing));
  // An installed app can stay open for days, so look for a new version each time it comes back to the front.
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)r.update().catch(()=>{})});
  // First visit: fonts and the Firebase SDK loaded before the worker existed. Hand over their addresses, again later for a slow line.
  if(first)sw.ready.then(x=>[3000,15000,45000].forEach(ms=>setTimeout(()=>x.active&&x.active.postMessage({type:"warm",urls:performance.getEntriesByType("resource").map(e=>e.name)}),ms)))}).catch(()=>{})})();
function start(){syncCards();dropEmpty();recGen();S.tx.forEach(t=>{if(t.cat=="Other")t.cat=guess(t.desc)});save();
 panel=S.tx.some(t=>!String(t.id).startsWith("rec-"))?null:"imp";
 $("bakbtn").hidden=C.on;$("accbtn").hidden=!C.on;$("who").textContent=C.user?C.user.email:"";
 $("boot").hidden=true;$("app").hidden=false;render();stat()}
