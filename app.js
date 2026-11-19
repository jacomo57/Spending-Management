// Theme (this device only, not saved with the data): "auto" follows the device, or "light" / "dark". The browser bar colour follows too.
const THEMES=["auto","light","dark"],TCOL={light:"#EEF3FC",dark:"#0E1626"};
function themeGet(){try{const t=localStorage.getItem("spend-theme");return THEMES.includes(t)?t:"auto"}catch(e){return"auto"}}
function themeSet(t){try{if(t=="auto")localStorage.removeItem("spend-theme");else localStorage.setItem("spend-theme",t)}catch(e){}themeApply(t)}
function themeApply(t){const r=document.documentElement;if(t=="auto")r.removeAttribute("data-theme");else r.setAttribute("data-theme",t);
 document.querySelectorAll("meta[name=theme-color]").forEach(m=>{if(m.dataset.auto===undefined)m.dataset.auto=m.content;m.content=t=="auto"?m.dataset.auto:TCOL[t]});
 const b=document.getElementById("themeb");if(b)b.textContent="Theme: "+t[0].toUpperCase()+t.slice(1)}
themeApply(themeGet());
// Keyword groups, checked in this order; the first group with a matching word wins. A category may appear more than once
// (the two extra groups hold what used to be "Bills & home" and "House stuff"), so the order of the words never changed.
const CATS=[
["Groceries",["סופרמרקט","חצי חינם","סטופמרקט","מכולת","מינימרקט","ירקות","פירות","קצביית","מעדניית","shufersal","שופרסל","rami levy","רמי לוי","victory","ויקטורי","yochananof","יוחננוף","osher ad","אושר עד","mega","tiv taam","טיב טעם","supermarket","grocery","market","אלונית","am:pm","ampm","tesco","aldi","lidl","carrefour","whole foods","trader joe"]],
["Eating out",["מסעדת","בייקרי","בית קפה","מאפיית","מאפיה","פיצרייה","גלידה","שווארמה","חומוס","בורגר","סושי","קונדיטוריה","wolt","וולט","10bis","תן ביס","cafe","קפה","coffee","aroma","ארומה","restaurant","מסעדה","pizza","פיצה","burger","sushi","bar ","pub","mcdonald","starbucks","falafel","פלאפל","bakery","מאפה","doordash","uber eats","deliveroo","grubhub","diner","bistro","eatery"]],
["Transport",["מונית","תחנת דלק","חניון","אוטובוס","מוסך","gett","uber","pango","פנגו","cellopark","סלופארק","fuel","delek","דלק","paz","פז","sonol","סונול","rav kav","רב קו","israel railways","רכבת","bus","taxi","parking","חניה","shell","bp ","lyft","metro","toll","כביש 6"]],
["Rent & payments",["electric","חשמל","iec","water","מים","arnona","ארנונה","gas ","גז","internet","bezeq","בזק","partner","פרטנר","cellcom","סלקום","hot ","utility","comcast","verizon"]],
["Rent & payments",["rent ","שכירות","שכר דירה","ועד בית","mortgage","משכנתא","loan","הלוואה","הוראת קבע","העברה","transfer","paybox","פייבוקס","paypal","ביטוח לאומי","מס הכנסה","מע״מ"]],
["Insurance",["insurance","ביטוח","הראל","מגדל","הפניקס","מנורה","איילון","שומרה","הכשרה","harel","migdal","phoenix","menora","ayalon","clal","aig","geico","allstate","state farm"]],
["Shopping",["ikea","איקאה","ace hardware","אייס","home center","הום סנטר","homecenter","zara home","זארה הום","hardware","חומרי בניין","טמבור","tambour","אינסטלטור","plumber","מנעולן","locksmith","ניקיון","מנקה","cleaning","רהיט","furniture","מטבח","גינה","home depot","bed bath"]],
["Health",["בית מרקחת","פארם","שיניים","אופטיקה","וטרינר","פיזיותרפיה","מרפאה","pharm","סופר פארם","super-pharm","pharmacy","מכבי","maccabi","clalit","כללית","meuhedet","מאוחדת","dental","רופא","doctor","clinic","קליניקה","cvs","walgreens","optic","שיער","תספורת","מספרה","ספר ","מספרת","קוסמטיק","קוסמטיקאית","מניקור","פדיקור","ציפורניים","לק ג'ל","עיסוי","מסג'","הסרת שיער","לייזר","כירופרקט","דיקור","נטורופת","פסיכולוג","טיפול","בדיקות","מעבדה","אורתודונט","רנטגן","סופרפארם","בי.די.אי","hair ","haircut","barber","salon","beauty","nails","manicure","pedicure","spa ","massage","physio","chiropract","therapy","therapist","psycholog","dentist","orthodont","eye ","skincare","cosmetic"]],
["Shopping",["פרח","מקס סטוק","flower","florist","מתנה","gift","בגדי","נעלי","הנעלה","אופנה","ספרים","סטימצקי","ריהוט","צעצועי","amazon","aliexpress","ebay","zara","h&m","castro","קסטרו","fox","פוקס","renuar","shein","next","terminal x","ksp","ivory","איבורי","bug","nike","adidas","mango","golf","target","walmart","etsy","apple store","best buy"]],
["Fun & travel",["קולנוע","חדר כושר","כושר","ספא","סטודיו","cinema","סינמה","cinema city","yes planet","netflix","spotify","hotel","מלון","booking","airbnb","el al","אל על","israir","arkia","flight","ryanair","wizz","easyjet","ticket","eventim","leaan","museum","theater","תיאטרון","gym","הולמס","holmes","concert","steam","playstation","xbox"]],
["Subscriptions",["subscription","apple.com/bill","icloud","google one","google *","youtube","disney","hbo","prime video","chatgpt","openai","anthropic","claude","dropbox","adobe","notion","microsoft","patreon","audible","membership"]],
];
// Icons of the starting categories (by name; a category you add or rename has none). ic(c) -> "🛒 " or "".
const ICON={Groceries:"🛒","Eating out":"🍽️",Transport:"🚌","Rent & payments":"🏠",Insurance:"🛡️",Shopping:"🛍️",Health:"💊","Fun & travel":"🎭",Subscriptions:"🔁",Other:"📦"};
// S.icon[category] is the icon you picked ("" = none); without one the starting categories use ICON.
const ic=c=>{const m=S.icon&&S.icon[c],e=m!=null?m:ICON[c];return e?e+" ":""};
const PICK="🛒 🍽️ ☕ 🍔 🚌 🚗 ⛽ 🏠 💡 📱 🛡️ 🛍️ 👕 🎁 💊 🏥 🐾 🎭 🎬 ✈️ 🏖️ 🔁 🎓 📚 💪 💇 👶 🔧 💰 📦".split(" ");
let icOpen=null;
// The default categories of a new account, in the order they are offered.
const BASE=[...new Set(CATS.map(c=>c[0]).reverse())].reverse();
let ORDER=[];
const COL=Object.create(null);
// Maps keyed by a name that the user or a statement supplies (merchant, card, category) have no prototype, so a name like
// "constructor" or "__proto__" is an ordinary key. Saved data is JSON, which gives plain objects back: fixMaps() rebuilds the
// maps after every load, and own() drops a "__proto__" key from a loaded object before it is copied into S.
const bare=o=>Object.assign(Object.create(null),o&&typeof o=="object"&&!Array.isArray(o)?o:null);
const own=o=>{if(o&&typeof o=="object")delete o["__proto__"];return o};
function fixMaps(){for(const k of["rules","cards","recDone","hue","alias","icon"])if(!S[k]||typeof S[k]!="object"||Object.getPrototypeOf(S[k]))S[k]=bare(S[k]);
 const b=S.budget;if(b&&typeof b=="object"&&b.cats&&Object.getPrototypeOf(b.cats))b.cats=bare(b.cats)}
let S={tx:[],rules:{},cur:"₪"};
let HOW="exp",rpT="month",rpN=12,FOUND=[],rp=false,rpM=null,rpL=true,rpS=false,cmp=false,cmA=null,cmB=null,q="",cardF="all",CL=[],crdMsg="",cat=null,catMsg="",panel=null,focusCat=null,showAll=false,catAll=false,catTop=[];
// Accounts + cloud sync (Firebase): see docs/backend.md. The cloud code is in cloud.js.
// FB_REAL = the real project's firebaseConfig (public by design; firestore.rules is the protection).
// If it is set to null the site falls back to local-only mode (localStorage, no sign-in).
// On localhost the page talks to the local Firebase emulators only, never the real project. Add ?local=1 for local-only mode.
const FB_REAL={apiKey:"AIzaSyBeXWekBAG26oele2v7hAMDmLnIDW6D_uk",authDomain:"spending-management-608d5.firebaseapp.com",projectId:"spending-management-608d5",storageBucket:"spending-management-608d5.firebasestorage.app",messagingSenderId:"206144783820",appId:"1:206144783820:web:fd52344da11667da054969"};
const LOCALHOST=/^(localhost|127\.0\.0\.1)$/.test(location.hostname),LOCALONLY=LOCALHOST&&/[?&]local=1/.test(location.search);
const EMU=LOCALHOST&&!LOCALONLY;
const FBC=EMU?{apiKey:"demo-key",authDomain:"demo-spend.firebaseapp.com",projectId:"demo-spend"}:LOCALONLY?null:FB_REAL;
const C={on:!!FBC,un:{},ready:false,user:null,syn:{settings:null,months:bare()},pend:0,err:"",unsub:[],mode:null};
if(!C.on)try{const r=localStorage.getItem("spend-v1");if(r)S=Object.assign(S,own(JSON.parse(r)))}catch(e){}
function save(){if(C.on)return cloudSave();try{localStorage.setItem("spend-v1",JSON.stringify(S))}catch(e){}}
// Card rules: S.cards[name] = percent of that card's purchases that counts (100 full, 50 half, 0 not counted).
const pct=c=>S.cards[c]==null?100:S.cards[c];
// Card names ignore upper and lower case: a card typed as "max" is the card "MAX" you already have (the one with a rule, else the first).
const cardNames=()=>[...new Set([...Object.keys(S.cards),...S.tx.filter(t=>!t.inc).map(t=>t.card),...S.recur.filter(r=>!r.inc).map(r=>r.card||"Recurring")])].filter(Boolean);
const sameCard=(a,b)=>String(a).trim().toLowerCase()==String(b).trim().toLowerCase();
function canon(n){n=String(n||"").trim();const all=cardNames().filter(c=>sameCard(c,n));return all.length?all.find(c=>S.cards[c]!=null)||all[0]:n}
// Income (asked 2026-11-15). A row with inc:1 is money that came in; its amount is stored positive and no card rule applies to it.
//  - no category (cat ""): plain income (salary, a tax refund). Counts toward "In", never toward spending.
//  - with a category: a payback (the partner returns part of a purchase). Lowers that category and "Spent" in full; not part of "In".
// v(t) is what one row adds to "Spent". calc() is the one definition of the numbers; the summary, budgets, comparisons and reports
// must all use it. calc(rows) -> {spent, inc, back, by:{category:spent}, per:{card:spent}}; ignored rows are left out.
const v=t=>t.inc?(t.cat?-t.amt:0):t.amt*pct(t.card)/100;
// Split (asked 2026-11-16): t.split = [{cat,amt}] moves part of a purchase's amount into other categories; the rest stays in t.cat.
// The amounts are before the card rule and have the purchase's sign. A split changes only the per-category numbers: v(t), Spent
// and the per-card totals stay the same. parts(t) -> [[category, amount]]; without a split that is just [[t.cat, t.amt]].
const sp=t=>!t.inc&&Array.isArray(t.split)?t.split:[];
const parts=t=>{const s=sp(t).filter(p=>p.amt);return[[t.cat,t.amt-s.reduce((a,p)=>a+p.amt,0)],...s.map(p=>[p.cat,p.amt])]};
const has=(t,c)=>parts(t).some(p=>p[0]==c),catLabel=t=>[...new Set(parts(t).map(p=>p[0]))].join(" + ");
// A split must fit inside the amount; when the amount is edited so that it no longer does, the split is dropped.
function fitSplit(x){if(x.split==null)return;const s=x.amt<0?-1:1;
 if(x.inc||!Array.isArray(x.split)||!x.split.length||x.split.some(p=>p.amt*s<0)||x.split.reduce((a,p)=>a+Math.abs(p.amt),0)>Math.abs(x.amt)+1e-9)delete x.split}
