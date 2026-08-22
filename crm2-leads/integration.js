/* CRM2 Lead Workflow Integration Layer
   Shared helpers used when wiring lead queue actions into the main CRM.
*/
window.CRM2LeadFlow={
  activeLead:null,
  async openLead(supabase,leadId){
    const {data,error}=await supabase.from('leads').select('*').eq('id',leadId).single();
    if(error) throw error;
    this.activeLead=data;
    sessionStorage.setItem('crm2_active_lead',JSON.stringify(data));
    return data;
  },
  async markWorked(supabase,leadId,patch={}){
    return supabase.from('leads').update({status:'worked',worked_at:new Date().toISOString(),...patch}).eq('id',leadId);
  },
  async setCallback(supabase,leadId,callbackAt){
    return supabase.from('leads').update({status:'callback',callback_at:callbackAt,worked_at:new Date().toISOString()}).eq('id',leadId);
  },
  async createOrderLink(supabase,leadId,orderId){
    return supabase.from('leads').update({status:'ordered',order_id:orderId,worked_at:new Date().toISOString()}).eq('id',leadId);
  },
  clear(){this.activeLead=null;sessionStorage.removeItem('crm2_active_lead')}
};