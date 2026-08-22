/* CRM1 Follow-up / Verification reliability patch. */
(async()=>{
  'use strict';
  const URL='https://ielebadardbzmoxantsc.supabase.co';
  const KEY='sb_publishable_0pekrOT6vhYZYQ48wHr7Ag_NPcpobGj';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>{if(!v)return '-';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}).format(d)};
  let db=window.sb||null,me=null,rendering=false;
  try{
    if(!db){const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');db=createClient(URL,KEY);window.sb=window.sb||db;}
    const {data:{user}}=await db.auth.getUser();me=user||null;
  }catch(e){console.warn('CRM1 verification patch init failed',e);return;}

  async function renderVerification(){
    const c=$('verificationContent');if(!c||rendering)return;
    rendering=true;
    c.innerHTML='<div class="crm1-muted">Loading...</div>';
    try{
      /* Do not request legacy/nonexistent order_items.qty. Verification only needs order + customer data. */
      const {data,error}=await db.from('orders')
        .select('id,order_no,verification_status,total_amount,order_date,remarks,customers(customer_name,mobile)')
        .order('order_date',{ascending:false}).limit(500);
      if(error)throw error;
      const rows=(data||[]).filter(o=>!String(o.remarks||'').includes('[ENQUIRY]')&&String(o.verification_status||'pending')==='pending');
      c.innerHTML=`<div class="crm1-toolbar"><span class="crm1-badge warn">${rows.length} verification pending</span></div><div class="tablewrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Mobile</th><th>Amount</th><th>Created</th><th>Action</th></tr></thead><tbody>${rows.map(o=>`<tr><td>#${esc(o.order_no)}</td><td>${esc(o.customers?.customer_name||'-')}</td><td>${esc(o.customers?.mobile||'-')}</td><td>₹${Number(o.total_amount||0).toLocaleString('en-IN')}</td><td>${fmt(o.order_date)}</td><td><button class="crm1-mini crm1VerifyFix" data-id="${esc(o.id)}" data-v="verified">Verify</button> <button class="crm1-mini crm1VerifyFix" data-id="${esc(o.id)}" data-v="rejected">Reject</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">No pending verification</td></tr>'}</tbody></table></div>`;
      c.querySelectorAll('.crm1VerifyFix').forEach(b=>b.onclick=async()=>{
        b.disabled=true;
        const v=b.dataset.v;
        const {error:updateError}=await db.from('orders').update({verification_status:v,verified_by:me?.id||null,verified_at:new Date().toISOString(),order_status:v==='verified'?'new':'cancelled'}).eq('id',b.dataset.id);
        if(updateError){alert(updateError.message);b.disabled=false;return;}
        await db.from('order_status_history').insert({order_id:b.dataset.id,new_status:v,changed_by:me?.id||null});
        await renderVerification();
      });
    }catch(e){c.innerHTML=`<div class="msg">Verification Queue load failed: ${esc(e?.message||e)}</div>`;}
    finally{rendering=false;}
  }

  function activeVerification(){return $('verification')?.classList.contains('active');}
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(/verification queue/i.test(b.textContent||''))setTimeout(renderVerification,80);
  },true);
  const observer=new MutationObserver(()=>{if(activeVerification())setTimeout(renderVerification,0);});
  const start=()=>observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.crm1RenderVerificationFixed=renderVerification;
})();