// Tags: #words typed in a purchase's note; nothing extra is saved. tags(t) -> lower-case names without the #.
// tagSums(rows) -> [[tag, spent]] by v(t), largest first, ignored rows left out.
const tags=t=>t.note?[...new Set((String(t.note).toLowerCase().match(/#[\p{L}\p{N}_-]+/gu)||[]).map(x=>x.slice(1)))]:[];
function tagSums(rows){const o=bare();rows.forEach(t=>{if(!t.skip)tags(t).forEach(g=>{o[g]=(o[g]||0)+v(t)})});return Object.keys(o).map(g=>[g,o[g]]).sort((x,y)=>y[1]-x[1]||x[0].localeCompare(y[0]))}
function calc(list){const o={spent:0,inc:0,back:0,by:bare(),per:bare()};
 list.forEach(t=>{if(t.skip)return;const x=v(t);o.spent+=x;
  if(!t.inc){parts(t).forEach(([c,a])=>{o.by[c]=(o.by[c]||0)+a*pct(t.card)/100});o.per[t.card]=(o.per[t.card]||0)+x}
  else if(t.cat){o.back+=t.amt;o.by[t.cat]=(o.by[t.cat]||0)+x}else o.inc+=t.amt});
 return o}
// Budgets: S.budget = {total, cats:{name:amount}}, per month, saved with the settings. 0 or missing = no budget.
const bud=()=>{if(!S.budget||typeof S.budget!="object")S.budget={total:0,cats:bare()};if(!S.budget.cats)S.budget.cats=bare();return S.budget};
// What a row looked like when it was imported. Kept in t.src once the row is edited, so importing the same file again still skips it.
const rid=x=>[x.date,x.desc,x.amt].join("|")+(x.inc?"|i":"");
const rl=p=>p==100?"":p==50?"counts at half":p==0?"not counted":"counts at "+p+"%";
const ruleOpts=(p,custom)=>[[100,"Counts in full"],[50,"Counts at half"],[0,"Not counted"]].map(([x,l])=>`<option value="${x}"${p==x?" selected":""}>${l}</option>`).join("")+(![100,50,0].includes(p)?`<option value="${p}" selected>Custom: ${p}%</option>`:custom?`<option value="c">Custom %…</option>`:"");
function impRule(){$("irule").innerHTML=ruleOpts(pct(canon($("card").value)||"My card"))}
function renameCard(old,nv){crdMsg="";if(!nv||nv==old)return render();
 if(CL.some(c=>c!=old&&sameCard(c,nv))){crdMsg="That name is already used.";return render()}
 S.tx.forEach(t=>{if(t.card==old)t.card=nv});S.recur.forEach(r=>{if(!r.inc&&(r.card||"Recurring")==old)r.card=nv});
 if(S.cards[old]!=null){S.cards[nv]=S.cards[old];delete S.cards[old]}if(cardF==old)cardF=nv;if(S.defCard==old)S.defCard=nv;save();render()}
function syncCats(){fixMaps();if(!Array.isArray(S.cats))S.cats=BASE.slice();ORDER=[...S.cats,"Other"];S.cats.forEach(c=>{if(S.hue[c]==null)S.hue[c]=(Object.keys(S.hue).length*41+150)%360});ORDER.forEach(c=>COL[c]=c=="Other"?"hsl(150 8% 55%)":`hsl(${S.hue[c]} 55% 46%)`)}
syncCats();
const $=id=>document.getElementById(id);
// Today in the user's own time zone (toISOString is UTC, which is a day behind in Israel from midnight to about 3am).
const ymd=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
// A new id for a purchase or recurring item: the time plus random letters and digits (ids must match /^[\w:.-]+$/).
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,10);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const key=d=>d.toLowerCase().replace(/[\d*#\/\\.\-_]+/g," ").replace(/\s+/g," ").trim().slice(0,24);
const cur=b=>S.alias[b]||b;
function tgt(c){let a=cur(c);if(!S.cats.includes(a)&&S.cats.includes(c))a=c;return S.cats.includes(a)?a:"Other"}
// The issuer's own category column (Max has one). Used only when the merchant itself is not recognized.
const HINT=[["מזון","Groceries"],["מסעד","Eating out"],["תחבורה","Transport"],["דלק","Transport"],["רפואה","Health"],["ביטוח","Insurance"],["פנאי","Fun & travel"],["טיסות","Fun & travel"],["תיירות","Fun & travel"],["אופנה","Shopping"],["טיפוח","Shopping"],["מחשבים","Shopping"],["ספרים","Shopping"],["עיצוב הבית","Shopping"],["עירייה","Rent & payments"],["תקשורת","Rent & payments"],["העברת","Rent & payments"]];
function guess(d,hint){const k=key(d);if(S.rules[k])return S.rules[k];const l=d.toLowerCase();
 for(const[c,ws]of CATS)if(ws.some(w=>l.includes(w)))return tgt(c);
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
  if(dt&&a&&/\D{3}/.test(desc))out.push({date:dt,desc,amt:/refund|reversal|זיכוי/i.test(l)||/^(\(.*\)|-.*)$/.test(t[0].trim())?-a:a})});
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
// A file where most amounts are negative is a bank-style export (spending shown as minus): its positive rows come back as income (inc:1).
// Not applied to a card statement (its amount column is a "charged" one) or to fewer than 3 rows, where a minus is a refund.
function parse(text){const lines=text.split(/\r?\n/).filter(l=>l.trim());if(!lines.length)return[];
 const top=lines.slice(0,8),cnt=x=>(top.join("\n").match(new RegExp(x=="\t"?"\t":"\\"+x,"g"))||[]).length;
 const d=cnt("\t")>=2*top.length?"\t":[";","\t",","].map(x=>[x,cnt(x)]).sort((a,b)=>b[1]-a[1])[0][0];
 const out=table(lines.map(l=>splitLine(l,d)))||loose(text);
 if(!out.card&&out.length>2&&out.filter(x=>x.amt<0).length>out.length/2)out.forEach(x=>{if(x.amt<0)x.amt=-x.amt;else x.inc=1});
 return out}
// Identical rows inside one file are all kept (two coffees on the same day are two purchases).
// When a file is imported again, a row is skipped only for as many identical copies as are already saved on that card.
// A saved row is matched by how it looked when imported (t.src), so editing it does not bring it back; an edited row also
// matches by what it says now (a hand-typed row that was corrected to the statement's values). Returns [purchases added, income added].
// A purchase added from the phone inbox is marked t.auto=1 ("not on a statement yet"). When a statement row with the
// same amount arrives within 2 days of it (same card first, then any card), the two are one purchase: the saved row takes the
// statement's date, description and card, keeps its category, note and split, and loses the mark. Third number returned = rows matched.
function add(list,card,ccy){const id=rid,have=bare(),alt=bare(),pend=S.tx.filter(t=>t.auto&&!t.inc),far=(a,b)=>Math.abs(new Date(a)-new Date(b))/864e5;let n=0,ni=0,nm=0;
 S.tx.forEach(t=>{if(t.card==card&&!t.auto){const k=t.src||id(t);have[k]=(have[k]||0)+1;if(t.src){const c=id(t);alt[c]=(alt[c]||0)+1}}});
 list.forEach(x=>{const k=id(x);if(have[k]>0){have[k]--;return}if(alt[k]>0){alt[k]--;return}
  if(!x.inc){const ok=pend.filter(t=>Math.abs(t.amt-x.amt)<.005&&far(t.date,x.date)<=2).sort((a,b)=>(b.card==card)-(a.card==card)||far(a.date,x.date)-far(b.date,x.date)),t=ok[0];
   if(t){pend.splice(pend.indexOf(t),1);if(t.desc&&t.desc!=x.desc&&!t.note)t.note=t.desc.slice(0,500);if(t.cat=="Other")t.cat=guess(x.desc,x.hint);
    t.date=x.date;t.desc=x.desc;t.amt=x.amt;t.card=card;delete t.auto;nm++;return}}
  const t={id:uid(),date:x.date,desc:x.desc,amt:x.amt,card,cat:x.inc?"":guess(x.desc,x.hint)};
  if(x.inc){t.inc=1;ni++}else{n++;if(ccy&&ccy!=homeC()){t.fx={c:ccy,a:x.amt,r:0};t.src=id(x);t.amt=0}}S.tx.push(t)});
 save();return[n,ni,nm]}
// Phone inbox (cloud.js listens; docs/backend.md): an item is short texts sent by a phone automation: amt, desc, card, date, or the
// raw title and text of a payment notification, which are read here. Nothing is dropped: an item without a readable amount
// becomes a row with amount 0 so it can be fixed by hand. inboxAdd([[id,data]]) -> rows added; an id already saved is skipped.
function inboxRow(id,d){const s=k=>typeof d[k]=="string"?d[k].replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,"").trim():"",
  num=x=>{const n=parseFloat(String(x).replace(/,/g,"").replace(/[^\d.-]/g,""));return isFinite(n)?Math.round(n*100)/100:0},
  title=s("title"),text=s("text"),all=(title+" "+text).trim(),N="([\\d,]+(?:\\.\\d{1,2})?)",
  cur=all.match(new RegExp("(?:₪|ILS|NIS)\\s*"+N))||all.match(new RegExp(N+"\\s*(?:₪|ILS|NIS|ש\"ח|ש״ח)")),any=cur||all.match(/([\d,]+\.\d{2})/),
  amt=s("amt")?num(s("amt")):any?num(any[1]):0,desc=(s("desc")||title||text).slice(0,200),
  dm=s("date").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/),de=s("date").match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/),
  date=dm?dm[1]+"-"+p2(dm[2])+"-"+p2(dm[3]):de?de[3]+"-"+p2(de[2])+"-"+p2(de[1]):ymd(),
  cards=[...new Set(S.tx.filter(t=>!t.inc&&t.card&&t.card!="Recurring").sort((a,b)=>b.date.localeCompare(a.date)).map(t=>t.card))],
  want=s("card"),iw=(all.match(/\bwith\s+([a-z]{3,})/i)||[])[1],l4=(want.match(/(\d{4})\s*$/)||all.match(/[•*·.x]{2,}\s*(\d{4})/i)||[])[1],
  card=cards.find(c=>want&&c.toLowerCase()==want.toLowerCase())||(l4&&cards.find(c=>c.includes(l4)))||(want&&!/^\D*\d{4}$/.test(want)?want:"")||(iw&&cards.find(c=>c.toLowerCase().includes(iw.toLowerCase())))||(cards.includes(S.defCard)?S.defCard:"")||cards[0]||"My card",
  t={id,date:/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date)?date:ymd(),desc,amt,card:canon(card),cat:desc?guess(desc):"Other",auto:1};
 // Read from a notification without a shekel amount (foreign money, or nothing found): keep the original words in the note.
 // Currency (2026-11-19): a plain amount from the quick-add button is in the "Buying in" currency (or the item's own "cur" code);
 // a notification that names another currency (€50, USD 12.5) is saved in that currency, the shekel value looked up by inboxAdd.
 let fc=null,fa=amt;
 if(s("amt")){const c=s("cur").toUpperCase();fc=CCY[c]?c:buyC()}
 else if(!cur&&all){const SY={"€":"EUR","$":"USD","£":"GBP","¥":"JPY","₺":"TRY","฿":"THB","₹":"INR"},W="(€|\\$|£|¥|₺|฿|₹|"+Object.keys(CCY).join("|")+")",
  a=all.match(new RegExp("(?<![A-Za-z])"+W+"\\s*"+N+"(?!\\d)")),b=!a&&all.match(new RegExp(N+"\\s*"+W+"(?![A-Za-z])")),sym=a?a[1]:b&&b[2];
  if(sym){fc=SY[sym]||sym;fa=num((a?a[2]:b[1]).replace(/^(\d+),(\d{1,2})$/,"$1.$2"))}}
 if(fc&&fc!=homeC()&&fa){t.fx={c:fc,a:fa,r:0};t.amt=0}
 else if(!s("amt")&&!cur&&all)t.note=all.slice(0,500);
 return t}
function inboxAdd(list){const ids=[];list.forEach(([id,d])=>{const k="in-"+String(id).replace(/[^\w:.-]/g,"");if(!d||S.tx.some(t=>t.id==k))return;const t=inboxRow(k,d);S.tx.push(t);ids.push(k);
 if(t.fx)getRate(t.fx.c,homeC(),t.date).then(r=>{if(r&&t.fx&&!t.fx.r&&S.tx.includes(t)){t.fx.r=r;t.amt=r2(t.fx.a*r);save();render()}})});return ids}
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
// Payslip (תלוש שכר). Only three things are read: the net pay ("נטו לתשלום", the amount that reaches the bank), the slip's month
// and its issue date. Nothing else from the file is kept or shown. The text arrives as pieces with a position (from a PDF, or from
// pasted text where the position is line and word number). The amount is the number nearest to the label on its line.
// Some PDFs store Hebrew back to front and split it into words or letters, so the label is looked for in both directions.
const MONEY=/^\d{1,3}(,\d{3})+(\.\d{1,2})?$|^\d+\.\d{2}$/;
function slip(items){const lines=[],flat=s=>s.replace(/\s+/g,"");
 items.slice().sort((a,b)=>a.p-b.p||b.y-a.y).forEach(i=>{const l=lines[lines.length-1];
  if(l&&l.p==i.p&&Math.abs(l.y-i.y)<=Math.max(2,i.h*.5))l.it.push(i);else lines.push({p:i.p,y:i.y,it:[i]})});
 lines.forEach(l=>{l.it.sort((a,b)=>a.x-b.x);l.a=flat(l.it.map(i=>i.s).join(""));l.b=flat(l.it.slice().reverse().map(i=>i.s).join(""))});
 const has=(l,w)=>{const r=[...w].reverse().join("");return l.a.includes(w)||l.b.includes(w)||l.a.includes(r)||l.b.includes(r)};
 const find=(w,re)=>{for(const l of lines)if(has(l,w)){const m=l.it.map(i=>i.s).join(" ").match(re);if(m)return m}return null};
 const L=lines.find(l=>has(l,"נטולתשלום"));if(!L)return null;
 const lab=L.it.filter(i=>/נטו|וטנ|לתשלום|םולשתל/.test(i.s)),src=lab.length?lab:L.it,lx=src.reduce((a,i)=>a+i.x,0)/src.length,h=Math.max(...L.it.map(i=>i.h));
 // An amount on the label's own row always wins; a row just above or below is used only when its own row has none.
 const sc=i=>(Math.abs(i.y-L.y)<=Math.max(2,h*.5)?0:1e6)+Math.abs(i.y-L.y)*4+Math.abs(i.x-lx);
 const near=items.filter(i=>i.p==L.p&&MONEY.test(i.s)&&Math.abs(i.y-L.y)<=h*1.5).sort((a,b)=>sc(a)-sc(b))[0];
 // The label and the amount can also be one piece ("נטו לתשלום 8,640.00").
 const one=!near&&L.it.map(i=>i.s).join(" ").split(/\s+/).find(x=>MONEY.test(x)),net=num(near?near.s:one||"");
 if(!(net>0))return null;
 const mo=find("תלוש",/(\d{1,2})\/(20\d{2})/)||find("לחודש",/(\d{1,2})\/(20\d{2})/),dt=find("בתאריך",/\d{1,2}\/\d{1,2}\/20\d{2}/);
 return{net,month:mo&&+mo[1]>=1&&+mo[1]<=12?mo[1].padStart(2,"0")+"/"+mo[2]:"",date:dt?date(dt[0]):null}}
