import {analyzeCampaign,ENGINE_VERSION} from './engine.mjs?v=20261023-final-1';
import {materialStamp} from './review.mjs?v=20261023-final-1';

export const SENSITIVITY_LIMITS=Object.freeze({sources:12,characters:60000});
const keys=['prize','payment','random','income','collection','free'];
const core=['prize','payment','random'];
const rank={low:0,medium:1,high:2};
const active=(c,s)=>!s.campaignRef||!String(c.campaignRef??c.id??'')||String(s.campaignRef)===String(c.campaignRef??c.id??'');
const state=(a,k)=>a.signals[k].state;
export function sourceSensitivityAvailable(c){
 if(!Array.isArray(c?.sources)||!c.sources.length)return {available:false,reason:'Нужен хотя бы один материал.'};
 if(c.sources.length>SENSITIVITY_LIMITS.sources)return {available:false,reason:'Для этой проверки доступно до 12 материалов. Разделите большую кампанию на обоснованные дела.'};
 if(c.sources.some(s=>typeof s.text!=='string')||c.sources.reduce((n,s)=>n+s.text.length,0)>SENSITIVITY_LIMITS.characters)return {available:false,reason:'Для этой проверки доступно до 60 000 символов суммарно.'};
 if(new Set(c.sources.map(s=>s.id)).size!==c.sources.length||c.sources.some(s=>typeof s.id!=='string'||!s.id))return {available:false,reason:'Источникам нужны уникальные ID.'};
 return {available:true,reason:''};
}
export function analyzeSourceSensitivity(campaign,{analyze=analyzeCampaign,now=new Date().toISOString()}={}){
 const check=sourceSensitivityAvailable(campaign);if(!check.available)throw Error(check.reason);
 const original=analyze(campaign),base=original.analysis;
 const included=original.sources.filter(s=>active(original,s)&&s.text.trim());
 const rows=original.sources.map((source,index)=>{
  const remaining=original.sources.filter((_,i)=>i!==index),eligible=active(original,source)&&!!source.text.trim();
  const hasData=remaining.some(s=>active(original,s)&&s.text.trim());
  const without=analyze({...original,sources:remaining}).analysis;
  const changes=keys.filter(k=>state(base,k)!==state(without,k)).map(key=>({key,before:state(base,key),after:state(without,key)}));
  const lostCore=core.filter(k=>state(base,k)==='found'&&state(without,k)!=='found');
  const evidence=lostCore.flatMap(key=>base.signals[key].evidence.filter(e=>e.sourceId===source.id&&Number.isInteger(e.start)&&Number.isInteger(e.end)&&source.text.slice(e.start,e.end)===e.quote).map(e=>({key,sourceId:source.id,quote:e.quote,start:e.start,end:e.end})));
  return {sourceId:source.id,sourceIndex:index,included:eligible,remainingSources:remaining.length,remainingIncluded:remaining.filter(s=>active(original,s)&&s.text.trim()).length,withoutRisk:hasData?without.risk:null,withoutScore:hasData?without.score:null,essentialForHigh:base.risk==='high'&&eligible&&(!hasData||without.risk!=='high'),raisedByExclusion:hasData&&rank[without.risk]>rank[base.risk],changes,lostCore,evidence,remainingContradictions:without.contradictions};
 });
 return {schemaVersion:1,type:'source-sensitivity',at:now,engineVersion:ENGINE_VERSION,materialStamp:materialStamp(original),baselineRisk:base.risk,baselineScore:base.score,includedSources:included.length,rows,essentialSources:rows.filter(r=>r.essentialForHigh).length,changedSources:rows.filter(r=>r.withoutRisk!==null&&r.withoutRisk!==base.risk).length,method:'Leave one supplied source out, rerun the same frozen detector. No source is edited or deleted.',limitations:['This measures detector behavior, not authenticity, causality, legal status, or the probability of fraud.','An unchanged result does not establish independent corroboration. Duplicate sources can repeat the same claim.','A higher result after excluding a contradiction does not justify discarding that source.','All original sources and analyst decisions stay unchanged.']};
}
