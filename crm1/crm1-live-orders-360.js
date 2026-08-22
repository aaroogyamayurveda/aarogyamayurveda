/* CRM1 live orders + Customer 360 enhancements */
(function(){'use strict';
const URL='https://ielebadardbzmoxantsc.supabase.co',KEY='sb_publishable_0pekrOT6vhYZYQ48wHr7Ag_NPcpobGj';
const $=id=>document.getElementById(id);let db=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty=p=>({normal:'Fresh Order',high:'Urgent Order',express:'Express Urgent Order'}[p]||p||'-');

async function init(){
  for(let i=0;i<30&&!window.supabase?.createClient;i++)await new Promise(r=>setTimeout(r,200));
  if(!window.supabase?.createClient)return;
  db=window.supabase.createClient(URL,KEY);
  window.addEventListener('crm1DataChanged',e=>{if(e.detail?.type==='order_created')refreshDashboard()});
  window.addEventListener('crm1PriorityOrderCreated',refreshDashboard);
  const orig=window.customer360;
  if(typeof orig==='function'){
    window.customer360=async function(){
      await orig();
      setTimeout(enhance360,250);
    };
  }
}

async function refreshDashboard(){
  try{
    if(typeof window.loadDashboard==='function'){await window.loadDashboard();return}
    const today=new Date().toISOString().slice(0,10);
    const {data}=await db.from('orders').select('order_status,order_date').gte('order_date',today+'T00:00:00').lte('order_date',today+'T23:59:59.999');
    const a=data||[];
    const count=(...x)=>a.filter(o=>x.includes(String(o.order_status||'').toLowerCase())).length;
    if($('sOrders'))$('sOrders').textContent=a.length;
    if($('sPending'))$('sPending').textContent=count('new','pending','verified','processing');
    if($('sTransit'))$('sTransit').textContent=count('in_transit','transit','shipped','out_for_delivery');
    if($('sDelivered'))$('sDelivered').textContent=count('delivered');
    if($('sCancelled'))$('sCancelled').textContent=count('cancelled','canceled');
  }catch(e){console.warn(e)}
}

function priorityFromRow(o){return pretty(o.order_priority)||pretty(o.order_type)}
function headers(table){return [...table.querySelectorAll('thead th')].map(x=>x.textContent.trim().toLowerCase())}
function dataRows(table){return [...table.querySelectorAll('tbody tr')].filter(r=>r.cells.length>1)}

async function enhanceOrderType(table){
  const h=headers(table);
  if(!h.includes('order')||h.includes('order type'))return;
  const th=document.createElement('th');th.textContent='Order Type';table.querySelector('thead tr').appendChild(th);
  const rows=dataRows(table);
  await Promise.all(rows.map(async tr=>{
    const no=(tr.cells[0]?.textContent||'').replace(/\D/g,'');
    const td=document.createElement('td');
    if(no&&db){
      try{
        const {data}=await db.from('orders').select('order_priority,order_type').eq('order_no',Number(no)).maybeSingle();
        td.innerHTML='<span class="pill">'+esc(priorityFromRow(data||{}))+'</span>';
      }catch(e){td.textContent='-'}
    }else td.textContent='-';
    tr.appendChild(td);
  }));
}

function setupTableControls(table,key){
  if(!table||table.dataset.crm360Controls)return;
  table.dataset.crm360Controls='1';
  const panel=table.closest('.panel')||table.parentElement;
  const rows=dataRows(table);
  const ths=[...table.querySelectorAll('thead th')];
  if(!rows.length||!ths.length)return;

  let page=1,sortIndex=-1,sortDir=1;
  const filters=Array(ths.length).fill('');
  const wrap=document.createElement('div');
  wrap.className='crm-table-toolbar';
  wrap.innerHTML='<label>Show <select><option value="10">10</option><option value="25">25</option><option value="50">50</option></select> per page</label><span class="crm-table-summary"></span><button type="button" class="crm-clear-filters">Clear Filters</button><div class="crm-pages"></div>';
  panel.insertBefore(wrap,table.parentElement);
  const sel=wrap.querySelector('select'),sum=wrap.querySelector('.crm-table-summary'),clear=wrap.querySelector('.crm-clear-filters'),pages=wrap.querySelector('.crm-pages');

  ths.forEach((th,i)=>{
    const title=th.textContent.trim();
    th.dataset.crm360Title=title;
    th.style.cursor='pointer';
    const label=document.createElement('span');label.textContent=title+' ↕';label.className='crm-sort-label';
    th.textContent='';th.appendChild(label);
    const input=document.createElement('input');
    input.type='text';input.className='crm-col-filter';input.placeholder='Filter';input.autocomplete='off';
    input.addEventListener('click',e=>e.stopPropagation());
    input.addEventListener('input',()=>{filters[i]=input.value.toLowerCase().trim();page=1;render()});
    th.appendChild(input);
    label.addEventListener('click',()=>{
      if(sortIndex===i)sortDir*=-1;else{sortIndex=i;sortDir=1}
      ths.forEach((x,j)=>{const l=x.querySelector('.crm-sort-label');if(l)l.textContent=(x.dataset.crm360Title||'')+(j===sortIndex?(sortDir===1?' ↑':' ↓'):' ↕')});
      render();
    });
  });

  function filteredRows(){
    let out=rows.filter(r=>[...r.cells].every((c,i)=>!filters[i]||String(c.textContent||'').toLowerCase().includes(filters[i])));
    if(sortIndex>=0)out=out.slice().sort((a,b)=>{
      const av=(a.cells[sortIndex]?.textContent||'').trim(),bv=(b.cells[sortIndex]?.textContent||'').trim();
      const an=Number(av.replace(/[^0-9.-]/g,'')),bn=Number(bv.replace(/[^0-9.-]/g,''));
      const cmp=!Number.isNaN(an)&&!Number.isNaN(bn)&&/[0-9]/.test(av)&&/[0-9]/.test(bv)?an-bn:av.localeCompare(bv,undefined,{numeric:true,sensitivity:'base'});
      return cmp*sortDir;
    });
    return out;
  }
  function render(){
    const filtered=filteredRows(),n=Number(sel.value),total=Math.max(1,Math.ceil(filtered.length/n));
    if(page>total)page=total;
    rows.forEach(r=>r.style.display='none');
    filtered.slice((page-1)*n,page*n).forEach(r=>r.style.display='');
    sum.textContent=filtered.length?'Showing '+((page-1)*n+1)+'–'+Math.min(page*n,filtered.length)+' of '+filtered.length+' records':'0 records';
    pages.innerHTML='';
    const make=(txt,p,disabled,active)=>{const b=document.createElement('button');b.type='button';b.textContent=txt;b.disabled=disabled;b.className=active?'active':'';b.onclick=()=>{page=p;render()};pages.appendChild(b)};
    make('‹',Math.max(1,page-1),page===1,false);
    for(let i=1;i<=total;i++)make(String(i),i,false,i===page);
    make('›',Math.min(total,page+1),page===total,false);
  }
  sel.addEventListener('change',()=>{page=1;render()});
  clear.addEventListener('click',()=>{
    filters.fill('');sortIndex=-1;sortDir=1;page=1;
    ths.forEach(th=>{const input=th.querySelector('.crm-col-filter');if(input)input.value='';const label=th.querySelector('.crm-sort-label');if(label)label.textContent=(th.dataset.crm360Title||'')+' ↕'});
    render();
  });
  render();
}

async function enhance360(){
  const out=$('crm360Result');
  if(!out||out.dataset.crmLiveEnhanced)return;
  out.dataset.crmLiveEnhanced='1';
  const tables=[...out.querySelectorAll('table')];
  const orderTable=tables.find(t=>headers(t).includes('order'));
  const interactionTable=tables.find(t=>headers(t).some(x=>/type|interaction/i.test(x))&&!headers(t).includes('order'));
  if(orderTable){await enhanceOrderType(orderTable);setupTableControls(orderTable,'orders')}
  if(interactionTable)setupTableControls(interactionTable,'interactions');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();