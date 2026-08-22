/* CRM1 compatibility bootstrap: expose one shared Supabase client to classic CRM modules, then load the preserved business layer. */
(async()=>{
  'use strict';
  try{
    const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    const URL='https://ielebadardbzmoxantsc.supabase.co';
    const KEY='sb_publishable_0pekrOT6vhYZYQ48wHr7Ag_NPcpobGj';
    if(!window.sb) window.sb=createClient(URL,KEY);
    window.supabase=window.supabase||{};
    if(!window.supabase.createClient) window.supabase.createClient=createClient;
    window.dispatchEvent(new CustomEvent('crm1SupabaseReady',{detail:{sb:window.sb}}));
  }catch(e){
    console.error('CRM Supabase compatibility bootstrap failed:',e);
  }
  const s=document.createElement('script');
  s.src='./advanced-business-layer.core.js';
  s.async=false;
  document.head.appendChild(s);
})();