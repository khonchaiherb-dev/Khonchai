(()=>{
const CFG={
"tax-auditor":{name:"นักตรวจสอบภาษีปฏิบัติการ",prefix:"TA",files:["bank-01.txt","bank-02-03.txt","bank-04-05.txt","bank-06-07.txt","bank-08-09.txt","bank-10-11.txt","bank-12-13.txt","bank-14-15.txt","bank-16-17.txt","bank-18.txt"]},
"revenue-academic":{name:"นักวิชาการสรรพากรปฏิบัติการ",prefix:"RA",files:["ra-bank-01.txt","ra-bank-02a.txt","ra-bank-02b.txt","ra-bank-03a.txt","ra-bank-03b.txt","ra-bank-04.txt","ra-bank-05.txt","ra-bank-06.txt","ra-bank-07.txt","ra-bank-08.txt","ra-bank-09.txt","ra-bank-10.txt"]}
};
const LETTERS=["ก","ข","ค","ง"],TOTAL=10;
let position=null,questions=[],profile=null,session=null,riskMap=new Map();
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
function getPosition(){try{return new URL(location.href).searchParams.get("position")}catch{return null}}
function key(){return "kexam_ai_tutor_v1_"+position}
function freshProfile(){return{xp:0,coins:0,attempted:0,correct:0,bestStreak:0,sessions:0,hardCorrect:0,badges:[],topics:{}}}
function loadProfile(){try{return Object.assign(freshProfile(),JSON.parse(localStorage.getItem(key())||"{}"))}catch{return freshProfile()}}
function saveProfile(){localStorage.setItem(key(),JSON.stringify(profile))}
function topic(cat,prompt){
const x=(String(cat)+" "+String(prompt)).toLowerCase();
const rules=[["VAT",/ภาษีมูลค่าเพิ่ม|vat|ภาษีซื้อ|ภาษีขาย/i],["ภาษีเงินได้บุคคลธรรมดา",/เงินได้บุคคลธรรมดา|เงินได้พึงประเมิน|มาตรา\s*40|ค่าลดหย่อน/i],["ภาษีเงินได้นิติบุคคล",/นิติบุคคล|กำไรสุทธิ|รอบระยะเวลาบัญชี/i],["การประเมินและอุทธรณ์",/ประเมิน|อุทธรณ์|หมายเรียก|เบี้ยปรับ|เงินเพิ่ม/i],["อากรแสตมป์",/อากรแสตมป์|ตราสาร/i],["หัก ณ ที่จ่าย",/หัก\s*ณ\s*ที่จ่าย|withholding/i],["การบัญชี",/งบการเงิน|งบดุล|กำไรขาดทุน|สินทรัพย์|หนี้สิน|บัญชี/i],["PDPA",/pdpa|ข้อมูลส่วนบุคคล/i],["ข้อมูลข่าวสาร",/ข้อมูลข่าวสาร|เปิดเผยข้อมูล/i],["เศรษฐกิจ",/gdp|เงินเฟ้อ|ดอกเบี้ย|เศรษฐกิจ|อัตราแลกเปลี่ยน/i],["ดิจิทัล",/เทคโนโลยี|ดิจิทัล|ปัญญาประดิษฐ์|cyber|cloud/i]];
for(const r of rules)if(r[1].test(x))return r[0];return cat||"อื่น ๆ";
}
function levelOf(q){
const full=[q.prompt].concat(q.choices).join(" "),lens=q.choices.map(x=>x.length).sort((a,b)=>a-b);let s=0;
if(q.prompt.length>90)s+=12;if(q.prompt.length>160)s+=10;if((lens[1]+lens[2])/2>40)s+=10;
if(/[0-9๐-๙]/.test(full))s+=10;if(/มาตรา|ร้อยละ|%|บาท|ภายใน|ยกเว้น|ข้อใด.*ไม่/i.test(full))s+=12;if(/คำนวณ|ฐานภาษี|อัตรา|กำไรสุทธิ/i.test(full))s+=15;
const r=Number(riskMap.get(q.id)||0);if(r>=70)s+=8;if(r>=120)s+=6;
return s<30?"easy":s<55?"medium":"hard";
}
function label(x){return({easy:"พื้นฐาน",medium:"ปานกลาง",hard:"ท้าทาย",auto:"ปรับอัตโนมัติ"})[x]||x}
function icon(x){return({easy:"&#127804;",medium:"&#10024;",hard:"&#128293;",auto:"&#129302;"})[x]||"&#10024;"}
async function loadData(){
position=getPosition();if(!CFG[position])throw Error("กรุณาเลือกตำแหน่งสอบก่อน");
const [manifest,risk]=await Promise.all([
fetch("question-publication-manifest.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("โหลดสถานะข้อสอบไม่สำเร็จ");return r.json()}),
fetch("source-verification-backlog.json",{cache:"no-store"}).then(r=>r.ok?r.json():({rows:[]})).catch(()=>({rows:[]}))
]);
riskMap=new Map((risk.rows||[]).map(r=>[String(r.question_id),Number(r.priority_score)||0]));
const cfg=CFG[position],pub=new Set((manifest.positions?.[position]?.published_ids||[]).map(String));
const parts=await Promise.all(cfg.files.map(f=>fetch(f,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("โหลดคลังข้อสอบไม่สำเร็จ");return r.text()})));
const b64=parts.join("").replace(/\s+/g,""),bin=atob(b64),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
if(typeof DecompressionStream==="undefined")throw Error("กรุณาใช้ Chrome, Edge หรือ Safari รุ่นปัจจุบัน");
const data=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).json();
questions=[];
data.q.forEach((set,si)=>set.forEach((r,qi)=>{
const id=cfg.prefix+"-S"+String(si+1).padStart(2,"0")+"-Q"+String(qi+1).padStart(3,"0");if(!pub.has(id))return;
const cat=String(data.s[r[0]]||""),prompt=String(data.s[r[1]]||"");
const q={id,cat,topic:topic(cat,prompt),prompt,choices:(r[2]||[]).map(i=>String(data.s[i]||"")),answer:Number(r[3]),explain:String(data.s[r[4]]||"")};
q.level=levelOf(q);questions.push(q);
}));
if(questions.length<900)throw Error("คลัง AI ติวเตอร์ไม่ครบ");profile=loadProfile();
}
function rankInfo(){
const ranks=[[0,"ผู้เริ่มต้น","&#127793;"],[120,"นักฝึกข้อสอบ","&#128035;"],[350,"นักวิเคราะห์","&#129504;"],[750,"นักล่าคะแนน","&#11088;"],[1400,"ผู้เชี่ยวชาญภาษี","&#127941;"],[2400,"K-EXAM Master","&#128081;"]];
let r=ranks[0],next=null;for(const x of ranks){if(profile.xp>=x[0])r=x;else{next=x;break}}
const cap=next?next[0]:r[0]+800,p=Math.min(100,Math.round((profile.xp-r[0])/(cap-r[0])*100));return{name:r[1],ico:r[2],p};
}
function badgeDefs(){return[
{id:"first",ico:"&#127775;",name:"ก้าวแรก",ok:()=>profile.attempted>=1},
{id:"streak5",ico:"&#9889;",name:"ต่อเนื่อง 5",ok:()=>profile.bestStreak>=5},
{id:"perfect",ico:"&#128175;",name:"เต็มสิบ",ok:()=>session?.done&&session.correct===TOTAL},
{id:"hard5",ico:"&#127942;",name:"พิชิตข้อท้าทาย",ok:()=>profile.hardCorrect>=5},
{id:"xp500",ico:"&#128142;",name:"สะสม 500 XP",ok:()=>profile.xp>=500}
]}
function unlock(){const got=[];for(const b of badgeDefs())if(b.ok()&&!profile.badges.includes(b.id)){profile.badges.push(b.id);got.push(b)}saveProfile();return got}
function headerProfile(){const r=rankInfo();return'<div class="ait-profile"><div>'+r.ico+'</div><section><b>'+esc(r.name)+'</b><small>XP '+profile.xp+' · เหรียญ '+profile.coins+'</small><i><em style="width:'+r.p+'%"></em></i></section></div>'}
function landing(){
const rate=profile.attempted?Math.round(profile.correct/profile.attempted*100):0,got=badgeDefs().filter(b=>profile.badges.includes(b.id));
$("#app").innerHTML='<header class="ait-top"><button id="aitBack">← กลับ</button><strong>K-EXAM AI Tutor</strong>'+headerProfile()+'</header><main class="ait-page"><section class="ait-hero"><div class="ait-bot">&#129302;<sup>&#10024;</sup></div><div><span>AI TUTOR · '+esc(CFG[position].name)+'</span><h1>ให้ AI ถาม คุณตอบ แล้วเก็บรางวัล</h1><p>ถามทีละข้อจากคลัง Published เฉลยทันที ปรับความยากตามผลงาน และสะสม XP เหรียญ ดาว และตรารางวัล</p></div><aside><b>'+profile.xp+'</b><small>XP</small><b>'+profile.coins+'</b><small>เหรียญ</small><b>'+rate+'%</b><small>แม่นยำ</small></aside></section><section class="ait-card"><div class="ait-head"><div><span>เลือกโหมด</span><h2>ระดับความยาก</h2></div><small>1 รอบ = '+TOTAL+' ข้อ</small></div><div class="ait-levels">'+[
["easy","&#127804;","พื้นฐาน","ทบทวนความรู้ตรงประเด็น"],["medium","&#10024;","ปานกลาง","ผสมความจำและวิเคราะห์"],["hard","&#128293;","ท้าทาย","โจทย์ซับซ้อนและตัวลวงใกล้เคียง"],["auto","&#129302;","ปรับอัตโนมัติ","AI ปรับระดับตามคำตอบของคุณ"]
].map(x=>'<button data-level="'+x[0]+'"><i>'+x[1]+'</i><b>'+x[2]+'</b><small>'+x[3]+'</small></button>').join("")+'</div></section><section class="ait-grid"><div class="ait-card"><h3>รางวัลของฉัน</h3>'+(got.length?got.map(b=>'<div class="ait-badge"><i>'+b.ico+'</i><b>'+esc(b.name)+'</b></div>').join(""):'<p class="ait-muted">ยังไม่มีรางวัล เริ่มตอบข้อแรกเพื่อปลดล็อก</p>')+'</div><div class="ait-card"><h3>สถิติสะสม</h3><div class="ait-stats"><span>ตอบแล้ว <b>'+profile.attempted+'</b></span><span>ตอบถูก <b>'+profile.correct+'</b></span><span>ต่อเนื่องสูงสุด <b>'+profile.bestStreak+'</b></span><span>จบรอบ <b>'+profile.sessions+'</b></span></div></div></section></main>';
$("#aitBack").onclick=()=>location.reload();document.querySelectorAll("[data-level]").forEach(b=>b.onclick=()=>start(b.dataset.level));
}
function pick(){
let lv=session.cur;
if(session.mode==="auto"){const h=session.hist.slice(-3);if(h.length>=2){const c=h.filter(x=>x.ok).length;if(c===h.length)lv=session.cur==="easy"?"medium":"hard";else if(c<=1)lv=session.cur==="hard"?"medium":"easy"}session.cur=lv}
let pool=questions.filter(q=>q.level===lv&&!session.used.has(q.id));
const weak=Object.entries(profile.topics||{}).filter(([,v])=>v.n>=2&&v.c/v.n<.7).sort((a,b)=>a[1].c/a[1].n-b[1].c/b[1].n);
if(weak.length&&Math.random()<.45){const f=pool.filter(q=>q.topic===weak[0][0]);if(f.length)pool=f}
if(!pool.length)pool=questions.filter(q=>!session.used.has(q.id));return pool[Math.floor(Math.random()*pool.length)];
}
function start(mode){session={mode,cur:mode==="auto"?"medium":mode,i:0,correct:0,streak:0,xp:0,coins:0,hist:[],used:new Set(),q:null,answered:false,done:false};next()}
function next(){if(session.i>=TOTAL)return finish();session.q=pick();if(!session.q)return finish();session.used.add(session.q.id);session.answered=false;renderQuestion()}
function renderQuestion(){
const q=session.q,p=Math.round(session.i/TOTAL*100);
$("#app").innerHTML='<header class="ait-top"><button id="aitExit">× ออกจากรอบ</button><strong>AI Tutor · '+icon(session.mode)+' '+label(session.mode)+'</strong>'+headerProfile()+'</header><main class="ait-page ait-play"><section class="ait-progress"><div><b>ข้อ '+(session.i+1)+'/'+TOTAL+'</b><small>ถูก '+session.correct+' · ต่อเนื่อง '+session.streak+'</small></div><i><em style="width:'+p+'%"></em></i><span>'+icon(q.level)+' '+label(q.level)+'</span></section><section class="ait-chat"><div class="ait-bubble"><i>&#129302;</i><div><small>'+esc(q.topic)+' · '+esc(q.id)+'</small><p>'+esc(q.prompt)+'</p></div></div><div class="ait-answers">'+q.choices.map((x,i)=>'<button data-answer="'+i+'"><span>'+LETTERS[i]+'</span><b>'+esc(x)+'</b></button>').join("")+'</div><div id="aitFeed"></div></section></main>';
$("#aitExit").onclick=()=>{if(confirm("ออกจากรอบนี้?"))landing()};document.querySelectorAll("[data-answer]").forEach(b=>b.onclick=()=>answer(+b.dataset.answer));
}
function answer(i){
if(session.answered)return;session.answered=true;const q=session.q,ok=i===q.answer;
document.querySelectorAll("[data-answer]").forEach((b,j)=>{b.disabled=true;if(j===q.answer)b.classList.add("ok");else if(j===i&&!ok)b.classList.add("no")});
session.i++;profile.attempted++;const t=profile.topics[q.topic]||{n:0,c:0};t.n++;if(ok)t.c++;profile.topics[q.topic]=t;
let xp=ok?({easy:10,medium:16,hard:25}[q.level]||15):3,coins=ok?({easy:2,medium:3,hard:5}[q.level]||3):0;
if(ok){session.correct++;session.streak++;profile.correct++;if(q.level==="hard")profile.hardCorrect++;if(session.streak>=3){xp+=5;coins++}}else session.streak=0;
profile.bestStreak=Math.max(profile.bestStreak,session.streak);profile.xp+=xp;profile.coins+=coins;session.xp+=xp;session.coins+=coins;session.hist.push({ok,topic:q.topic});const fresh=unlock();saveProfile();
$("#aitFeed").innerHTML='<div class="ait-bubble ait-feed '+(ok?"good":"learn")+'"><i>'+(ok?"&#127881;":"&#128161;")+'</i><div><h3>'+(ok?"ตอบถูก เก่งมาก!":"ยังไม่ถูก เรียนรู้ข้อนี้กัน")+'</h3><p><b>คำตอบ '+LETTERS[q.answer]+'.</b> '+esc(q.choices[q.answer])+'</p><section>'+esc(q.explain||"ทบทวนเหตุผลของคำตอบที่ถูกแล้วไปข้อต่อไป")+'</section><strong>+'+xp+' XP'+(coins?" · +"+coins+" เหรียญ":"")+'</strong>'+(fresh.length?'<aside>ปลดล็อก '+fresh.map(x=>x.ico+" "+x.name).join(" · ")+'</aside>':"")+'<button id="aitNext">'+(session.i>=TOTAL?"ดูผลรอบนี้":"ถามข้อต่อไป →")+'</button></div></div>';
$("#aitNext").onclick=next;$("#aitFeed").scrollIntoView({behavior:"smooth",block:"nearest"});
}
function finish(){
session.done=true;profile.sessions++;const rate=Math.round(session.correct/TOTAL*100),stars=rate>=90?3:rate>=70?2:rate>=50?1:0;
const a=rate>=90?["&#127942;","ยอดเยี่ยมมาก","ความแม่นยำสูง รักษาระดับและลองข้อท้าทายได้"]:rate>=75?["&#11088;","ทำได้ดี","พื้นฐานแข็งแรง ทบทวนข้อที่พลาดแล้วฝึกต่อ"]:rate>=60?["&#127793;","กำลังพัฒนาได้ดี","ควรทบทวนหัวข้อที่ตอบผิดแล้วฝึกต่อเนื่อง"]:["&#128218;","ควรทบทวนเพิ่ม","เริ่มจากระดับพื้นฐานและอ่านเฉลยทุกข้อ"];
const fresh=unlock(),w={};session.hist.filter(x=>!x.ok).forEach(x=>w[x.topic]=(w[x.topic]||0)+1);const review=Object.entries(w).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);saveProfile();
$("#app").innerHTML='<header class="ait-top"><button id="aitHome">← AI ติวเตอร์</button><strong>สรุปรอบการฝึก</strong>'+headerProfile()+'</header><main class="ait-page"><section class="ait-result"><i>'+a[0]+'</i><div><span>ประเมินจากรอบนี้</span><h1>'+a[1]+'</h1><p>'+a[2]+'</p><div>'+[1,2,3].map(n=>'<b class="'+(n<=stars?"on":"")+'">★</b>').join("")+'</div></div><aside><b>'+rate+'%</b><small>'+session.correct+'/'+TOTAL+'</small></aside></section><section class="ait-summary"><div><span>XP ที่ได้</span><b>+'+session.xp+'</b></div><div><span>เหรียญ</span><b>+'+session.coins+'</b></div><div><span>หัวข้อควรทบทวน</span><b>'+(review.length?review.map(esc).join(" · "):"ไม่มี")+'</b></div></section><section class="ait-card"><h3>รางวัลรอบนี้</h3><p class="ait-muted">'+(fresh.length?fresh.map(x=>x.ico+" "+x.name).join(" · "):"สะสม XP และตอบต่อเนื่องเพื่อปลดล็อกรางวัลใหม่")+'</p></section><div class="ait-actions"><button id="aitRewards">ดูรางวัล</button><button id="aitAgain">ฝึกอีก '+TOTAL+' ข้อ</button></div></main>';
$("#aitHome").onclick=$("#aitRewards").onclick=landing;$("#aitAgain").onclick=()=>start(session.mode);
}
function inject(){
if(!CFG[getPosition()]||$("#aiTutorEntry"))return;const main=$("main.page");if(!main)return;
const title=[...main.querySelectorAll(".section-title")].find(x=>/เลือกชุดข้อสอบ/.test(x.textContent||""));const w=document.createElement("section");w.id="aiTutorEntry";w.className="ait-entry-wrap";
w.innerHTML='<button class="ait-entry"><i>&#129302;<sup>&#10024;</sup></i><div><span>K-EXAM AI TUTOR</span><h3>ให้ AI ถาม คุณตอบ แล้วเก็บรางวัล</h3><p>เลือกความยากได้ · เฉลยทันที · เก็บ XP เหรียญ ดาว และตรารางวัล · ปรับคำถามตามผลงาน</p><small>&#127804; พื้นฐาน · &#10024; ปานกลาง · &#128293; ท้าทาย · &#129302; ปรับอัตโนมัติ</small></div><b>เริ่มฝึก →</b></button>';
title?title.parentNode.insertBefore(w,title):main.prepend(w);w.querySelector("button").onclick=openTutor;
}
async function openTutor(){
$("#app").innerHTML='<main class="ait-load"><div>&#129302;</div><h2>กำลังเตรียม AI ติวเตอร์</h2><p>กำลังเลือกคำถามจากคลัง Published...</p></main>';
try{await loadData();landing()}catch(e){alert(e.message||e);location.reload()}
}
new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>setTimeout(inject,400)):setTimeout(inject,400);
window.KEXAM_AI_TUTOR={open:openTutor};
})();