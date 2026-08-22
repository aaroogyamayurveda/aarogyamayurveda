/* CRM2 Lead Queue module - isolated from CRM1 stable workflows */
(function(){
  'use strict';
  const state={batch:null,rows:[]};
  function esc(v){return String(v??'').replace(/[&<>'"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s]));}
  function normalizeKey(s){return String(s||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');}
  const aliases={mobile:['mobile','mobilenumber','phone','phonenumber','customerphone'],customer_name:['customername','name','customer'],product_name:['product','productname'],address:['address','fulladdress'],city:['city'],state:['state'],pincode:['pincode','pin','zipcode']};
  function mapHeaders(headers){const out={}; headers.forEach((h,i)=>{const k=normalizeKey(h); Object.keys(aliases).forEach(f=>{if(aliases[f].includes(k)&&out[f]===undefined)out[f]=i;});}); return out;}
  function validMobile(v){return /^[6-9]\d{9}$/.test(String(v||'').replace(/\D/g,''));}
  function parseCsv(text){
    const rows=[]; let row=[],cell='',q=false;
    for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1]; if(c==='"'){if(q&&n==='"'){cell+='"';i++;}else q=!q;}else if(c===','&&!q){row.push(cell.trim());cell='';}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell.trim());if(row.some(x=>x!==''))rows.push(row);row=[];cell='';}else cell+=c;}
    row.push(cell.trim()); if(row.some(x=>x!==''))rows.push(row); return rows;
  }
  function importText(text,name){const raw=parseCsv(text);if(raw.length<2)throw new Error('CSV में header और कम से कम एक record होना चाहिए'); const map=mapHeaders(raw[0]);if(map.mobile===undefined)throw new Error('Mobile Number column नहीं मिला');
    state.rows=raw.slice(1).map((r,i)=>{const get=f=>map[f]===undefined?'':String(r[map[f]]||'').trim();return {row_no:i+2,mobile:get('mobile').replace(/\D/g,''),customer_name:get('customer_name'),product_name:get('product_name'),address:get('address'),city:get('city'),state:get('state'),pincode:get('pincode').replace(/\D/g,''),status:'pending'};});
    state.batch={file_name:name,total:state.rows.length,valid:state.rows.filter(x=>validMobile(x.mobile)).length,invalid:state.rows.filter(x=>!validMobile(x.mobile)).length};return state.batch;
  }
  function render(container){container.innerHTML=`<div class="title"><div><h2>Lead Import & Assignment</h2><div class="sub">CSV upload करके agent-wise daily calling queue तैयार करें</div></div></div><div class="panel"><h3>1. CSV Upload</h3><div class="field"><label>CSV File</label><input id="crm2LeadFile" type="file" accept=".csv,text/csv"></div><div id="crm2LeadSummary" class="sub">Required: Mobile Number. Optional: Customer Name, Product, Address, City, State, Pincode.</div></div><div class="panel"><h3>2. Imported Preview</h3><div id="crm2LeadPreview" class="empty">पहले CSV select करें</div></div>`;
    container.querySelector('#crm2LeadFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{try{const b=importText(reader.result,f.name);const valid=state.rows.filter(x=>validMobile(x.mobile));const invalid=state.rows.filter(x=>!validMobile(x.mobile));container.querySelector('#crm2LeadSummary').innerHTML=`File: <b>${esc(b.file_name)}</b> · Total: <b>${b.total}</b> · Valid: <b>${b.valid}</b> · Invalid: <b>${b.invalid}</b>`;container.querySelector('#crm2LeadPreview').innerHTML=`<div class="tablewrap"><table><thead><tr><th>#</th><th>Customer</th><th>Mobile</th><th>Product</th><th>Status</th></tr></thead><tbody>${state.rows.slice(0,100).map(x=>`<tr><td>${x.row_no}</td><td>${esc(x.customer_name||'-')}</td><td>${esc(x.mobile||'-')}</td><td>${esc(x.product_name||'-')}</td><td><span class="pill">${validMobile(x.mobile)?'Valid':'Invalid'}</span></td></tr>`).join('')}</tbody></table></div><div class="sub" style="margin-top:10px">Preview shows first ${Math.min(100,state.rows.length)} records. Persistence/agent assignment will use CRM2 Supabase tables.</div>`;}catch(err){container.querySelector('#crm2LeadPreview').innerHTML=`<div class="empty">${esc(err.message)}</div>`;}};reader.readAsText(f);});
  }
  window.CRM2Leads={render,importText,getState:()=>state,validMobile};
})();
