/* CRM1 Follow-ups DOM sanitizer.
   Keeps the original working Follow-ups renderer as the only data renderer.
   This removes completed rows after the original renderer finishes, preserving its customer/mobile mapping. */
(()=>{'use strict';
const $=id=>document.getElementById(id);let observer=null,timer=null,cleaning=false,visibleOnce=false;
const active=()=>$('followups')?.classList.contains('active');
function statusCellIndex(table){const hs=[...table.querySelectorAll('thead th')];return hs.findIndex(h=>/^status$/i.test((h.textContent||'').trim()))}
function clean(){if(cleaning||!active())return;const root=$('followupsContent');if(!root)return;const table=root.querySelector('table');if(!table)return;cleaning=true;try{const idx=statusCellIndex(table);if(idx<0)return;[...table.querySelectorAll('tbody tr')].forEach(tr=>{const cells=tr.querySelectorAll('td');if(cells.length&&String(cells[idx]?.textContent||'').trim().toLowerCase()==='completed')tr.remove()});
const rows=[...table.querySelectorAll('tbody tr')].filter(tr=>tr.querySelectorAll('td').length>1);let over=0,today=0,up=0;const now=new Date(),start=new Date(now);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);const whenIndex=[...table.querySelectorAll('thead th')].findIndex(h=>/^when$/i.test((h.textContent||'').trim()));if(whenIndex>=0){rows.forEach(tr=>{const text=(tr.querySelectorAll('td')[whenIndex]?.textContent||'').trim();const d=new Date(text);if(Number.isNaN(d.getTime()))return;if(d<start)over++;else if(d<end)today++;else up++})}
const cards=[...root.querySelectorAll('.stat')];cards.forEach(card=>{const label=(card.querySelector('span')?.textContent||'').trim().toLowerCase(),b=card.querySelector('b');if(!b)return;if(label==='overdue')b.textContent=over;if(label==='today')b.textContent=today;if(label==='upcoming')b.textContent=up});if(!rows.length){const tbody=table.querySelector('tbody');const cols=table.querySelectorAll('thead th').length||1;tbody.innerHTML=`<tr><td colspan="${cols}" class="empty">No active follow-ups</td></tr>`}root.style.visibility='visible';visibleOnce=true;}finally{cleaning=false}}
function schedule(ms=30){clearTimeout(timer);timer=setTimeout(clean,ms)}
function begin(){const root=$('followupsContent');if(!root)return;visibleOnce=false;root.style.visibility='hidden';schedule(0);setTimeout(()=>{if(active())schedule(0)},80);setTimeout(()=>{if(active())schedule(0)},250);setTimeout(()=>{if(active())schedule(0)},700);setTimeout(()=>{if(active())schedule(0)},1500)}
document.addEventListener('click',e=>{const b=e.target.closest('button,a');if(b&&/follow-ups/i.test(b.textContent||''))begin()},true);
function observe(){const root=$('followupsContent');if(!root||observer)return;observer=new MutationObserver(()=>{if(active()){if(!visibleOnce)root.style.visibility='hidden';schedule(20)}});observer.observe(root,{childList:true,subtree:true,characterData:true})}
const boot=()=>{observe();if(active())begin()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.crm1CleanFollowups=()=>{visibleOnce=false;begin()};
})();