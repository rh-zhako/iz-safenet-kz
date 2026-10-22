// Local-only text analysis. Images stay on the main thread and are never cloned
// into this worker. Results are committed by the caller only after completion.
import {analyzeCampaign, ENGINE_VERSION} from './engine.mjs?v=20261023-final-1';

export const BATCH_LIMITS = Object.freeze({campaigns:100, sources:300, characters:15000000});
const cancelled = () => Object.assign(new Error('Импорт отменён. Сохранённые проверки не изменены.'), {name:'AbortError'});
export function batchPayload(campaigns) {
  if (!Array.isArray(campaigns) || !campaigns.length || campaigns.length>BATCH_LIMITS.campaigns) throw new Error('За один раз можно проверить до 100 кампаний.');
  let sources=0, characters=0;
  const ids=new Set();
  const result=campaigns.map(c=>{
    if(!c || typeof c.id!=='string' || ids.has(c.id) || !Array.isArray(c.sources) || !c.sources.length) throw new Error('У каждой кампании нужны уникальный ID и материалы.');
    ids.add(c.id);
    return {id:c.id,campaignRef:c.campaignRef,manualGrouping:c.manualGrouping,groupingNotes:c.groupingNotes,groupingConflicts:c.groupingConflicts,synthetic:c.synthetic,sources:c.sources.map(s=>{
      if(typeof s.text!=='string')throw new Error('У материала отсутствует текст.');
      sources++;characters+=s.text.length;
      return {id:s.id,text:s.text,campaignRef:s.campaignRef,account:s.account,author:s.author,url:s.url,kind:s.kind,originalCampaignRef:s.originalCampaignRef,originalReplyTo:s.originalReplyTo};
    })};
  });
  if(sources>BATCH_LIMITS.sources || characters>BATCH_LIMITS.characters)throw new Error('За один раз доступны до 300 материалов и 15 млн символов.');
  return result;
}

export async function analyzeBatch(campaigns,{signal,onProgress=()=>{},workerFactory}={}) {
  const payload=batchPayload(campaigns);
  if(signal?.aborted)throw cancelled();
  const make=workerFactory || (typeof Worker==='function'?()=>new Worker(new URL('./analysis-worker.mjs',import.meta.url),{type:'module'}):null);
  let worker;
  if(make){try{worker=make();}catch{/* A blocked Worker can use the yielding local fallback. */}}
  const analyses=worker?await new Promise((resolve,reject)=>{
    const finish=(error,value)=>{signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(value);};
    const abort=()=>finish(cancelled());
    signal?.addEventListener('abort',abort,{once:true});
    worker.onmessage=({data})=>{
      if(data.type==='progress')onProgress({done:data.done,total:payload.length,mode:'worker'});
      if(data.type==='done')data.engineVersion===ENGINE_VERSION?finish(null,data.analyses):finish(new Error('Версия фонового анализа изменилась. Обновите страницу.'));
      if(data.type==='error')finish(new Error(data.message||'Не удалось проверить материалы.'));
    };
    worker.onerror=()=>finish(new Error('Фоновый анализ прерван. Повторите импорт или обновите страницу.'));
    worker.postMessage({campaigns:payload});
  }):await(async()=>{
    const result=[];
    for(let i=0;i<payload.length;i++){
      if(signal?.aborted)throw cancelled();
      result.push(analyzeCampaign(payload[i]).analysis);
      onProgress({done:i+1,total:payload.length,mode:'yielding-local'});
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    if(signal?.aborted)throw cancelled();
    return result;
  })();
  if(!Array.isArray(analyses)||analyses.length!==campaigns.length)throw new Error('Получен неполный результат проверки.');
  return campaigns.map((c,i)=>({...c,analysis:analyses[i]}));
}
