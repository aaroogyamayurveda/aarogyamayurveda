/* CRM1 live orders + Customer 360 enhancements */
(function(){'use strict';
const URL='https://ielebadardbzmoxantsc.supabase.co',KEY='sb_publishable_0pekrOT6vhYZYQ48wHr7Ag_NPcpobGj';
const $=id=>document.getElementById(id);let db=null,hooked=false,hookTimer=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty=p=>({normal:'Fresh Order',high:'Urgent Order',express:'Express Urgent Order'}[p]||p||'-');
async function init(){
  for(let i=0;i<60&&!window.supabase?.createClient;i++)await new Promise(r=>setTimeout(r,200));
  if(!window.supabase?.createClient)return;
  db=window.supabase.createClient(URL,KEY);
  window.addEventListener('crm1DataChanged',e=>{if(e.detail?.type==='order_created')refreshDashboard()});
  window.addEventListener('crm1PriorityOrderCreated',refreshDashboard);
  window.addEventListener('crm1Customer360Rendered',()=>scheduleEnhance());
  const hookCustomer360=()=>{
    const orig=window.customer360;
    if(typeof orig!=='function'||orig.__crmLive360Wrapped)return false;
    const wrapped=async function(...args){const result=await orig.apply(this,args);scheduleEnhance();return result};
    wrapped.__crmLive360Wrapped=true;window.customer360=wrapped;hooked=true;return true;
  };
  if(!hookCustomer360()){
    let tries=0;hookTimer=setInterval(()=>{tries++;if(hookCustomer360()||tries>=120)clearInterval(hookTimer)},250);
  }
  const watch=()=>{
    const out=$('crm360Result');if(!out)return false;
    if(!out.__crmLive360Observer){const observer=new MutationObserver(()=>scheduleEnhance());observer.observe(out,{childList:true,subtree:true});out.__crmLive360Observer=observer}
    scheduleEnhance();return true;
  };
  if(!watch()){let tries=0;const t=setInterval(()=>{tries++;if(watch()||tries>=120)clearInterval(t)},250)}
}
let enhanceQueued=false;
function scheduleEnhance(){if(enhanceQueued)return;enhanceQueued=true;setTimeout(async()=>{enhanceQueued=false;try{await enhance360()}catch(e){console.warn('CRM1 Customer 360 enhancement:',e)}},80)}
async function refreshDashboard(){
  try{
    if(typeof window.loadDashboard==='function'){await window.loadDashboard();return}
    const today=new Date().toISOString().slice(0,10);
    const {data}=await db.from('orders').select('order_status,order_date').gte('order_date',today+'T00:00:00').lte('order_date',today+'T23:59:59.999');
    const a=data||[],count=(...x)=>a.filter(o=>x.includes(String(o.order_status||'').toLowerCase())).length;
    if($('sOrders'))$('sOrders').textContent=a.length;if($('sPending'))$('sPending').textContent=count('new','pending','verified','processing');if($('sTransit'))$('sTransit').textContent=count('in_transit','transit','shipped','out_for_delivery');if($('sDelivered'))$('sDelivered').textContent=count('delivered');if($('sCancelled'))$('sCancelled').textContent=count('cancelled','canceled');
  }catch(e){console.warn(e)}
}
function priorityFromRow(o){return pretty(o.order_priority)||pretty(o.order_type)}
function headers(table){return [...table.querySelectorAll('thead th')].map(x=>x.dataset.crm360Title||x.textContent.trim()).map(x=>String(x).trim().toLowerCase())}
function dataRows(table){return [...table.querySelectorAll('tbody tr')].filter(r=>r.cells.length>1)}
async function enhanceOrderType(table){
  if(!table)return false;const h=headers(table);if(!h.includes('order'))return false;if(h.includes('order type'))return true;
  const th=document.createElement('th');th.textContent='Order Type';table.querySelector('thead tr').appendChild(th);
  const rows=dataRows(table);await Promise.all(rows.map(async tr=>{const no=(tr.cells[0]?.textContent||'').replace(/\D/g,'');const td=document.createElement('td');if(no&&db){try{const {data}=await db.from('orders').select('order_priority,order_type').eq('order_no',Number(no)).maybeSingle();td.innerHTML='<span class="pill">'+esc(priorityFromRow(data||{}))+'</span>'}catch(e){td.textContent='-'}}else td.textContent='-';tr.appendChild(td)}));return true;
}
function setupTableControls(table,key){
  if(!table||table.dataset.crm360Controls)return false;const rows=dataRows(table),ths=[...table.querySelectorAll('thead th')];if(!rows.length||!ths.length)return false;
  table.dataset.crm360Controls='1';const panel=table.closest('.panel')||table.parentElement;let page=1,sortIndex=-1,sortDir=1;const filters=Array(ths.length).fill('');
  const wrap=document.createElement('div');wrap.className='crm-table-toolbar';wrap.dataset.crm360Toolbar=key;wrap.innerHTML='<label>Show <select><option value="10">10</option><option value="25">25</option><option value="50">50</option></select> per page</label><span class="crm-table-summary"></span><button type="button" class="crm-clear-filters">Clear Filters</button><div class="crm-pages"></div>';panel.insertBefore(wrap,table.parentElement);
  const sel=wrap.querySelector('select'),sum=wrap.querySelector('.crm-table-summary'),clear=wrap.querySelector('.crm-clear-filters'),pages=wrap.querySelector('.crm-pages');
  ths.forEach((th,i)=>{const title=(th.dataset.crm360Title||th.textContent.trim()).replace(/[↕↑↓]\s*$/,'').trim();th.dataset.crm360Title=title;th.style.cursor='pointer';const label=document.createElement('span');label.textContent=title+' ↕';label.className='crm-sort-label';th.textContent='';th.appendChild(label);const input=document.createElement('input');input.type='text';input.className='crm-col-filter';input.placeholder='Filter';input.autocomplete='off';input.addEventListener('click',e=>e.stopPropagation());input.addEventListener('input',()=>{filters[i]=input.value.toLowerCase().trim();page=1;render()});th.appendChild(input);label.addEventListener('click',()=>{if(sortIndex===i)sortDir*=-1;else{sortIndex=i;sortDir=1}ths.forEach((x,j)=>{const l=x.querySelector('.crm-sort-label');if(l)l.textContent=(x.dataset.crm360Title||'')+(j===sortIndex?(sortDir===1?' ↑':' ↓'):' ↕')});render()})});
  function filteredRows(){let out=rows.filter(r=>[...r.cells].every((c,i)=>!filters[i]||String(c.textContent||'').toLowerCase().includes(filters[i])));if(sortIndex>=0)out=out.slice().sort((a,b)=>{const av=(a.cells[sortIndex]?.textContent||'').trim(),bv=(b.cells[sortIndex]?.textContent||'').trim(),an=Number(av.replace(/[^0-9.-]/g,'')),bn=Number(bv.replace(/[^0-9.-]/g,''));const numeric=!Number.isNaN(an)&&!Number.isNaN(bn)&&/[0-9]/.test(av)&&/[0-9]/.test(bv);return (numeric?an-bn:av.localeCompare(bv,undefined,{numeric:true,sensitivity:'base'}))*sortDir});return out}
  function render(){const filtered=filteredRows(),n=Number(sel.value),total=Math.max(1,Math.ceil(filtered.length/n));if(page>total)page=total;rows.forEach(r=>r.style.display='none');filtered.slice((page-1)*n,page*n).forEach(r=>r.style.display='');sum.textContent=filtered.length?'Showing '+((page-1)*n+1)+'–'+Math.min(page*n,filtered.length)+' of '+filtered.length+' records':'0 records';pages.innerHTML='';const make=(txt,p,disabled,active)=>{const b=document.createElement('button');b.type='button';b.textContent=txt;b.disabled=disabled;b.className=active?'active':'';b.onclick=()=>{page=p;render()};pages.appendChild(b)};make('‹',Math.max(1,page-1),page===1,false);for(let i=1;i<=total;i++)make(String(i),i,false,i===page);make('›',Math.min(total,page+1),page===total,false)}
  sel.addEventListener('change',()=>{page=1;render()});clear.addEventListener('click',()=>{filters.fill('');sortIndex=-1;sortDir=1;page=1;ths.forEach(th=>{const input=th.querySelector('.crm-col-filter');if(input)input.value='';const label=th.querySelector('.crm-sort-label');if(label)label.textContent=(th.dataset.crm360Title||'')+' ↕'});render()});render();return true;
}
async function enhance360(){
  const out=$('crm360Result');if(!out)return;const tables=[...out.querySelectorAll('table')];if(!tables.length)return;
  const orderTable=tables.find(t=>headers(t).includes('order'));
  const interactionTable=tables.find(t=>{const h=headers(t);return !h.includes('order')&&h.some(x=>/^(type|interaction|direction|status)$/i.test(x)||/interaction/i.test(x))});
  if(orderTable){await enhanceOrderType(orderTable);setupTableControls(orderTable,'orders')}
  if(interactionTable)setupTableControls(interactionTable,'interactions');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();