const textItems=text=>text.split(/\r?\n/).flatMap((l,r)=>l.replace(/[₪|]/g," ").trim().split(/\s+/).filter(Boolean).map((s,k)=>({s,x:k,y:-r*10,h:4,p:0})));
// PDF reader (pdf.js, legacy build, in vendor/): loads on first use, like the Excel library. Only the first 5 pages are read.
function loadPdf(){return window.PDFJS?Promise.resolve(PDFJS):import("./vendor/pdf.min.mjs").then(m=>{m.GlobalWorkerOptions.workerSrc="vendor/pdf.worker.min.mjs";return window.PDFJS=m})}
async function pdfItems(buf){const L=await loadPdf(),task=L.getDocument({data:buf}),out=[];
 try{const doc=await task.promise;for(let p=1;p<=Math.min(doc.numPages,5);p++){const tc=await(await doc.getPage(p)).getTextContent();
  tc.items.forEach(i=>{const s=(i.str||"").replace(/₪/g,"").trim();if(s)out.push({s,x:i.transform[4]+(i.width||0)/2,y:i.transform[5],h:i.height||10,p})})}}
 finally{task.destroy().catch(()=>{})}
 return out}
// A picture of a payslip (photo or screenshot): the text is recognised inside the browser (tesseract.js with its Hebrew data, in
// vendor/, loaded on first use); the picture is not sent anywhere. A large photo is shrunk first so a phone finishes in reasonable time.
// Each recognised word becomes a piece placed on its text line, so slip() reads it the same way as a PDF.
// Digits beside Hebrew are often misread in the full-page pass, so every number on a row that holds "נטו" or "לתשלום" is read a second
// time on its own: cut out, enlarged, digits only. A number the first pass already read as a proper amount is kept as it is.
// The user still sees the amount and confirms it before anything is added.
function loadOcr(){return window.Tesseract?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement("script");s.src="vendor/tesseract.min.js";s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
async function imgItems(f){await loadOcr();const bm=await createImageBitmap(f),k=Math.min(1,2600/Math.max(bm.width,bm.height));
 // cut(x,y,w,h,z): that part of the picture (in the shrunk picture's coordinates) on a white canvas, enlarged z times.
 const cut=(x,y,w,h,z)=>{const c=document.createElement("canvas");c.width=Math.max(1,Math.round(w*z));c.height=Math.max(1,Math.round(h*z));const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.drawImage(bm,x/k,y/k,w/k,h/k,0,0,c.width,c.height);return c};
 const W=bm.width*k,H=bm.height*k,src=cut(0,0,W,H,1),at=u=>new URL(u,location.href).href;
 let w=null;
 try{w=await Tesseract.createWorker("heb",1,{workerPath:at("vendor/worker.min.js"),corePath:at("vendor/tesseract-core-lstm.wasm.js"),langPath:at("vendor"),workerBlobURL:false});
  const r=await w.recognize(src,{},{blocks:true}),out=[];
  (r.data.blocks||[]).forEach(b=>b.paragraphs.forEach(p=>p.lines.forEach(l=>{const y=-(l.bbox.y0+l.bbox.y1)/2,h=l.bbox.y1-l.bbox.y0;
   l.words.forEach(x=>{const s=x.text.replace(/^[^\dא-ת]+|[^\dא-ת]+$/g,"");if(s)out.push({s,x:(x.bbox.x0+x.bbox.x1)/2,y,h,p:1,b:x.bbox})})})));
  const lab=out.filter(i=>/נטו|לתשלום/.test(i.s)),isN=i=>/\d/.test(i.s)&&!/[א-ת]/.test(i.s),nums=[];
  // Pieces of one number that the first pass split ("9" and "147.00") are joined into one box before the second read.
  out.filter(i=>isN(i)&&!MONEY.test(i.s)&&lab.some(l=>Math.abs(l.y-i.y)<=l.h*1.5)).sort((p,q)=>q.y-p.y||p.b.x0-q.b.x0).forEach(i=>{const n=nums[nums.length-1];
   if(n&&n.y==i.y&&i.b.x0-n.b.x1<i.h){n.b={x0:n.b.x0,y0:Math.min(n.b.y0,i.b.y0),x1:i.b.x1,y1:Math.max(n.b.y1,i.b.y1)};n.x=(n.b.x0+n.b.x1)/2;i.s=""}else nums.push(i)});
  if(nums.length){await w.reinitialize("eng");await w.setParameters({tessedit_char_whitelist:"0123456789.,",tessedit_pageseg_mode:"7"});
   for(const i of nums){const h=i.b.y1-i.b.y0,px=h*.5,py=h*.4,x=Math.max(0,i.b.x0-px),y=Math.max(0,i.b.y0-py);
    const t=(await w.recognize(cut(x,y,Math.min(W,i.b.x1+px)-x,Math.min(H,i.b.y1+py)-y,Math.max(1,Math.min(6,44/h))))).data.text.replace(/\s+/g,"").replace(/^[.,]+|[.,]+$/g,"");
    // A comma is easily read as a point ("8.640.00", "8.640"): a mark before two final digits is the decimal point, marks before
    // groups of three only group.
    const d=t.match(/^(\d[\d.,]*)[.,](\d{2})$/),n=d?d[1].replace(/[.,]/g,"")+"."+d[2]:/^\d{1,3}([.,]\d{3})+$/.test(t)?t.replace(/\./g,","):t;
    if(n)i.s=n}}
  return out.filter(i=>i.s).map(({s,x,y,h,p})=>({s,x,y,h,p}))}
 finally{bm.close();if(w)w.terminate()}}
let slipP=null;
function slipShow(s){slipP=s;$("slip").hidden=!s;if(!s)return;
 $("sliptxt").innerHTML="Payslip"+(s.month?" "+esc(s.month):"")+" · net pay <b>"+fmt(s.net)+"</b> · arrived on";$("slipdate").value=s.date||ymd()}
function slipAdd(){const s=slipP,d=$("slipdate").value;if(!s)return;if(!d){$("msg").textContent="Pick the date the money arrived.";return}const desc="Salary"+(s.month?" "+s.month:"");
 slipShow(null);$("paste").value="";
 if(S.tx.some(t=>t.inc&&t.desc==desc&&t.amt==s.net&&(s.month||t.date==d))){$("msg").textContent="That payslip is already added.";return}
 S.tx.push({id:uid(),date:d,desc,amt:s.net,inc:1,card:"",cat:""});save();
 $("msg").textContent="Added "+desc+" as income.";render()}
// readN: when another file is picked while one is still being read, only the newest one's result is shown.
let readN=0;
function readFile(f){const m=$("msg"),r=new FileReader(),my=++readN;slipShow(null);
 if(/^image\//.test(f.type)||/\.(jpe?g|png|webp|bmp)$/i.test(f.name)){m.textContent="Reading the picture… this can take up to a minute.";
  return imgItems(f).then(it=>{if(my!=readN)return;const s=slip(it);$("file").value="";m.textContent=s?"Check the amount against the payslip before adding it.":"Couldn’t find the net pay (נטו לתשלום) in that picture. Try a sharper, straight picture, or use + Add income and type the amount.";slipShow(s)})
   .catch(()=>{if(my!=readN)return;$("file").value="";m.textContent="Couldn’t read that picture."})}
 if(/\.pdf$/i.test(f.name)){m.textContent="Reading the file…";
  r.onload=()=>pdfItems(r.result).then(it=>{if(my!=readN)return;const s=slip(it);$("file").value="";m.textContent=s?"":it.length?"Couldn’t find the net pay (נטו לתשלום) in that PDF. Card statements import from Excel or CSV.":"That PDF has no text to read (a scan). Save the page as a picture and pick that instead.";slipShow(s)})
   .catch(e=>{if(my!=readN)return;$("file").value="";m.textContent=e&&e.name=="PasswordException"?"That PDF is locked with a password. Open it, copy its text and paste it below, or save a copy without the password.":"Couldn’t read that PDF."});
  return r.readAsArrayBuffer(f)}
 if(!/\.xlsx?$/i.test(f.name)){r.onload=()=>{$("paste").value=r.result};return r.readAsText(f)}
 m.textContent="Reading the file…";
 r.onload=()=>loadXlsx().then(()=>{const w=XLSX.read(r.result,{type:"array",cellNF:true}),text=w.SheetNames.map(n=>sheetText(w.Sheets[n])).filter(Boolean).join("\n");
   $("paste").value=text;const d4=cardDigits(text,f.name),c=$("card");
   if(d4&&(!c.value.trim()||c.value==autoCard)){c.value=autoCard=CL.find(x=>x.includes(d4))||"Card "+d4;impRule()}
   m.textContent="File read. Check the card name, then press Import and sort."})
  .catch(()=>{m.textContent="Couldn’t read that Excel file. Export it as CSV instead, or paste the rows."});
 r.readAsArrayBuffer(f)}
// A backup or restore file is the user's own, but its values end up inside the page's HTML, so force the risky ones into shape.
function clean(o){const id=x=>String(x||"").replace(/[^\w:.-]/g,"")||uid();
 if(!o||!Array.isArray(o.tx)||o.tx.some(t=>!t||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||typeof t.amt!="number"))return null;
 o.tx.forEach(t=>{t.id=id(t.id);t.desc=String(t.desc||"");if(t.src!=null)t.src=String(t.src);if(t.note!=null)t.note=String(t.note).slice(0,500);
  if(t.inc){t.inc=1;t.amt=Math.abs(t.amt);t.card=String(t.card||"");t.cat=String(t.cat||"")}else{delete t.inc;t.card=String(t.card||"My card");t.cat=String(t.cat||"Other")}
  if(t.auto&&!t.inc)t.auto=1;else delete t.auto;
  if(t.fx&&typeof t.fx=="object"&&CCY[t.fx.c]&&isFinite(t.fx.a)&&isFinite(t.fx.r)&&t.fx.r>=0)t.fx=Object.assign({c:t.fx.c,a:+t.fx.a,r:+t.fx.r},t.fx.m?{m:1}:{});else delete t.fx;
  if(Array.isArray(t.split))t.split=t.split.filter(p=>p&&typeof p.amt=="number"&&isFinite(p.amt)).map(p=>({cat:String(p.cat||"Other"),amt:p.amt}));fitSplit(t)});
 if(!Array.isArray(o.recur))o.recur=[];o.recur.forEach(r=>{r.id=id(r.id);r.amt=+r.amt||0;r.day=Math.min(28,Math.max(1,parseInt(r.day)||1));r.desc=String(r.desc||"");if(r.inc)r.inc=1;else delete r.inc});
 if(o.budget&&typeof o.budget=="object"){const c=bare(),s=o.budget.cats;if(s&&typeof s=="object")for(const k in s)if(+s[k]>0)c[k]=+s[k];o.budget={total:Math.max(0,+o.budget.total||0),cats:c}}else delete o.budget;
 if(o.barMode!="budget")delete o.barMode;
 for(const k of["home","buy"])if(!CCY[o[k]])delete o[k];
 if(typeof o.defCard=="string"&&o.defCard)o.defCard=o.defCard.slice(0,200);else delete o.defCard;
 if(o.mstart!=null){const n=Math.min(28,Math.max(1,parseInt(o.mstart)||1));if(n>1)o.mstart=n;else delete o.mstart}
 for(const k of["hue","cards"])if(o[k]&&typeof o[k]=="object")for(const c in o[k])o[k][c]=+o[k][c]||0;else delete o[k];
 if(!Array.isArray(o.cats)||o.cats.some(c=>typeof c!="string"))delete o.cats;
 if(!Array.isArray(o.catPick)||o.catPick.some(c=>typeof c!="string"))delete o.catPick;
 for(const k of["rules","alias","icon"])if(o[k]&&typeof o[k]=="object")for(const c in o[k])o[k][c]=String(o[k][c]).slice(0,k=="icon"?8:1e4);else delete o[k];
 return Object.assign({tx:[],rules:{},cur:"₪"},own(o))}
// Changing the home currency: offer to convert every saved amount (purchases, splits, recurring, budgets) at today's rate; undoable.
async function changeHome(nw){const old=homeC();if(nw==old)return render();
 if(S.tx.length||S.recur.length||(S.budget&&S.budget.total>0)){
  if(confirm("Convert your saved amounts from "+old+" to "+nw+" at today's rate? OK = convert everything. Cancel = keep the numbers as they are (only the currency changes).")){
   const r=await getRate(old,nw,ymd());if(!r){alert("Couldn't get today's "+old+" to "+nw+" rate (offline?). Nothing was changed.");return render()}
   const snap=JSON.stringify({tx:S.tx,recur:S.recur,budget:S.budget,home:S.home,cur:S.cur,buy:S.buy});
   S.tx.forEach(t=>{const sg=t.amt<0?-1:1;t.amt=r2(t.amt*r);if(t.split)t.split.forEach(p=>p.amt=r2(p.amt*r));
    if(t.fx){if(t.fx.c==nw){t.amt=r2(sg*Math.abs(t.fx.a));delete t.fx}else if(t.fx.a)t.fx.r=t.amt/t.fx.a}fitSplit(t)});
   S.recur.forEach(x=>x.amt=r2(x.amt*r));
   if(S.budget){S.budget.total=r2(S.budget.total*r);for(const k in S.budget.cats)S.budget.cats[k]=r2(S.budget.cats[k]*r)}
   pushUndo("Converted to "+nw,()=>{const o=JSON.parse(snap);S.tx=o.tx;S.recur=o.recur;if(o.budget)S.budget=o.budget;else delete S.budget;S.home=o.home;if(o.cur)S.cur=o.cur;S.buy=o.buy;fixMaps()})}}
 if(buyC()==old)S.buy=nw;S.home=nw;S.cur=CCY[nw];save();render()}
function fmt(n){return esc(S.cur)+" "+n.toLocaleString(undefined,{maximumFractionDigits:0})}
// Multi-currency (asked 2026-11-19). Every stored amount (t.amt) is in the HOME currency (S.home, shown everywhere), so v(), calc() and
// every total stay as they were. A purchase made in another currency also carries t.fx = {c: code, a: original amount, r: rate}
// with amt = a*r; the row shows the original next to it. S.buy = the currency new purchases are entered in (a trip). Both are set in
// Account; each row can be switched. Rates come from frankfurter.dev (European Central Bank, free, no key), looked up for the
// purchase date and cached on this device (localStorage "spend-fx", not synced); if offline the last known rate is used, else the
// rate box on the row is typed by hand. Editing the home amount of a foreign row changes its rate (the card statement's real charge).
const CCY={ILS:"₪",USD:"$",EUR:"€",GBP:"£",CHF:"CHF",JPY:"¥",CAD:"CA$",AUD:"A$",TRY:"₺",CZK:"Kč",PLN:"zł",HUF:"Ft",SEK:"kr",NOK:"kr",DKK:"kr",THB:"฿",CNY:"CN¥",INR:"₹",MXN:"MX$",ZAR:"R"};
const homeC=()=>CCY[S.home]?S.home:Object.keys(CCY).find(k=>CCY[k]==S.cur)||"ILS",buyC=()=>CCY[S.buy]?S.buy:homeC();
const fmtc=(n,c)=>esc(CCY[c]||c)+" "+n.toLocaleString(undefined,{maximumFractionDigits:2}),r2=n=>Math.round(n*100)/100;
let FX={};try{FX=JSON.parse(localStorage.getItem("spend-fx"))||{}}catch(e){}
async function getRate(from,to,d){if(from==to)return 1;const today=ymd(),dd=d&&d<today?d:today,k=from+">"+to+"|"+dd;if(FX[k]>0)return FX[k];
 try{const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),6000),r=await fetch("https://api.frankfurter.dev/v1/"+(dd==today?"latest":dd)+"?base="+from+"&symbols="+to,{signal:ac.signal});clearTimeout(tm);
  const j=await r.json(),x=j&&j.rates?+j.rates[to]:0;if(x>0){FX[k]=FX[from+">"+to]=x;try{localStorage.setItem("spend-fx",JSON.stringify(FX))}catch(e){}return x}}catch(e){}
 return FX[from+">"+to]||0}
