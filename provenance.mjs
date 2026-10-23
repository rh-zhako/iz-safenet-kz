// Preserve the distinction between a pure demo and locally added user materials.
export const sourceSynthetic=(source,campaignSynthetic=false)=>typeof source.synthetic==='boolean'?source.synthetic:campaignSynthetic===true;
export function appendCampaignSources(campaign,sources,now=new Date().toISOString()){
 if(campaign.synthetic===true&&sources.some(s=>s.synthetic!==true)){
  campaign.sources=campaign.sources.map(s=>({...s,synthetic:true}));
  campaign.synthetic=false;
 }
 campaign.sources.push(...sources);
 campaign.containsSyntheticSources=campaign.synthetic!==true&&campaign.sources.some(s=>s.synthetic===true);
 campaign.manualGrouping=true;campaign.updatedAt=now;
 return campaign;
}
