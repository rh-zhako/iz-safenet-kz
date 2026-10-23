import {normalizeInputDrafts} from './input-drafts.mjs?v=20261023-final-1';
import {analyzeBatch,BATCH_LIMITS} from './batch.mjs?v=20261023-final-1';

export const BACKUP_FORMAT='iz-safenet-backup';
export const BACKUP_LIMITS=Object.freeze({bytes:50*1024*1024,campaigns:2000,sources:10000,sourcesPerCampaign:50,textPerSource:60000});
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).byteLength;
const abortError=()=>Object.assign(new Error('Восстановление отменено. Сохранённые проверки не изменены.'),{name:'AbortError'});
export const isBackup=value=>value?.format===BACKUP_FORMAT;

export function readBackup(value,{sizeBytes=0}={}){
 if(!isBackup(value)||value.schemaVersion!==2)throw new Error('Неизвестная версия резервной копии.');
 if(sizeBytes>BACKUP_LIMITS.bytes)throw new Error('Резервная копия должна быть не больше 50 МБ.');
 const campaigns=value.campaigns;
 const inputDrafts=normalizeInputDrafts(value.inputDrafts);
 if(!Array.isArray(campaigns)||(!campaigns.length&&!Object.keys(inputDrafts).length)||campaigns.length>BACKUP_LIMITS.campaigns)throw new Error('Резервная копия должна содержать от 1 до 2 000 дел.');
 let sources=0;
 for(const [i,c]of campaigns.entries()){
  if(!c||typeof c!=='object'||!Array.isArray(c.sources)||!c.sources.length||c.sources.length>BACKUP_LIMITS.sourcesPerCampaign)throw new Error(`Дело ${i+1}: нужны от 1 до 50 материалов.`);
  for(const source of c.sources){
   if(typeof source?.text!=='string'||!source.text.trim()||source.text.length>BACKUP_LIMITS.textPerSource)throw new Error(`Дело ${i+1}: неверный текст материала.`);
   sources++;
  }
 }
 if(sources>BACKUP_LIMITS.sources)throw new Error('В резервной копии доступно до 10 000 материалов.');
 if(value.counts?.campaigns!==campaigns.length||value.counts?.sources!==sources)throw new Error('Состав резервной копии не совпадает с её описанием. Возможно, файл повреждён.');
 return {campaigns,inputDrafts,counts:{campaigns:campaigns.length,sources}};
}

export function createBackup(campaigns,{now=new Date().toISOString(),inputDrafts={}}={}){
 // The analysis is derived data. Recalculate it on restore instead of duplicating
 // every context/evidence quote, which could make a valid database unimportable.
 const records=campaigns.map(({analysis,relationships,networkObservations,...record})=>record);
 const value={format:BACKUP_FORMAT,schemaVersion:2,exportedAt:now,inputDrafts:normalizeInputDrafts(inputDrafts),counts:{campaigns:records.length,sources:records.reduce((n,c)=>n+(c.sources?.length||0),0)},campaigns:records};
 readBackup(value);
 if(bytes(value)>BACKUP_LIMITS.bytes)throw new Error('Копия больше 50 МБ. Скачайте отдельные дела через JSON; общий файл не создан.');
 return value;
}

// A case-bound input draft is usable after restore only with its parent case.
export function createDraftBackup(campaigns,inputDrafts,options={}){
 const drafts=normalizeInputDrafts(inputDrafts);
 const parentIds=new Set(Object.keys(drafts).map(key=>key.slice(key.indexOf(':')+1)).filter(id=>id!=='new'));
 const parents=campaigns.filter(c=>parentIds.has(c.id));
 if(parents.length!==parentIds.size)throw new Error('Черновик дополнений ссылается на недоступное дело. Скачайте текущий снимок для восстановления.');
 return createBackup(parents,{...options,inputDrafts:drafts});
}

export function planRestore(campaigns){
 const batches=[];let batch=[],sources=0,characters=0;
 for(const c of campaigns){
  const n=c.sources.length,chars=c.sources.reduce((a,s)=>a+s.text.length,0);
  if(n>BATCH_LIMITS.sources||chars>BATCH_LIMITS.characters)throw new Error('Одно дело превышает лимит фоновой проверки.');
  if(batch.length&&(batch.length+1>BATCH_LIMITS.campaigns||sources+n>BATCH_LIMITS.sources||characters+chars>BATCH_LIMITS.characters)){batches.push(batch);batch=[];sources=characters=0;}
  batch.push(c);sources+=n;characters+=chars;
 }
 if(batch.length)batches.push(batch);
 return batches;
}

export async function analyzeRestore(campaigns,{signal,onProgress=()=>{},analyze=analyzeBatch,...options}={}){
 const batches=planRestore(campaigns),results=[];
 for(let index=0;index<batches.length;index++){
  if(signal?.aborted)throw abortError();
  const offset=results.length,batch=batches[index];
  const part=await analyze(batch,{...options,signal,onProgress:p=>onProgress({...p,done:offset+p.done,total:campaigns.length,batch:index+1,batches:batches.length})});
  if(!Array.isArray(part)||part.length!==batch.length)throw new Error('Получена неполная часть резервной копии.');
  results.push(...part);
 }
 if(signal?.aborted)throw abortError();
 return results;
}