// Put purchase x in currency c with original amount a (the rate is looked up for its date). Home currency = plain purchase.
async function setFx(x,c,a){if(c==homeC()){delete x.fx;return}const r=await getRate(c,homeC(),x.date);x.fx={c,a,r};if(r&&a)x.amt=r2(x.inc?Math.abs(a*r):a*r)}
// Rows saved without a rate (offline at the time, a statement in another currency, a changed date) get it here, once per row per visit.
let fxTried=new Set(),fxBusy=false;
async function fillRates(){if(fxBusy)return;fxBusy=true;let ch=false;
 try{for(const t of S.tx.filter(t=>t.fx&&!t.fx.r&&t.fx.a&&!fxTried.has(t.id))){fxTried.add(t.id);const r=await getRate(t.fx.c,homeC(),t.date);if(r&&t.fx&&!t.fx.r&&S.tx.includes(t)){t.fx.r=r;t.amt=r2(t.inc?Math.abs(t.fx.a*r):t.fx.a*r);ch=true}}}finally{fxBusy=false}
 if(ch){save();render()}}
const needRates=()=>!fxBusy&&S.tx.some(t=>t.fx&&!t.fx.r&&t.fx.a&&!fxTried.has(t.id));
const fxLine=t=>t.fx?` <small>(${fmtc(t.fx.a,t.fx.c)})</small>`:"";
// A "month" can start on any day (S.mstart, 1 to 28, default 1): the period from that day to the day before the next one is named
// after the calendar month it starts in. pk(date) -> "YYYY-MM" key of the period a date is in; mrange(m) -> [first day, last day].
const MS=()=>Math.min(28,Math.max(1,parseInt(S.mstart)||1)),p2=n=>String(n).padStart(2,"0"),dstr=d=>d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate());
function pk(d){if(MS()==1)return d.slice(0,7);let y=+d.slice(0,4),m=+d.slice(5,7);if(+d.slice(8,10)<MS()){if(--m==0){m=12;y--}}return y+"-"+p2(m)}
const mrange=m=>{const[y,mo]=m.split("-").map(Number);return[dstr(new Date(y,mo-1,MS())),dstr(new Date(y,mo,MS()-1))]};
function mname(m){const[y,mo]=m.split("-");if(MS()==1)return new Date(y,mo-1,1).toLocaleString(undefined,{month:"long",year:"numeric"});
 const[a,b]=mrange(m).map(x=>{const[yy,mm,dd]=x.split("-");return new Date(yy,mm-1,dd)}),f=o=>o.toLocaleString(undefined,{day:"numeric",month:"short"});return f(a)+" – "+f(b)+" "+b.getFullYear()}
function fsel(e){const d=e&&e.dataset;if(!d)return null;
 if(d.skip)return `[data-skip="${d.skip}"]`;
 if(d.tid)return `[data-tid="${d.tid}"][data-f="${d.f}"]`;
 if(d.sp)return `[data-sp="${d.sp}"][data-i="${d.i}"][data-f="${d.f}"]`;
 if(d.id)return `[data-id="${d.id}"]`;
 if(d.rid)return `[data-rid="${d.rid}"][data-f="${d.f}"]`;
 if(d.ci)return `[data-ci="${d.ci}"][data-f="${d.f}"]`;
 if(d.bi)return `[data-bi="${d.bi}"]`;
 if(d.ren!==undefined)return `[data-ren="${d.ren}"]`;return null}
const later=f=>setTimeout(f,0);
// An added purchase that was left empty is dropped, but only from an earlier day: today's may be one another device is still typing.
function dropEmpty(){const d=ymd();S.tx=S.tx.filter(t=>t.amt||t.desc||t.date>=d)}
const undo=[];let toastT=null;
function pushUndo(label,fn){undo.push({label,fn});if(undo.length>20)undo.shift();showToast()}
// Budget levels: 0 under 80%, 1 from 80% up to the budget, 2 over it. One definition for the alert line and the notice.
const bLvl=(x,b)=>b>0?(x>b?2:x>=b*.8?1:0):0;
// Budget notice: when a category (or the whole budget) rises to a higher level than the last time the same month was drawn
// (same list of purchases; a new month, a restore, a wipe or another account starts fresh), a short message shows at the top.
let bLast=null,bnT=null;
function budNote(bOn,m,B,by,tot){if(!bOn)return;const L={t:bLvl(tot,B.total),c:bare()};S.cats.forEach(c=>{if(B.cats[c]>0)L.c[c]=bLvl(by[c]||0,B.cats[c])});
 const was=bLast&&bLast.m==m&&bLast.tx===S.tx?bLast:null;bLast={m,tx:S.tx,L};if(!was)return;
 const msg=[];if(L.t>was.L.t)msg.push(L.t==2?"Over the whole budget":"The whole budget passed 80%");
 S.cats.forEach(c=>{if((L.c[c]||0)>(was.L.c[c]||0))msg.push(c+(L.c[c]==2?" is over budget":" passed 80% of its budget"))});
 if(!msg.length)return;const el=$("bnote");el.textContent=msg.join(" · ");el.hidden=false;clearTimeout(bnT);bnT=setTimeout(()=>{el.hidden=true},8000)}
function showToast(){const el=$("toast");clearTimeout(toastT);if(!undo.length){el.hidden=true;return}
 const u=undo[undo.length-1];el.innerHTML=`<span>${esc(u.label)}</span><button id="undo">Undo</button>`;el.hidden=false;toastT=setTimeout(()=>{el.hidden=true},8000)}
function doUndo(){const u=undo.pop();if(!u)return;u.fn();save();render();showToast()}
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key=="z"&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName||"")&&undo.length){e.preventDefault();doUndo()}});
let pendingMonth=null,focusTid=null,focusSp=null;
function addPurchase(inc){const id=uid(),d=ymd();
 dropEmpty();q="";$("q").value="";
 if(inc){S.tx.push({id,date:d,desc:"",amt:0,inc:1,card:"",cat:""});cardF="all";cat=null}
 else{const x={id,date:d,desc:"",amt:0,card:cardF!="all"?cardF:CL.find(c=>c!="Recurring")||"My card",cat:cat||"Other"};S.tx.push(x);
  if(buyC()!=homeC()){x.fx={c:buyC(),a:0,r:0};getRate(buyC(),homeC(),d).then(r=>{if(x.fx&&!x.fx.r){x.fx.r=r;if(S.tx.includes(x)){save();render()}}})}}
 pendingMonth=pk(d);focusTid=id;if((S.sk||"date")!="date"||S.sd=="asc")showAll=true;save();render()}
