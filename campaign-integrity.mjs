import {sourceSynthetic} from './provenance.mjs?v=20261023-final-1';
const ref=s=>typeof s.originalCampaignRef==='string'?s.originalCampaignRef.trim():'';
export function originalReferenceConflict(campaign){
 const references=[...new Set((campaign.sources||[]).map(ref).filter(Boolean))];
 return {conflict:references.length>1,references};
}
export function splitOriginalReferences(campaign,{makeId=()=>crypto.randomUUID(),now=new Date().toISOString()}={}){
 if(!originalReferenceConflict(campaign).conflict)throw new Error('Разные исходные ID в этом деле не найдены.');
 const groups=new Map();
 (campaign.sources||[]).forEach((s,i)=>{const original=ref(s),key=original?'ref:'+original:'unassigned:'+i;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);});
 return [...groups.values()].map(sources=>{
  const original=ref(sources[0]);
  const id='split-'+makeId(),flags=sources.map(s=>sourceSynthetic(s,campaign.synthetic)),pure=flags.every(Boolean);
  return {id,title:`${campaign.title||'Проверка'} · ${original||'источник без ID'}`.slice(0,120),organizer:campaign.organizer||'Не указан',platform:campaign.platform||'Импорт',status:'new',synthetic:pure,containsSyntheticSources:!pure&&flags.some(Boolean),manualGrouping:false,parentCaseId:campaign.id,createdAt:now,groupingNotes:['Раздельная копия по исходному явно указанному ID. Подлинность и актуальность условий требуют проверки.','Исходное дело и его решения сохранены.'],sources:sources.map(s=>({...s,id:'split-source-'+makeId(),originalId:s.originalId||s.id,campaignRef:id,synthetic:sourceSynthetic(s,campaign.synthetic)}))};
 });
}
