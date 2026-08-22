/* CRM2 Lead Upload reliability patch v3 */
(function(){
  function client(){
    if(!window.supabase) throw new Error('Supabase library load nahi hui.');
    return window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);
  }
  function install(){
    if(typeof window.preview==='function'){
      const originalPreview=window.preview;
      window.preview=async function(){
        try{
          await originalPreview();
          const old=document.getElementById('crm2ImportBtn');
          if(old && !old.dataset.crm2Bound){
            old.dataset.crm2Bound='1';
            old.onclick=function(e){e.preventDefault();window.saveBatch();};
          }
        }catch(e){
          const p=document.getElementById('preview');
          if(p)p.innerHTML='<div class="msg err" style="text-align:left">CSV Error: '+String(e?.message||e)+'</div>';
        }
      };
    }
    window.saveBatch=async function(){
      const btn=document.getElementById('crm2ImportBtn');
      const host=document.getElementById('preview');
      let msg=document.getElementById('crm2UploadMessage');
      try{
        if(btn){btn.disabled=true;btn.textContent='Importing…';}
        const sb2=client();
        const {data:{session},error:sessionError}=await sb2.auth.getSession();
        if(sessionError)throw sessionError;
        const user=session?.user;
        if(!user)throw new Error('CRM session expired. Logout karke dobara login karein.');
        const rows=Array.isArray(window._rows)?window._rows:[];
        if(!rows.length)throw new Error('Import karne ke liye koi valid lead nahi hai.');
        if(!msg && host){msg=document.createElement('div');msg.id='crm2UploadMessage';msg.className='msg';msg.style.textAlign='left';host.prepend(msg);}
        if(msg){msg.textContent='Saving batch…';msg.className='msg';}
        const invalid=Number(window._invalidCount||0);
        const batchPayload={file_name:window._fileName||'crm2-leads.csv',total_records:rows.length+invalid,valid_records:rows.length,invalid_records:invalid,uploaded_by:user.id};
        const bres=await sb2.from('lead_batches').insert(batchPayload).select('id').single();
        if(bres.error)throw new Error('Batch save failed: '+bres.error.message);
        const payload=rows.map(x=>({mobile:String(x.mobile||''),customer_name:x.customer_name||null,product_name:x.product_name||null,address:x.address||null,city:x.city||null,state:x.state||null,pincode:x.pincode||null,batch_id:bres.data.id,lead_status:'new',assigned_to:null,assigned_at:null,worked_at:null}));
        const lres=await sb2.from('leads').insert(payload);
        if(lres.error)throw new Error('Lead save failed: '+lres.error.message);
        if(msg){msg.textContent='Batch imported successfully. '+rows.length+' leads saved.';msg.className='msg ok';}
        window.crm2LastBatchId=bres.data.id;
      }catch(e){
        if(!msg && host){msg=host;}
        if(msg){msg.textContent='Import Error: '+String(e?.message||e);msg.className='msg err';msg.style.textAlign='left';}
      }finally{
        if(btn){btn.disabled=false;btn.textContent='Import Valid Leads';}
      }
    };
    const b=document.getElementById('crm2ImportBtn');
    if(b && !b.dataset.crm2Bound){b.dataset.crm2Bound='1';b.onclick=function(e){e.preventDefault();window.saveBatch();};}
  }
  install();
  setTimeout(install,300);
  setTimeout(install,1000);
  setTimeout(install,2500);
  setTimeout(install,5000);
})();