function render(){
 const fs=fsel(document.activeElement);
 syncCats();if(!Array.isArray(S.recur))S.recur=[];
 if(!$("cur").options.length)$("cur").innerHTML=$("buy").innerHTML=Object.keys(CCY).map(c=>`<option value="${c}">${c} ${CCY[c]==c?"":CCY[c]}</option>`).join("");
 if(!$("icur").options.length)$("icur").innerHTML=$("cur").innerHTML;
 $("cur").value=homeC();$("buy").value=buyC();if(!$("icur").value||!$("icur").dataset.k)$("icur").value=homeC();
 CL=[...new Set([...S.tx.filter(t=>!t.inc).map(t=>t.card),...S.recur.filter(r=>!r.inc).map(r=>r.card||"Recurring"),...Object.keys(S.cards)])].sort((a,b)=>a.localeCompare(b));
 if(cardF!="all"&&!CL.includes(cardF))cardF="all";
 const rc=[...new Set(["Recurring",...CL])],copt=s=>rc.map(c=>`<option${c==s?" selected":""}>${esc(c)}</option>`).join("");
 ["imp","crd","rec","bud","mer","acc","how"].forEach(p=>{$("p-"+p).hidden=panel!=p});
 document.querySelectorAll("[data-p]").forEach(b=>b.classList.toggle("on",b.dataset.p==panel));
 document.querySelectorAll("[data-h]").forEach(e=>e.hidden=e.dataset.h!=HOW);document.querySelectorAll("[data-how]").forEach(b=>b.classList.toggle("on",b.dataset.how==HOW));
 $("cardrules").innerHTML=CL.map((c,i)=>{const p=pct(c),n=S.tx.filter(t=>t.card==c).length;return `<div class="row"><input dir="auto" data-ci="${i}" data-f="name" value="${esc(c)}" style="width:170px" aria-label="Card name"><select data-ci="${i}" data-f="rule" aria-label="How this card counts">${ruleOpts(p,1)}</select>${[100,50,0].includes(p)?"":`<input data-ci="${i}" data-f="pct" type="number" min="0" max="100" value="${p}" style="width:70px" aria-label="Percent that counts"><span class="sub">%</span>`}<button data-def="${i}" class="${S.defCard==c?"pri":""}" title="Card the phone uses when no other is named" aria-pressed="${S.defCard==c}">${S.defCard==c?"★ Default":"☆ Default"}</button><span class="sub">${n} purchase${n==1?"":"s"}</span></div>`}).join("")||`<span class="msg">No cards yet. Import or add a purchase first.</span>`;
 $("crdmsg").textContent=crdMsg;
 if(!$("irule").options.length)impRule();
 {const rv=$("rcard").value;$("rcard").innerHTML=copt(rc.includes(rv)?rv:"Recurring")}
 $("reclist").innerHTML=S.recur.map(r=>`<div class="row"><input dir="auto" data-rid="${r.id}" data-f="desc" value="${esc(r.desc)}" style="width:150px" aria-label="Description"><input data-rid="${r.id}" data-f="amt" type="number" step="0.01" value="${r.amt}" style="width:90px" aria-label="Amount"><input data-rid="${r.id}" data-f="day" type="number" min="1" max="28" value="${r.day}" style="width:60px" aria-label="Day of month">${r.inc?`<span class="sub">income</span>`:`<select data-rid="${r.id}" data-f="card" aria-label="Card">${copt(r.card||"Recurring")}</select>`}<button class="x" data-delrec="${r.id}" aria-label="Delete">✕</button></div>`).join("")||`<span class="msg">None yet.</span>`;
 $("cardlist").innerHTML=CL.map(c=>`<option value="${esc(c)}">`).join("");
 $("cardf").innerHTML='<option value="all">All cards</option>'+CL.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");$("cardf").value=cardF;
 const months=[...new Set(S.tx.map(t=>pk(t.date)))].sort().reverse();
 const cm=pendingMonth||$("month").value||(months.includes(pk(ymd()))?pk(ymd()):months[0]||"all");pendingMonth=null;
 const yrs=[...new Set(months.map(x=>x.slice(0,4)))];
 $("month").innerHTML='<option value="all">All time</option>'+yrs.map(y=>`<option value="${y}">All of ${y}</option>`).join("")+months.map(m=>`<option value="${m}">${mname(m)}</option>`).join("");
 $("month").value=months.includes(cm)||yrs.includes(cm)||cm=="all"?cm:"all";
 const m=$("month").value;
 // Compare (view only, not saved): two months per category, change, and a strip of the last 12 months.
 {const el=$("cmp");el.hidden=!cmp;$("cmpb").classList.toggle("on",cmp);
  if(cmp){const sm=x=>{const[y,mo]=x.split("-");return new Date(y,mo-1,1).toLocaleString(undefined,{month:"short"})+" "+y.slice(2)},mr=repRows,
   A=months.includes(cmA)?cmA:months.includes(m)?m:months[0],B=months.includes(cmB)?cmB:months[months.indexOf(A)+1]||A;
   const ka=calc(mr(A)),kb=calc(mr(B)),names=[...new Set([...Object.keys(ka.by),...Object.keys(kb.by)])],
   ch=(x,y)=>{const d=x-y;return d?`<span class="chg">${d>0?"↑":"↓"} ${fmt(Math.abs(d))}${y?" ("+Math.round(Math.abs(d)/Math.abs(y)*100)+"%)":""}</span>`:"–"},
   ro=(n,x,y,cl)=>`<div class="cr${cl?" "+cl:""}"><span dir="auto">${esc(n)}</span><span>${fmt(x)}</span><span>${fmt(y)}</span><span>${ch(x,y)}</span></div>`,
   sel=(w,v)=>`<select data-cm="${w}" aria-label="Month ${w=="a"?"one":"two"}">${months.map(x=>`<option value="${x}"${x==v?" selected":""}>${esc(mname(x))}</option>`).join("")}</select>`,
   tr=months.slice(0,12).reverse().map(x=>[x,calc(mr(x)).spent]),tm=Math.max(1,...tr.map(r=>r[1]));
   el.innerHTML=months.length?`<div class="row" style="margin-top:10px">${sel("a",A)}<span class="sub">against</span>${sel("b",B)}</div>
   <div class="cmpt"><div class="cr hd"><span></span><span>${esc(sm(A))}</span><span>${esc(sm(B))}</span><span>Change</span></div>${names.sort((x,y)=>Math.abs((ka.by[y]||0)-(kb.by[y]||0))-Math.abs((ka.by[x]||0)-(kb.by[x]||0))||x.localeCompare(y)).map(n=>ro(n,ka.by[n]||0,kb.by[n]||0)).join("")}${ro("Total spent",ka.spent,kb.spent,"tot")}${ka.inc||kb.inc?ro("In",ka.inc,kb.inc):""}</div>
   <div class="trend">${tr.map(([x,s])=>`<button data-tm="${x}" class="${x==m?"sel":""}"><span>${esc(mname(x))}</span><span class="bar"><i style="width:${Math.max(0,s)/tm*100}%;background:var(--mute)"></i></span><span class="amt">${fmt(s)}</span></button>`).join("")}</div>`:`<span class="msg">No months yet.</span>`}}
 const base=repRows(m);
 const K=calc(base),ign=base.filter(t=>t.skip),tot=K.spent,per=K.per,by=K.by;
 // Budgets are monthly and cover all cards, so they show only with one month picked and no card filter.
 const B=S.budget&&S.budget.cats?S.budget:{total:0,cats:bare()},bOn=m.length==7&&cardF=="all",bc=bOn?B.cats:bare();
 let bl="";
 let bh="";
 if(bOn&&B.total>0){const left=B.total-tot,u=tot/B.total;bh=`<div class="bar hbar${u>1?" over":u>=.8?" mid":""}" aria-hidden="true"><i style="width:${Math.max(0,Math.min(1,u))*100}%"></i></div><div class="l${left<0?" over":""}" id="budline">${left<0?fmt(-left)+" over the "+fmt(B.total)+" budget":fmt(left)+" left of "+fmt(B.total)}</div>`}
 if(bOn){const ov=S.cats.filter(c=>bLvl(by[c]||0,B.cats[c])==2),nr=S.cats.filter(c=>bLvl(by[c]||0,B.cats[c])==1);
  if(ov.length||nr.length)bl+=`<div class="l" id="budalert">${ov.length?`<span class="over">Over budget: ${ov.map(esc).join(", ")}</span>`:""}${ov.length&&nr.length?" · ":""}${nr.length?"Near the limit (80%+): "+nr.map(esc).join(", "):""}</div>`}
 if(bOn&&bLvl(tot,B.total)==1)bl+=`<div class="l" id="totalalert">Near the limit (80%+): the whole budget</div>`;
 budNote(bOn,m,B,by,tot);
 {const cs=S.cats.reduce((a,c)=>a+(+B.cats[c]||0),0),el=$("budsum");el.hidden=!cs;if(cs)el.innerHTML=`Set in the categories: <b>${fmt(cs)}</b>`+(B.total>0?(B.total>=cs?` · <b>${fmt(B.total-cs)}</b> left of the ${fmt(B.total)} total`:` · <b class="over">${fmt(cs-B.total)}</b> more than the ${fmt(B.total)} total`):"")}
 if(document.activeElement!=$("btotal"))$("btotal").value=B.total||"";if(document.activeElement!=$("mstart"))$("mstart").value=S.mstart||"";
 {const ks=Object.keys(S.rules).sort((x,y)=>x.localeCompare(y)),co=[...S.cats,"Other"];
  $("merlist").innerHTML=ks.map(k=>{const c=S.rules[k],os=co.includes(c)?co:[...co,c];return `<div class="row"><span dir="auto" style="width:170px">${esc(k)}</span><select data-mk="${esc(k)}" aria-label="Category for ${esc(k)}">${os.map(o=>`<option value="${esc(o)}"${o==c?" selected":""}>${esc(o)}</option>`).join("")}</select><button class="x" data-delmk="${esc(k)}" aria-label="Forget ${esc(k)}">✕</button></div>`}).join("")||`<span class="msg">None yet. They are learned when you change a purchase's category.</span>`}
 $("budlist").innerHTML=S.cats.map((c,i)=>`<label class="row"><span dir="auto" style="width:150px">${esc(c)}</span><input data-bi="${i}" type="number" min="0" step="1" value="${B.cats[c]||""}" placeholder="No budget" style="width:120px" aria-label="Budget for ${esc(c)}"></label>`).join("");
 const shown=Object.keys(per).sort((a,b)=>per[b]-per[a]||a.localeCompare(b)),one=shown.length==1?rl(pct(shown[0])):"";
 {const el=$("trip"),bc2=buyC(),hc=homeC();el.hidden=bc2==hc;
  if(bc2!=hc){let fa=0,ha=0;for(const t of base)if(!t.skip&&!t.inc&&t.fx&&t.fx.c==bc2){const x=v(t);ha+=x;fa+=t.amt?t.fx.a*x/t.amt:0}
   el.innerHTML=`✈ Buying in <b>${bc2}</b>`+(fa||ha?` · <b>${fmtc(fa,bc2)}</b> spent · ${fmt(ha)}`:" · nothing spent yet")}}
 $("big").innerHTML=`<div><div class="n">${fmt(tot)}</div><div class="l">spent${one?" · "+one:""}${K.back?" · after "+fmt(K.back)+" paid back":""}</div>${bh}${bl}</div>`+
  (shown.length>1?shown.map(c=>`<div><div class="m">${fmt(per[c])}</div><div class="l">${esc(c)}${rl(pct(c))?" · "+rl(pct(c)):""}</div></div>`).join(""):"")+(ign.length?`<div class="l">Not counting ${ign.length} ignored (${fmt(ign.reduce((a,t)=>a+v(t),0))})</div>`:"");
 const mx=Math.max(1,...Object.values(by));
 // Bars (S.barMode): by amount (every bar against the largest category) or by budget (a bar with a budget fills toward it, one without stays empty).
 // Either way the colour warns from 80% of a budget and turns red when over, and "of ₪X" stays next to the amount.
 const bm=S.barMode=="budget";$("bmb").textContent=bm?"Bars: budget":"Bars: amount";
 const bw=(c,x)=>{const b=bc[c]>0?bc[c]:0,r=b?x/b:0;return `<span class="bw${r>1?" over":""}" data-c="${esc(c)}"><span class="bar"><i style="width:${Math.max(0,Math.min(1,bm?r:x/mx))*100}%;background:${r>1?"var(--bad)":r>=.8?"var(--warn)":COL[c]||"var(--mute)"}"></i></span><span class="amt">${fmt(x)}${b?`<small class="c">of ${fmt(b)}</small>`:""}</span></span>`};
 const ord=S.cats.map((_,i)=>i);if(S.catSort!="manual")ord.sort((a,b)=>(by[S.cats[b]]||0)-(by[S.cats[a]]||0));
 // Main screen: only the picked categories (S.catPick, saved and synced), or the 4 biggest of the period when none were picked,
 // in the order above (by size or the user's own). "All categories · Edit" opens every row with its editing controls and the ☆ to pick.
 const pick0=Array.isArray(S.catPick)?S.catPick:null,pin=c=>pick0?pick0.includes(c):catTop.includes(c);
 catTop=[...S.cats,"Other"].filter(c=>(by[c]||0)>0).sort((a,b)=>by[b]-by[a]).slice(0,4);
 const star=(c,k)=>`<button class="pin${pin(c)?" on":""}" data-pin="${k}" aria-pressed="${pin(c)}" title="Show on the main screen" aria-label="Show ${esc(c)} on the main screen">${pin(c)?"★":"☆"}</button>`;
 if(!catAll){const sh=ord.map(i=>S.cats[i]).filter(pin).concat(pin("Other")?["Other"]:[]);
  $("cats").innerHTML=sh.map(c=>`<button class="cat short${cat==c?" sel":""}" data-c="${esc(c)}"><span class="ci" style="--ic:${COL[c]||"var(--mute)"}" aria-hidden="true">${ic(c).trim()}</span><span class="cn" dir="auto">${esc(c)}</span>${bw(c,by[c]||0)}</button>`).join("")||`<span class="msg">${pick0?"No categories picked. Open All categories and tap ☆ to pick some.":"No spending in this period yet."}</span>`}
 else $("cats").innerHTML=ord.map(i=>{const c=S.cats[i];return `<div class="cat${cat==c?" sel":""}" data-row="${i}"><span class="grip" title="Drag to reorder" aria-label="Drag to reorder">⋮⋮</span><button class="ci${ic(c)?"":" none"}" style="--ic:${COL[c]||"var(--mute)"}" data-ic="${i}" title="Change icon" aria-label="Change icon">${ic(c).trim()||"＋"}</button><input dir="auto" class="cn" data-ren="${i}" value="${esc(c)}" aria-label="Category name">${bw(c,by[c]||0)}${star(c,i)}<button class="x" data-delcat="${i}" aria-label="Delete category">✕</button>${icOpen==i?`<div class="pick">${PICK.map(e=>`<button data-pick="${e}">${e}</button>`).join("")}<button data-pick="" aria-label="No icon">none</button><input data-icin="${i}" maxlength="8" placeholder="or type" aria-label="Type your own icon"></div>`:""}</div>`}).join("")+(by.Other||pin("Other")?`<div class="cat${cat=="Other"?" sel":""}"><span></span><span class="ci" aria-hidden="true">${ic("Other").trim()}</span><span class="cn" style="padding:6px 8px">Other</span>${bw("Other",by.Other||0)}${star("Other","o")}<span></span></div>`:"");
 $("catall").textContent=catAll?"Done":"All categories ("+S.cats.length+") · Edit";$("catreset").hidden=!(catAll&&pick0);$("addrow").hidden=!catAll;
 $("catmsg").textContent=catMsg;
 document.querySelectorAll("[data-cs]").forEach(b=>b.classList.toggle("on",b.dataset.cs==(S.catSort=="manual"?"manual":"size")));
 $("chip").innerHTML=cat?`<button id="clearcat">${ic(cat)}${esc(cat)} ✕</button>`:"";
 const sk=S.sk||"date",sd=S.sd=="asc"?1:-1,val=t=>sk=="amt"?(t.inc?t.amt:v(t)):String(t[sk]||"").toLowerCase();
 const qw=q.toLowerCase().split(/\s+/).filter(Boolean),hit=t=>{const s=[t.desc,t.note,catLabel(t),t.card,t.amt].join("\n").toLowerCase(),tg=tags(t);return qw.every(w=>w[0]=="#"&&w.length>1?tg.includes(w.slice(1)):s.includes(w))};
 const found=base.filter(t=>(!cat||has(t,cat))&&hit(t));FOUND=found;
 {const ts=tagSums(base),el=$("tags");el.hidden=!ts.length;el.innerHTML=ts.map(([g,s])=>`<button data-tag="${esc(g)}"${q.trim().toLowerCase()=="#"+g?' class="on"':""}>#${esc(g)} <span class="sub">${fmt(s)}</span></button>`).join("")}
 $("found").hidden=!qw.length;if(qw.length)$("found").textContent=`${found.length} found, ${fmt(calc(found).spent)}`;
 const list=found.sort((a,b)=>{const x=val(a),y=val(b),c=typeof x=="number"?x-y:x.localeCompare(y);return (c*sd)||b.date.localeCompare(a.date)});
 const lim=!qw.length&&!cat&&!showAll&&list.length>5,vis=lim?list.slice(0,5):list;
 $("allrow").hidden=list.length<=5||qw.length>0||!!cat;$("showall").textContent=lim?"Showing the latest 5 of "+list.length+" · Show all":"Show only the latest 5";
 const cols=[["date","Date"],["desc","Description"],["cat","Category"],["card","Card"],["amt","Amount"]];
 $("head").innerHTML=cols.map(([k,l])=>`<th${k=="amt"?' class="amt"':""} aria-sort="${sk==k?(sd==1?"ascending":"descending"):"none"}"><button data-sort="${k}">${l}${sk==k?(sd==1?" ▲":" ▼"):""}</button></th>`).join("")+`<th class="k">Ignore</th><th></th>`;
 const soonest=dstr(new Date(Date.now()-40*864e5));
 $("rows").innerHTML=list.length?vis.map(t=>{const os=ORDER.includes(t.cat)||t.inc&&!t.cat?ORDER:[...ORDER,t.cat],sl=sp(t),sg=t.amt<0?-1:1,
   spl=sl.map((p,i)=>`<div class="sp"><select data-sp="${t.id}" data-i="${i}" data-f="cat" aria-label="Category of this part">${(ORDER.includes(p.cat)?ORDER:[...ORDER,p.cat]).map(c=>`<option value="${esc(c)}"${c==p.cat?" selected":""}>${ic(c)}${esc(c)}</option>`).join("")}</select><input type="number" step="0.01" min="0" data-sp="${t.id}" data-i="${i}" data-f="amt" value="${esc(Math.abs(p.amt)||"")}" placeholder="Amount" aria-label="Amount of this part"><button class="x" data-spdel="${t.id}" data-i="${i}" aria-label="Remove this part">✕</button></div>`).join("")+(sl.length?`<small class="c sr">${fmt(sg*parts(t)[0][1])} stays in ${esc(t.cat)}</small>`:""),note=t.inc?(t.cat?"paid back":"income"):[t.amt<0?"refund":"",pct(t.card)==100?"":pct(t.card)?"counts "+fmt(v(t)):"not counted",t.auto&&t.date>=soonest?"not on a statement yet":""].filter(Boolean).join(" · ");
  return `<tr class="${t.skip?"skip":""}${t.inc?" inc":""}"><td class="d"><input type="date" data-tid="${t.id}" data-f="date" value="${t.date}"></td>
  <td class="ds"><input dir="auto" data-tid="${t.id}" data-f="desc" placeholder="Description" value="${esc(t.desc)}" style="min-width:190px"><input dir="auto" class="nt" data-tid="${t.id}" data-f="note" placeholder="+ note" value="${esc(t.note||"")}" aria-label="Note"></td>
  <td class="ct"><select data-id="${t.id}">${t.inc?`<option value="">Income</option>`:""}${os.map(c=>`<option value="${esc(c)}"${c==t.cat?" selected":""}>${t.inc?"Back: ":""}${ic(c)}${esc(c)}</option>`).join("")}${t.inc?"":`<option value="__inc">💰 Income</option><option data-split="1" value="${esc(t.cat)}">Split…</option>`}</select>${spl}</td>
  <td class="cd"><select dir="auto" data-tid="${t.id}" data-f="card" style="width:115px" aria-label="Card">${[...new Set(["",...CL.filter(c=>c!="Recurring"),t.card||""])].filter(c=>c||t.inc).map(c=>`<option value="${esc(c)}"${c==(t.card||"")?" selected":""}>${esc(c||"—")}</option>`).join("")}<option value="__new">＋ New card…</option></select></td>
  <td class="amt"><input type="number" step="0.01" data-tid="${t.id}" data-f="amt" value="${t.amt}">${t.inc?"":`<div class="fx"><div class="fxl"><span>${t.fx?"Paid":"Paid in"}</span>${t.fx?`<input type="number" step="0.01" data-tid="${t.id}" data-f="fxa" value="${t.fx.a||""}" placeholder="Amount" aria-label="Amount paid in ${t.fx.c}">`:""}<select data-tid="${t.id}" data-f="ccy" aria-label="Currency of this purchase">${Object.keys(CCY).map(c=>`<option${c==(t.fx?t.fx.c:homeC())?" selected":""}>${c}</option>`).join("")}</select>${t.fx?`<span>rate</span><input type="number" step="any" min="0" data-tid="${t.id}" data-f="fxr" value="${t.fx.r?+(t.fx.r>=1?t.fx.r.toFixed(2):t.fx.r.toPrecision(2)):""}" placeholder="rate" title="${homeC()} per 1 ${t.fx.c}" aria-label="Exchange rate: ${homeC()} per 1 ${t.fx.c}">`:""}</div></div>`}${note?`<small class="c amt">${note}</small>`:""}</td>
  <td class="k"><input type="checkbox" data-skip="${t.id}"${t.skip?" checked":""} aria-label="Ignore this purchase"></td><td class="k dl"><button class="x" data-del="${t.id}" aria-label="Delete">✕</button></td></tr>`}).join("")
  :`<tr><td colspan="7" class="empty" style="grid-column:1/-1">${S.tx.length?"Nothing matches these filters.":"No purchases yet. Press Import above, or load the sample data to try it out."}</td></tr>`;
 report();if(needRates())fillRates();
 if(fs){const el=document.querySelector(fs);if(el&&el!==document.activeElement)el.focus()}
 if(focusCat!=null){const el=document.querySelector(`[data-ren="${focusCat}"]`);if(el){el.focus();el.select()}focusCat=null}
 if(focusSp){const el=document.querySelector(`[data-sp="${focusSp[0]}"][data-i="${focusSp[1]}"][data-f="amt"]`);if(el)el.focus();focusSp=null}
 if(focusTid){const el=document.querySelector(`[data-tid="${focusTid}"][data-f="desc"]`);if(el)el.focus();focusTid=null}
}
// Report (view only, not saved). All numbers come from calc() and v(); ignored rows only appear in the list when asked for.
function repRows(m){return S.tx.filter(t=>(m=="all"||pk(t.date).startsWith(m))&&(cardF=="all"||t.card==cardF))}
const sec=(t,b)=>`<h3>${esc(t)}</h3>${b}`;
const repList=lst=>sec("All entries ("+lst.length+")",repTable([["Date"],["Description"],["Category"],["Card"],["Amount",1]],lst.map(t=>repTr([[t.date],[esc(t.desc)+fxLine(t)+(t.note?" <small>"+esc(t.note)+"</small>":"")+(t.skip?" <small>(ignored)</small>":""),0,1],[esc(t.inc&&!t.cat?"Income":catLabel(t)),0,1],[esc(t.card||""),0,1],[t.inc?fmt(t.amt):fmt(t.skip?t.amt:v(t)),1]])).join("")));
function repTable(head,body){return "<table class=\"rt\"><thead><tr>"+head.map(([l,n])=>"<th"+(n?" class=\"n\"":"")+">"+esc(l)+"</th>").join("")+"</tr></thead><tbody>"+body+"</tbody></table>"}
// Text cells keep the page direction (so they line up with their header) and wrap the text in <bdi>, so Hebrew still reads right.
const repTr=cells=>"<tr>"+cells.map(([x,n,d])=>"<td"+(n?" class=\"n\"":"")+">"+(d?"<bdi>"+x+"</bdi>":x)+"</td>").join("")+"</tr>";
function report(){
 const el=$("report");el.hidden=!rp;document.body.classList.toggle("rep",rp);if(!rp)return;
 if(rpT!="month")return repOther(el);
 const opts=$("month").innerHTML,m=rpM!=null&&[...$("month").options].some(o=>o.value==rpM)?rpM:$("month").value,rows=repRows(m),K=calc(rows),
  ttl=m=="all"?"All time":m.length==4?"Year "+m:mname(m),live=rows.filter(t=>!t.skip),sp=live.filter(t=>!t.inc);
 let prev="";if(m.length==7){const[y,mo]=m.split("-").map(Number),pm=mo==1?(y-1)+"-12":y+"-"+String(mo-1).padStart(2,"0"),pr=repRows(pm);
  if(pr.length){const d=K.spent-calc(pr).spent;prev=d?`${d>0?"↑":"↓"} ${fmt(Math.abs(d))} against ${esc(mname(pm))}`:"same as "+esc(mname(pm))}}
 const B=S.budget&&S.budget.total>0&&m.length==7&&cardF=="all"?S.budget:null,bl=B?(B.total>=K.spent?fmt(B.total-K.spent)+" left of "+fmt(B.total)+" budget":fmt(K.spent-B.total)+" over the "+fmt(B.total)+" budget"):"";
 const cats=Object.keys(K.by).sort((x,y)=>K.by[y]-K.by[x]||x.localeCompare(y)),cb=B&&B.cats||bare(),
  mer=Object.create(null);sp.forEach(t=>{const k=key(t.desc)||t.desc;(mer[k]=mer[k]||{n:t.desc,s:0,c:0});mer[k].s+=v(t);mer[k].c++});
 const top=Object.values(mer).filter(x=>x.s>0).sort((x,y)=>y.s-x.s).slice(0,10),big=sp.filter(t=>v(t)>0).sort((x,y)=>v(y)-v(x)).slice(0,5),inc=live.filter(t=>t.inc),
  rec=S.recur.filter(r=>!r.inc),lst=(rpS?rows:live).slice().sort((x,y)=>x.date.localeCompare(y.date));
 el.innerHTML=`<div class="rctl">${repType()}<label>Report for <select data-rm aria-label="Report period">${opts}</select></label><label><input type="checkbox" data-rl${rpL?" checked":""}> Full list</label><label><input type="checkbox" data-rs${rpS?" checked":""}> Show ignored in list</label><button class="pri" data-rpr>Print / Save as PDF</button><button data-rx>Export to Excel</button><button data-rclose>Close</button></div>
 <h2>Spending report: <span dir="auto">${esc(ttl)}</span></h2><div class="sub">${cardF=="all"?"All cards":"Card: "+esc(cardF)}</div>
 <div class="rbig"><div><b>${fmt(K.spent)}</b><span>spent${K.back?" · after "+fmt(K.back)+" paid back":""}</span></div><div><b>${fmt(K.inc)}</b><span>income</span></div><div><b class="${K.inc-K.spent<0?"neg":""}">${fmt(K.inc-K.spent)}</b><span>left over</span></div></div>
 ${bl||prev?`<div class="sub">${[bl,prev].filter(Boolean).join(" · ")}</div>`:""}
 ${cats.length?sec("By category",repTable([["Category"],["Amount",1],["Share",1]].concat(B?[["Budget",1]]:[]),cats.map(c=>repTr([[esc(c),0,1],[fmt(K.by[c]),1],[K.spent>0?Math.round(K.by[c]/K.spent*100)+"%":"",1]].concat(B?[[cb[c]?fmt(cb[c]):"",1]]:[]))).join(""))):""}
 ${Object.keys(K.per).length?sec("By card",repTable([["Card"],["Counts"],["Amount",1]],Object.keys(K.per).sort((x,y)=>K.per[y]-K.per[x]).map(c=>repTr([[esc(c),0,1],[esc(rl(pct(c))||"in full")],[fmt(K.per[c]),1]])).join(""))):""}
 ${(ts=>ts.length?sec("By tag",repTable([["Tag"],["Amount",1]],ts.map(([g,x])=>repTr([["#"+esc(g),0,1],[fmt(x),1]])).join(""))):"")(tagSums(live))}
 ${top.length?sec("Top merchants",repTable([["Merchant"],["Purchases",1],["Amount",1]],top.map(x=>repTr([[esc(x.n),0,1],[x.c,1],[fmt(x.s),1]])).join(""))):""}
 ${big.length?sec("Largest purchases",repTable([["Date"],["Description"],["Amount",1]],big.map(t=>repTr([[t.date],[esc(t.desc),0,1],[fmt(v(t)),1]])).join(""))):""}
 ${inc.length?sec("Income",repTable([["Date"],["Description"],["Amount",1]],inc.map(t=>repTr([[t.date],[esc(t.desc)+(t.cat?" (paid back: "+esc(t.cat)+")":""),0,1],[fmt(t.amt),1]])).join(""))):""}
 ${rec.length?sec("Recurring bills",repTable([["Bill"],["Day",1],["Amount",1]],rec.map(r=>repTr([[esc(r.desc),0,1],[r.day,1],[fmt(r.amt),1]])).join(""))):""}
 ${rpL?repList(lst):""}`;
 el.querySelector("[data-rm]").value=m}
