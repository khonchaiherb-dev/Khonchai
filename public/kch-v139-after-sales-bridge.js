/* KHONCHAIHERB v1.39.0 — unified after-sales intent bridge */
(()=>{
  'use strict';
  if(typeof document==='undefined'||window.__KCH_AFTER_SALES_BRIDGE__==='1.39.0')return;
  window.__KCH_AFTER_SALES_BRIDGE__='1.39.0';
  const path=String(location.pathname||'').toLowerCase();
  if(/\/(?:support|my-orders|member|account|seller(?:-[^/]+)?|seller-center(?:-v2)?)\.html$/.test(path))return;
  const txt=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();
  function openTracker(){const btn=document.querySelector('.kch-v138-track-action');if(btn){btn.click();return true}location.href='/support.html?category=order&subject='+encodeURIComponent('ขอความช่วยเหลือเกี่ยวกับคำสั่งซื้อ');return false}
  function ensureMemberAction(){const actions=document.querySelector('.kch-v137-care-actions');if(!actions||actions.querySelector('.kch-v139-my-orders'))return;const a=document.createElement('a');a.className='kch-v137-care-action kch-v139-my-orders';a.href='/my-orders.html';const b=document.createElement('b');b.textContent='คำสั่งซื้อของฉัน';const s=document.createElement('small');s.textContent='สมาชิกดูออเดอร์ทั้งหมด ใบเสร็จ และบริการหลังการขายได้ในที่เดียว';a.append(b,s);const track=actions.querySelector('.kch-v138-track-action');if(track?.nextSibling)actions.insertBefore(a,track.nextSibling);else actions.appendChild(a)}
  function aiContext(el){return el?.closest?.('[class*="ai" i],[id*="ai" i],[class*="assistant" i],[id*="assistant" i],[class*="helper" i],[id*="helper" i],[class*="chat" i],[id*="chat" i]')}
  function isTrackIntent(el){const t=txt(el);return /ติดตามคำสั่งซื้อ|ตรวจสถานะคำสั่งซื้อ|เช็กคำสั่งซื้อ|เช็คคำสั่งซื้อ/.test(t)}
  document.addEventListener('click',e=>{const target=e.target?.closest?.('button,a,[role="button"]');if(!target||!aiContext(target)||!isTrackIntent(target))return;e.preventDefault();e.stopPropagation();openTracker()},true);
  window.KCHAfterSales=Object.freeze({openTracker,ordersUrl:'/my-orders.html',supportUrl:'/support.html'});
  let raf=0;const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;ensureMemberAction()})};if(typeof MutationObserver!=='undefined')new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();setTimeout(schedule,160);setTimeout(schedule,700);
})();