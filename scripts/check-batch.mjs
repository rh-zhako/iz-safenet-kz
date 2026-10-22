import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {batchPayload,analyzeBatch,BATCH_LIMITS} from '../dist/batch.mjs';
import {analyzeCampaign,ENGINE_VERSION} from '../dist/engine.mjs';
const checks=[];
async function check(name,fn){try{await fn();checks.push({name,passed:true});}catch(e){checks.push({name,passed:false,message:e.message});}}
const c={id:'batch-one',title:'Original title',manualGrouping:true,sources:[{id:'s1',text:'Розыгрыш телефона. Для участия купите билет. Победитель случайный.',campaignRef:'batch-one',image:'data:image/jpeg;base64,PRIVATEIMAGE'}]};
await check('payload does not copy images',()=>assert.equal(batchPayload([c])[0].sources[0].image,undefined));
await check('payload preserves source linkage',()=>assert.equal(batchPayload([c])[0].sources[0].campaignRef,c.id));
await check('payload preserves original source text',()=>assert.equal(batchPayload([c])[0].sources[0].text,c.sources[0].text));
await check('reject empty batch',()=>assert.throws(()=>batchPayload([])));
await check('reject duplicate campaign ids',()=>assert.throws(()=>batchPayload([c,c])));
await check('reject missing source text',()=>assert.throws(()=>batchPayload([{...c,sources:[{}]}])));
await check('reject oversized batch',()=>assert.throws(()=>batchPayload(Array.from({length:101},(_,i)=>({...c,id:String(i)})))));
await check('reject too many materials',()=>assert.throws(()=>batchPayload([{...c,sources:Array.from({length:301},()=>c.sources[0])}])));
await check('explicit character limit',()=>assert.equal(BATCH_LIMITS.characters,15000000));
await check('yielding fallback equals synchronous engine',async()=>assert.deepEqual((await analyzeBatch([c]))[0].analysis,analyzeCampaign(c).analysis));
await check('analysis output keeps image on original campaign',async()=>assert.equal((await analyzeBatch([c]))[0].sources[0].image,c.sources[0].image));
await check('analysis does not mutate input',async()=>{const prior=JSON.stringify(c);await analyzeBatch([c]);assert.equal(JSON.stringify(c),prior);});
await check('fallback progress is ordered',async()=>{const p=[];await analyzeBatch([c,{...c,id:'two'}],{onProgress:x=>p.push(x.done)});assert.deepEqual(p,[1,2]);});
await check('pre-cancel does no work',async()=>{const a=new AbortController();a.abort();await assert.rejects(analyzeBatch([c],{signal:a.signal}),{name:'AbortError'});});
await check('fallback cancellation is atomic',async()=>{const a=new AbortController();await assert.rejects(analyzeBatch([c,{...c,id:'two'}],{signal:a.signal,onProgress:()=>a.abort()}),{name:'AbortError'});assert.equal(c.analysis,undefined);});
class MockWorker{
  terminate(){this.terminated=true;}
  postMessage(data){this.received=data;queueMicrotask(()=>{if(this.stall)return;this.onmessage({data:{type:'progress',done:1}});this.onmessage({data:{type:'done',engineVersion:this.version||ENGINE_VERSION,analyses:data.campaigns.map(x=>analyzeCampaign(x).analysis)}});});}
}
await check('worker path matches engine',async()=>{const w=new MockWorker();const out=await analyzeBatch([c],{workerFactory:()=>w});assert.deepEqual(out[0].analysis,analyzeCampaign(c).analysis);assert.equal(w.terminated,true);assert.equal(w.received.campaigns[0].sources[0].image,undefined);});
await check('worker version mismatch is rejected',async()=>{const w=new MockWorker();w.version='old';await assert.rejects(analyzeBatch([c],{workerFactory:()=>w}),/Версия/);assert.equal(w.terminated,true);});
await check('worker abort terminates without returning partial result',async()=>{const w=new MockWorker();w.stall=true;const a=new AbortController();const p=analyzeBatch([c],{workerFactory:()=>w,signal:a.signal});a.abort();await assert.rejects(p,{name:'AbortError'});assert.equal(w.terminated,true);});
await check('blocked worker creation uses local fallback',async()=>assert.equal((await analyzeBatch([c],{workerFactory:()=>{throw Error('blocked')}})).length,1));
await check('worker error is visible',async()=>{const w=new MockWorker();w.postMessage=()=>queueMicrotask(()=>w.onerror());await assert.rejects(analyzeBatch([c],{workerFactory:()=>w}),/прерван/);assert.equal(w.terminated,true);});
const conflict={id:'batch-conflict',manualGrouping:true,groupingConflicts:[{reason:'original IDs differ'}],sources:[{id:'one',text:'Розыгрыш книги.',campaignRef:'batch-conflict',originalCampaignRef:'ONE',originalReplyTo:'root-one'},{id:'two',text:'Для участия оплатите билет. Победитель случайный.',campaignRef:'batch-conflict',originalCampaignRef:'TWO'}]};
await check('worker payload preserves original campaign membership',()=>assert.deepEqual(batchPayload([conflict])[0].sources.map(s=>s.originalCampaignRef),['ONE','TWO']));
await check('worker payload preserves grouping provenance',()=>{const p=batchPayload([conflict])[0];assert.deepEqual(p.groupingConflicts,conflict.groupingConflicts);assert.equal(p.sources[0].originalReplyTo,'root-one');});
await check('fallback conflict guard equals synchronous engine',async()=>{const r=(await analyzeBatch([conflict]))[0];assert.equal(r.analysis.risk,'medium');assert.deepEqual(r.analysis,analyzeCampaign(conflict).analysis);});
await check('worker conflict guard equals synchronous engine',async()=>{const r=(await analyzeBatch([conflict],{workerFactory:()=>new MockWorker()}))[0];assert.equal(r.analysis.risk,'medium');assert.deepEqual(r.analysis,analyzeCampaign(conflict).analysis);});
const report={at:new Date().toISOString(),scope:'Functional local batch behavior, not model accuracy or server load.',passed:checks.filter(x=>x.passed).length,total:checks.length,checks};
writeFileSync(new URL('../evaluation/batch-checks.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.passed!==report.total)process.exitCode=1;