const repType=()=>`<label>Report <select data-rt aria-label="Report type"><option value="month"${rpT=="month"?" selected":""}>Monthly</option><option value="sel"${rpT=="sel"?" selected":""}>Selected expenses</option><option value="trend"${rpT=="trend"?" selected":""}>Trend</option></select></label>`,
 repBtns=`<button class="pri" data-rpr>Print / Save as PDF</button><button data-rx>Export to Excel</button><button data-rclose>Close</button>`;
function trendMonths(){return[...new Set(repRows("all").map(t=>pk(t.date)))].sort().reverse().slice(0,rpN).reverse()}
function trendRows(){const ms=trendMonths();return repRows("all").filter(t=>ms.includes(pk(t.date)))}
// Selected expenses (what the filters and search show) and Trend (last 6 or 12 months).
function repOther(el){
 let body="";
 if(rpT=="sel"){const K=calc(FOUND),lst=(rpS?FOUND:FOUND.filter(t=>!t.skip)).slice().sort((x,y)=>x.date.localeCompare(y.date)),m=$("month").value,cats=Object.keys(K.by).sort((x,y)=>K.by[y]-K.by[x]||x.localeCompare(y)),
   fl=[m=="all"?"All time":m.length==4?"Year "+m:mname(m),cardF=="all"?"All cards":"Card: "+cardF,cat?"Category: "+cat:"",q.trim()?"Search: "+q.trim():""].filter(Boolean).join(" · ");
  body=`<h2>Selected expenses</h2><div class="sub" dir="auto">${esc(fl)}</div><div class="sub">Set the month, card, category and search on the main screen first.</div>
  <div class="rbig"><div><b>${fmt(K.spent)}</b><span>spent in ${FOUND.filter(t=>!t.skip).length} entries${K.back?" · after "+fmt(K.back)+" paid back":""}</span></div></div>
  ${cats.length?sec("By category",repTable([["Category"],["Amount",1]],cats.map(c=>repTr([[esc(c),0,1],[fmt(K.by[c]),1]])).join(""))):""}
  ${rpL?repList(lst):""}`}
 else{const ms=trendMonths(),all=repRows("all"),ks=ms.map(x=>calc(all.filter(t=>pk(t.date)==x))),names=[...new Set(ks.flatMap(k=>Object.keys(k.by)))],n=ms.length,
   ch=(x,y)=>{const d=x-y;return d?(d>0?"↑ ":"↓ ")+fmt(Math.abs(d)):"–"},L=ks[n-1],P=ks[n-2];
  body=`<h2>Trend: last ${n} month${n==1?"":"s"}</h2><div class="sub">${cardF=="all"?"All cards":"Card: "+esc(cardF)}</div>
  ${n?sec("Spent per month",repTable([["Month"],["Spent",1],["Change",1]],ms.map((x,i)=>repTr([[esc(mname(x)),0,1],[fmt(ks[i].spent),1],[i?ch(ks[i].spent,ks[i-1].spent):"",1]])).join(""))):`<div class="sub">No data yet.</div>`}
  ${n?sec("By category",repTable([["Category"],["Total",1],["Per month",1]].concat(n>1?[["Latest change",1]]:[]),names.map(c=>({c,t:ks.reduce((s,k)=>s+(k.by[c]||0),0),d:n>1?(L.by[c]||0)-(P.by[c]||0):0})).sort((x,y)=>Math.abs(y.d)-Math.abs(x.d)||y.t-x.t).map(o=>repTr([[esc(o.c),0,1],[fmt(o.t),1],[fmt(o.t/n),1]].concat(n>1?[[ch(L.by[o.c]||0,P.by[o.c]||0),1]]:[]))).join(""))):""}
  ${n>1?`<div class="sub">Latest change is ${esc(mname(ms[n-1]))} against ${esc(mname(ms[n-2]))}, biggest first.</div>`:""}`}
 el.innerHTML=`<div class="rctl">${repType()}${rpT=="trend"?`<label>Months <select data-rn aria-label="Months in trend"><option value="6"${rpN==6?" selected":""}>6</option><option value="12"${rpN==12?" selected":""}>12</option></select></label>`:`<label><input type="checkbox" data-rl${rpL?" checked":""}> Full list</label><label><input type="checkbox" data-rs${rpS?" checked":""}> Show ignored in list</label>`}${repBtns}</div>${body}`}
