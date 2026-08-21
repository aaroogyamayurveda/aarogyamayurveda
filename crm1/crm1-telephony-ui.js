/* CRM1 Telephony UI bridge. Provider-neutral: SIP/X-Lite/VICIdial ready. */
(function(){'use strict';
const URL='https://ielebadardbzmoxantsc.supabase.co',KEY='sb_publishable_0pekrOT6vhYZYQ48wHr7Ag_NPcpobGj';
const $=id=>document.getElementById(id);let db=null,me=null,agent=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(msg){const t=$('toast');if(t){t.textContent=msg;t.style.display='block';setTimeout(()=>t.style.display='none',2600)}else console.log(msg)}
async function waitForSupabase(){for(let i=0;i<20;i++){if(window.supabase?.createClient)return true;await new Promise(r=>setTimeout(r,250))}return false}
async function init(){try{
  if(!(await waitForSupabase()))return;
  db=window.supabase.createClient(URL,KEY);
  const {data:{user}}=await db.auth.getUser();if(!user)return;me=user;inject();await loadAgent();
}catch(e){console.warn('CRM1 telephony init:',e)}}
function inject(){if($('crm1TelephonyBar'))return;const host=document.querySelector('.main');if(!host)return;
 const s=document.createElement('div');s.id='crm1TelephonyBar';s.className='panel';s.style.cssText='margin-bottom:12px;border-left:4px solid #166534';
 s.innerHTML='<div class="crm1-section-title"><div><b>☎ Telephony</b><div class="crm1-muted">CRM call control · SIP / X-Lite / VICIdial ready</div></div><span id="crm1TelStatus" class="crm1-badge info">Checking agent...</span></div><div class="crm1-toolbar"><input id="crm1DialNumber" inputmode="tel" maxlength="10" placeholder="10 digit mobile"><button class="crm1-mini" id="crm1SipCall">Call via SIP</button><button class="crm1-mini" id="crm1PhoneCall">Phone</button><button class="crm1-mini" id="crm1LogCall">Log Call</button></div><div id="crm1TelHint" class="crm1-muted" style="margin-top:6px"></div>';
 host.prepend(s);$('crm1SipCall').onclick=callSip;$('crm1PhoneCall').onclick=callPhone;$('crm1LogCall').onclick=logCall;
}
async function loadAgent(){if(!db||!me)return;const {data,error}=await db.from('crm_telephony_agents').select('provider,extension,sip_username,dialer_agent_code,status,inbound_enabled,outbound_enabled,click_to_call_enabled,auto_answer_enabled,queue_name').eq('agent_id',me.id).maybeSingle();agent=data||null;const st=$('crm1TelStatus'),hint=$('crm1TelHint');if(!st)return;
 if(error||!agent){st.textContent='Telephony not configured';st.className='crm1-badge warn';if(hint)hint.textContent='Admin needs to configure this agent in Telephony Agents.';return}
 st.textContent=(agent.status||'offline')+' · '+(agent.provider||'SIP');st.className='crm1-badge '+(agent.status==='online'?'':'warn');
 if(hint)hint.textContent=(agent.extension?'Ext. '+agent.extension+' · ':'')+(agent.queue_name?'Queue: '+agent.queue_name:'Click-to-call '+(agent.click_to_call_enabled?'enabled':'not enabled'));
}
function number(){return ($('crm1DialNumber')?.value||'').replace(/\D/g,'').slice(-10)}
function valid(n){if(!/^[6-9]\d{9}$/.test(n)){alert('Valid 10 digit mobile number required');return false}return true}
async function callSip(){const n=number();if(!valid(n))return;const uri='sip:+91'+n;try{window.location.href=uri}catch(e){window.open(uri,'_blank')}await log({interaction_type:'call',direction:'outbound',status:'initiated',provider:agent?.provider||'sip',external_call_id:null,details:'SIP click-to-call initiated: '+uri,provider_payload:{dial_number:n,sip_uri:uri,extension:agent?.extension||null}})}
async function callPhone(){const n=number();if(!valid(n))return;window.location.href='tel:+91'+n;await log({interaction_type:'call',direction:'outbound',status:'initiated',provider:'phone',details:'Phone click-to-call initiated: +91'+n,provider_payload:{dial_number:n}})}
async function logCall(){const n=number();if(!valid(n))return;await log({interaction_type:'call',direction:'outbound',status:'logged',provider:agent?.provider||'manual',details:'Manual call log: '+n,provider_payload:{dial_number:n}});toast('Call interaction logged')}
async function log(p){if(!db||!me)return;const {error}=await db.from('crm_interactions').insert({...p,agent_id:me.id,created_by:me.id,started_at:new Date().toISOString()});if(error)console.warn('CRM telephony interaction:',error.message)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