async function exportXlsx(){const m=rpM!=null?rpM:$("month").value;await loadXlsx();
 const d=(rpT=="sel"?FOUND.slice():rpT=="trend"?trendRows():repRows(m)).sort((x,y)=>x.date.localeCompare(y.date)).map(t=>({Date:t.date,Description:t.desc,Category:catLabel(t)||"",Card:t.card||"",Amount:t.amt,"Counted amount":t.skip?0:v(t),Type:t.inc?(t.cat?"payback":"income"):t.amt<0?"refund":"purchase",Ignored:t.skip?"yes":"",Note:t.note||""})),
  wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(d),"Spending");XLSX.writeFile(wb,"spending-"+(rpT=="sel"?"selected":rpT=="trend"?"trend":m=="all"?"all":m)+".xlsx")}
$("q").addEventListener("input",e=>{q=e.target.value;render()});
$("go").onclick=()=>{const m=$("msg"),sl=/נטו|וטנ/.test($("paste").value)&&slip(textItems($("paste").value));if(sl){m.textContent="";return slipShow(sl)}
 const p=parse($("paste").value);
 if(!p){m.textContent="Couldn’t find date, description and amount columns. Check the first row has headers like Date, Description, Amount.";return}
 if(!p.length){m.textContent="No purchases found in that text.";return}
 const card=canon($("card").value)||"My card";S.cards[card]=+$("irule").value;
 const[n,ni,nm]=add(p,card,$("icur").value),sk=p.length-n-ni-nm;m.textContent=`Added ${n} purchase${n==1?"":"s"}${ni?` and ${ni} income`:""}${nm?`, matched ${nm} you had already added`:""}${sk?`, skipped ${sk} already saved`:""}.`;$("paste").value="";$("file").value="";$("icur").dataset.k="";render()};
$("sample").onclick=()=>{const a=[["2026-11-02","Shufersal Deal Ramat Gan",312.4],["2026-11-03","Wolt Tel Aviv",89],["2026-11-04","Pango Parking",24],["2026-11-05","Netflix.com",54.9],["2026-11-06","Super-Pharm",67.5],["2026-11-08","Aroma Cafe",38],["2026-11-09","Zara",259],["2026-10-28","Rami Levy",420.1],["2026-10-30","Cinema City",96],["2026-10-21","Delek Fuel",250]];
 const b=[["2026-11-01","Arnona Tel Aviv",640],["2026-11-03","Rami Levy",488.3],["2026-11-07","Electric IEC",402],["2026-11-08","Wolt Dinner",142],["2026-11-10","Booking.com Hotel",1380],["2026-10-29","Yochananof",276.8],["2026-10-25","Partner Internet",99]];
 if(S.cards["Joint card"]==null)S.cards["Joint card"]=50;
 add(a.map(x=>({date:x[0],desc:x[1],amt:x[2]})),"My Visa");add(b.map(x=>({date:x[0],desc:x[1],amt:x[2]})),"Joint card");render()};
$("card").oninput=impRule;
function recGen(){
 if(!Array.isArray(S.recur))S.recur=[];if(!S.recDone)S.recDone=bare();
 const today=ymd(),nowM=today.slice(0,7);
 S.recur.forEach(r=>{let m=r.start,g=0;
  while(m&&m<=nowM&&g++<120){const k=r.id+":"+m,dt=m+"-"+String(Math.min(r.day||1,28)).padStart(2,"0");
   if(!S.recDone[k]&&dt<=today){S.recDone[k]=1;S.tx.push(r.inc?{id:"rec-"+k,date:dt,desc:r.desc,amt:Math.abs(r.amt),inc:1,card:"",cat:""}:{id:"rec-"+k,date:dt,desc:r.desc,amt:r.amt,card:r.card||"Recurring",cat:guess(r.desc)})}
   const[y,mo]=m.split("-").map(Number);m=mo==12?(y+1)+"-01":y+"-"+String(mo+1).padStart(2,"0")}});
 save()}
function addRec(){const d=$("rdesc").value.trim(),a=parseFloat($("ramt").value),inc=$("rkind").value=="inc";if(!d||!a)return;
 const r={id:"r"+uid(),desc:d,amt:inc?Math.abs(a):a,day:Math.min(28,Math.max(1,parseInt($("rday").value)||1)),card:$("rcard").value||"Recurring",start:ymd().slice(0,7)};
 if(inc){r.inc=1;delete r.card}S.recur.push(r);
 $("rdesc").value="";$("ramt").value="";recForm(false);recGen();render()}
// The add form is hidden until "+ Add recurring" is pressed (view only, not saved).
function recForm(on){$("recform").hidden=!on;$("recnew").hidden=on;if(on)$("rdesc").focus()}
function renameCat(i,nv){nv=nv.trim();const old=S.cats[i];catMsg="";
 if(!nv||nv==old)return render();
 if(nv=="Other"||S.cats.includes(nv)){catMsg="That name is already used.";return render()}
 S.cats[i]=nv;if(S.hue)S.hue[nv]=S.hue[old];S.icon[nv]=ic(old).trim();delete S.icon[old];icOpen=null;S.tx.forEach(t=>{if(t.cat==old)t.cat=nv;sp(t).forEach(p=>{if(p.cat==old)p.cat=nv})});
 {const b=bud().cats;if(b[old]!=null){b[nv]=b[old];delete b[old]}}
 for(const k in S.rules)if(S.rules[k]==old)S.rules[k]=nv;
 for(const b of BASE)if((S.alias[b]||b)==old)S.alias[b]=nv;
 if(Array.isArray(S.catPick))S.catPick=S.catPick.map(x=>x==old?nv:x);
 if(cat==old)cat=nv;save();render()}
// A merchant's category was chosen: remember it and re-sort every purchase from that merchant.
function learn(k,c){S.rules[k]=c;S.tx.forEach(y=>{if(!y.inc&&key(y.desc)==k)y.cat=c})}
function addCat(){let n="New category",i=2;while(S.cats.includes(n))n="New category "+i++;
 S.cats.push(n);focusCat=S.cats.length-1;catMsg="";catAll=true;save();render()}
function delCat(i){const old=S.cats[i],oAlias=bare(S.alias),oRules=bare(),oTx=S.tx.filter(t=>t.cat==old).map(t=>t.id),oSp=[];S.tx.forEach(t=>sp(t).forEach((p,i)=>{if(p.cat==old){oSp.push([t.id,i]);p.cat="Other"}}));for(const k in S.rules)if(S.rules[k]==old)oRules[k]=old;S.cats.splice(i,1);const oBud=bud().cats[old];delete S.budget.cats[old];
 S.tx.forEach(t=>{if(t.cat==old)t.cat="Other"});
 for(const k in S.rules)if(S.rules[k]==old)delete S.rules[k];
 for(const b of BASE)if((S.alias[b]||b)==old)S.alias[b]="Other";
 if(cat==old)cat=null;catMsg="";pushUndo("Deleted category “"+old+"”",()=>{S.cats.splice(Math.min(i,S.cats.length),0,old);S.alias=oAlias;Object.assign(S.rules,oRules);if(oBud)bud().cats[old]=oBud;S.tx.forEach(t=>{if(oTx.includes(t.id))t.cat=old});oSp.forEach(([id,i])=>{const t=S.tx.find(y=>y.id==id),p=t&&sp(t)[i];if(p&&p.cat=="Other")p.cat=old})});save();render()}
let wp=false;$("wipe").onclick=()=>{if(!wp){wp=true;$("wipe").textContent="Press again to delete everything";$("wmsg").textContent="This removes all purchases, recurring items and learned corrections.";setTimeout(()=>{wp=false;$("wipe").textContent="Delete all data";$("wmsg").textContent=""},6000);return}
 const snap={tx:S.tx,rules:S.rules,recur:S.recur,recDone:S.recDone};S.tx=[];S.rules=bare();S.recur=[];S.recDone=bare();pushUndo("Deleted all data",()=>{S.tx=snap.tx.concat(S.tx);S.rules=Object.assign(bare(snap.rules),S.rules);S.recur=snap.recur.concat(S.recur);S.recDone=Object.assign(bare(snap.recDone),S.recDone)});save();wp=false;cat=null;$("wipe").textContent="Delete all data";$("wmsg").textContent="All clear.";render()};
// Download my data / Restore from file (Account panel). The file holds everything in S. Restoring replaces what is saved, after a second press.
$("dl").onclick=()=>{const a=document.createElement("a"),u=URL.createObjectURL(new Blob([JSON.stringify({app:"spend-sorted",v:1,saved:new Date().toISOString(),data:S})],{type:"application/json"}));
 a.href=u;a.download="spend-backup-"+ymd()+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);$("rsmsg").textContent="Saved to your downloads. Keep the file somewhere private."};
let rsPend=null,rsT=null;
function rsReset(){rsPend=null;clearTimeout(rsT);$("rsbtn").textContent="Restore from file";$("rsfile").value=""}
$("rsbtn").onclick=()=>{if(!rsPend)return $("rsfile").click();const old=S;S=rsPend;rsReset();fixMaps();cat=null;cardF="all";
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
 if(t.id=="showall"){showAll=!showAll;render();return}
 if(t.id=="themeb"){themeSet(THEMES[(THEMES.indexOf(themeGet())+1)%3]);return}
 if(t.dataset&&t.dataset.ic!==undefined){icOpen=icOpen==+t.dataset.ic?null:+t.dataset.ic;render();return}
 if(t.dataset&&t.dataset.pick!==undefined&&icOpen!=null){const c=S.cats[icOpen];if(c){S.icon[c]=t.dataset.pick;save()}icOpen=null;render();return}
if(t.id=="cadd"){const n=$("cname").value.trim().slice(0,200);if(!n)return $("cname").focus();if(CL.some(c=>sameCard(c,n))){crdMsg="That card already exists.";return render()}S.cards[n]=100;crdMsg="";$("cname").value="";save();render();return}
 if(t.dataset.def!==undefined){const c=CL[+t.dataset.def];if(c){if(S.defCard==c)delete S.defCard;else S.defCard=c;save();render()}return}
 if(t.dataset.cs){S.catSort=t.dataset.cs;save();render()}
 if(t.id=="catall"){catAll=!catAll;icOpen=null;render();return}
 if(t.dataset.pin!==undefined){const c=t.dataset.pin=="o"?"Other":S.cats[+t.dataset.pin];if(c==null)return;
  const was=Array.isArray(S.catPick)?S.catPick.slice():null,now=was||catTop.slice();S.catPick=now.includes(c)?now.filter(x=>x!=c):now.concat(c);
  pushUndo((S.catPick.includes(c)?"Showing “":"Hid “")+c+"” on the main screen",()=>{if(was)S.catPick=was;else delete S.catPick});save();render();return}
 if(t.id=="catreset"){const was=S.catPick;delete S.catPick;pushUndo("Back to the 4 biggest categories",()=>{S.catPick=was});save();render();return}
 if(t.id=="bmb"){if(S.barMode=="budget")delete S.barMode;else S.barMode="budget";save();render()}
 if(t.dataset.how){HOW=t.dataset.how;render();return}
 if(t.dataset.p){panel=panel==t.dataset.p?null:t.dataset.p;render();return}
 const b=t.closest&&t.closest("[data-c]");if(b){cat=cat==b.dataset.c?null:b.dataset.c;render()}
 if(t.id=="repb"){rp=true;rpM=null;render();window.scrollTo(0,0);return}
 if(t.dataset.rclose!==undefined){rp=false;render();return}
 if(t.dataset.rpr!==undefined){window.print();return}
 if(t.dataset.rx!==undefined){exportXlsx().catch(()=>{});return}
 if(t.id=="cmpb"){cmp=!cmp;render();return}
 const tb=t.closest&&t.closest("[data-tm]");if(tb){$("month").value=tb.dataset.tm;cmA=null;render();return}
 if(t.id=="clearcat"){cat=null;render()}
 if(t.id=="addcat")addCat();
 if(t.id=="addp")addPurchase();
 if(t.id=="slipgo")slipAdd();
 if(t.id=="radd")addRec();
 if(t.id=="recnew")recForm(true);
 if(t.id=="rcancel")recForm(false);
 if(t.dataset.delcat!==undefined)delCat(+t.dataset.delcat);
 if(t.dataset.delrec){const i=S.recur.findIndex(x=>x.id==t.dataset.delrec);if(i>=0){const it=S.recur[i];S.recur.splice(i,1);pushUndo("Deleted recurring “"+it.desc.slice(0,28)+"”",()=>{S.recur.splice(Math.min(i,S.recur.length),0,it)})}save();render()}
 if(t.dataset.del){const i=S.tx.findIndex(x=>x.id==t.dataset.del);if(i>=0){const it=S.tx[i];S.tx.splice(i,1);pushUndo("Deleted “"+(it.desc||"purchase").slice(0,28)+"”",()=>{S.tx.splice(Math.min(i,S.tx.length),0,it)})}save();render()}
 if(t.dataset.delmk){const k=t.dataset.delmk,old=S.rules[k];if(old!=null){delete S.rules[k];pushUndo("Forgot merchant “"+k+"”",()=>{S.rules[k]=old});save();render()}}
 if(t.dataset.spdel){const x=S.tx.find(y=>y.id==t.dataset.spdel),i=+t.dataset.i,p=x&&sp(x)[i];
  if(p){x.split.splice(i,1);if(!x.split.length)delete x.split;pushUndo("Removed a split part",()=>{const y=S.tx.find(z=>z.id==x.id);if(y&&!y.inc)(y.split=sp(y)).splice(Math.min(i,y.split.length),0,p)});save();render()}}
 {const tg=t.closest&&t.closest("[data-tag]");if(tg){q=q.trim().toLowerCase()=="#"+tg.dataset.tag?"":"#"+tg.dataset.tag;$("q").value=q;render();return}}
 if(t.id=="undo")doUndo();
 const sb=t.closest&&t.closest("[data-sort]");if(sb){const c=sb.dataset.sort;if((S.sk||"date")==c)S.sd=(S.sd||"desc")=="asc"?"desc":"asc";else{S.sk=c;S.sd=(c=="amt"||c=="date")?"desc":"asc"}save();render()}});
document.addEventListener("change",e=>{const t=e.target;
 if(t.dataset.skip){const x=S.tx.find(y=>y.id==t.dataset.skip);if(x){if(t.checked)x.skip=1;else delete x.skip;save();render()}}
 else if(t.dataset.tid){const x=S.tx.find(y=>y.id==t.dataset.tid),f=t.dataset.f;
  if(x&&f=="ccy"){const c=t.value;return setFx(x,c,x.fx?x.fx.a:x.amt).then(()=>{save();render()})}
  if(x&&x.fx&&(f=="fxa"||f=="fxr")){const n=parseFloat(t.value)||0;if(f=="fxa")x.fx.a=n;else x.fx.r=Math.max(0,n);
   if(f=="fxr")x.fx.m=1;
   if(x.fx.a&&x.fx.r){x.amt=r2(x.inc?Math.abs(x.fx.a*x.fx.r):x.fx.a*x.fx.r);fitSplit(x)}return save(),later(render)}
  if(x){let val=t.value;
   if(f=="amt"){val=parseFloat(val);if(!val)return later(render);if(x.inc)val=Math.abs(val)}
   if(f=="date"&&!/^\d{4}-\d{2}-\d{2}$/.test(val))return later(render);
   if(f=="desc"&&!val.trim())return later(render);
   if(f=="card"&&val=="__new"){val=canon(prompt("New card name")||"");if(!val)return later(render)}
   if(f!="card"&&f!="note"&&!x.src&&x.amt&&x.desc)x.src=rid(x);
   x[f]=(f=="desc"||f=="card"||f=="note")?val.trim().slice(0,f=="note"?500:1e4):val;if(f=="amt"){fitSplit(x);if(x.fx&&x.fx.a){x.fx.r=x.amt/x.fx.a;x.fx.m=1}}if(f=="date"&&x.fx&&!x.fx.m){x.fx.r=0;fxTried.delete(x.id)}if(f=="note"&&!x.note)delete x.note;if(f=="desc"&&x.cat=="Other"&&!x.inc)x.cat=guess(x.desc);save();later(render)}}
 else if(t.dataset.rid){const r=S.recur.find(x=>x.id==t.dataset.rid),f=t.dataset.f;
  if(r){r[f]=f=="amt"?(parseFloat(t.value)||0):f=="day"?Math.min(28,Math.max(1,parseInt(t.value)||1)):t.value;recGen();save();later(render)}}
 else if(t.dataset.icin!==undefined){const c=S.cats[+t.dataset.icin];if(c){S.icon[c]=t.value.trim().slice(0,8);save()}icOpen=null;render()}
 else if(t.dataset.ren!==undefined){const i=+t.dataset.ren,nv=t.value;later(()=>renameCat(i,nv))}
 else if(t.dataset.sp){const x=S.tx.find(y=>y.id==t.dataset.sp),p=x&&sp(x)[+t.dataset.i];if(!p)return later(render);
  if(t.dataset.f=="cat")p.cat=t.value;
  // A part can take at most what the other parts leave of the amount.
  else{const oth=x.split.reduce((a,o)=>a+(o==p?0:Math.abs(o.amt)),0),n=Math.max(0,Math.min(Math.abs(parseFloat(t.value)||0),Math.abs(x.amt)-oth));p.amt=Math.round(n*100)/100*(x.amt<0?-1:1)}
  save();later(render)}
 else if(t.dataset.id){const x=S.tx.find(y=>y.id==t.dataset.id);if(x){
   // "Income" in an expense's category box turns the row into plain income (amount positive, no card rule, no split).
   if(t.value=="__inc"&&!x.inc){x.inc=1;x.amt=Math.abs(x.amt);x.cat="";x.card="";delete x.split;delete x.fx;delete x.auto;save();return later(render)}
   if(t.selectedOptions[0]&&t.selectedOptions[0].dataset.split){x.split=sp(x);x.split.push({cat:ORDER.find(c=>c!=x.cat)||"Other",amt:0});focusSp=[x.id,x.split.length-1];save();return later(render)}
   x.cat=t.value;const k=key(x.desc);if(k&&!x.inc)learn(k,t.value);save();later(render)}}
 else if(t.dataset.mk){const k=t.dataset.mk;if(S.rules[k]==null)return;learn(k,t.value);save();later(render)}
 else if(t.dataset.bi){const c=S.cats[+t.dataset.bi],n=Math.max(0,parseFloat(t.value)||0);if(c==null)return;if(n)bud().cats[c]=n;else delete bud().cats[c];save();later(render)}
 else if(t.id=="mstart"){const n=Math.min(28,Math.max(1,parseInt(t.value)||1));if(n>1)S.mstart=n;else delete S.mstart;save();pendingMonth=pk(ymd());later(render)}
 else if(t.id=="btotal"){bud().total=Math.max(0,parseFloat(t.value)||0);save();later(render)}
 else if(t.id=="rkind")$("rcard").hidden=t.value=="inc";
 else if(t.dataset.rt!==undefined){rpT=t.value;render()}
 else if(t.dataset.rn!==undefined){rpN=+t.value;render()}
 else if(t.dataset.rm!==undefined){rpM=t.value;render()}
 else if(t.dataset.rl!==undefined){rpL=t.checked;render()}
 else if(t.dataset.rs!==undefined){rpS=t.checked;render()}
 else if(t.id=="month"){cmA=null;render()}
 else if(t.dataset.cm){if(t.dataset.cm=="a")cmA=t.value;else cmB=t.value;render()}
 else if(t.dataset.ci){const c=CL[+t.dataset.ci],f=t.dataset.f;if(c==null)return;
  if(f=="name"){const nv=t.value.trim();later(()=>renameCard(c,nv))}
  else{S.cards[c]=t.value=="c"?25:Math.min(100,Math.max(0,parseFloat(t.value)||0));save();later(render)}}
 else if(t.id=="cardf"){cardF=t.value;render()}
 else if(t.id=="icur")t.dataset.k=1;
 else if(t.id=="cur"&&CCY[t.value])changeHome(t.value);
 else if(t.id=="buy"&&CCY[t.value]){S.buy=t.value;save();render()}
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
  // First visit: the fonts loaded before the worker existed. Hand over their addresses, again later for a slow line.
  if(first)sw.ready.then(x=>[3000,15000,45000].forEach(ms=>setTimeout(()=>x.active&&x.active.postMessage({type:"warm",urls:performance.getEntriesByType("resource").map(e=>e.name)}),ms)))}).catch(()=>{})})();
// An app left open (an installed phone app often is) runs recGen only at start: when it returns to the front on a later day, add the new month's bills.
document.addEventListener("visibilitychange",()=>{if(!document.hidden){fxTried.clear();if($("app").hidden===false)fillRates()}});
let recDay=ymd();document.addEventListener("visibilitychange",()=>{if(document.hidden||ymd()==recDay||$("app").hidden)return;recDay=ymd();recGen();render()});
function start(){fixMaps();dropEmpty();recGen();S.tx.forEach(t=>{if(t.cat=="Other"&&!t.inc)t.cat=guess(t.desc)});save();
 panel=S.tx.some(t=>!String(t.id).startsWith("rec-"))?null:"imp";
 $("accbtn").textContent=C.on?"Account":"Backup";document.querySelectorAll(".cl").forEach(e=>e.hidden=!C.on);$("who").textContent=C.user?C.user.email:"";
 $("boot").hidden=true;$("app").hidden=false;render();stat();}

// The More menu: opens on its button, closes on a click elsewhere, on Escape, or after choosing a panel or the report.
{const mn=$("menu"),mb=$("more"),shut=()=>{mn.hidden=true;mb.setAttribute("aria-expanded","false")};
 document.addEventListener("click",e=>{const t=e.target;if(t.closest&&t.closest("#more")){mn.hidden=!mn.hidden;mb.setAttribute("aria-expanded",String(!mn.hidden));return}
  if(!mn.hidden&&(!t.closest||!t.closest("#menu")||t.dataset.p||t.id=="repb"))shut()});
 document.addEventListener("keydown",e=>{if(e.key=="Escape"&&!mn.hidden){shut();mb.focus()}})}
