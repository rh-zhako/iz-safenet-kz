import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {analyzeCampaign,ENGINE_VERSION} from '../dist/engine.mjs';

const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root));
const json=p=>JSON.parse(read(p));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const protocol=json('evaluation/semantic-hybrid-protocol.json');
if(!process.argv.includes('--run')){
  console.log('Exploratory experiment on disclosed synthetic data. Use --run; optional --probe for first 12 cases. Dependencies: experiments/semantic/package.json. Production engine remains frozen.');
  process.exit(0);
}
if(hash(read('dist/engine.mjs'))!==protocol.baselineEngineSha256||hash(read(protocol.dataset))!==protocol.datasetSha256)throw Error('Protocol inputs changed.');
const {AutoTokenizer,AutoModelForSequenceClassification,env}=await import('../artifacts/semantic-experiment/node_modules/@huggingface/transformers/src/transformers.js');
env.cacheDir=new URL('../artifacts/semantic-experiment/model-cache/',import.meta.url).pathname;
env.allowLocalModels=false;
console.log(JSON.stringify({phase:'loading',model:protocol.model,revision:protocol.revision,device:'cpu',dtype:'q8'}));
const started=performance.now();
const opts={revision:protocol.revision};
const tokenizer=await AutoTokenizer.from_pretrained(protocol.model,opts);
const model=await AutoModelForSequenceClassification.from_pretrained(protocol.model,{...opts,dtype:'q8',device:'cpu',session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
const loadMs=performance.now()-started;
const keys=Object.keys(protocol.hypotheses),hypotheses=Object.values(protocol.hypotheses),core=['prize','payment','random'],negative=['free','judged','warning'];
const corpus=json(protocol.dataset),probe=process.argv.includes('--probe');
const cases=probe?corpus.cases.slice(0,12):corpus.cases;
const outputs=[],times=[];
const labelIndex=name=>Number(Object.entries(model.config.id2label).find(([,label])=>label.toLowerCase()===name)?.[0]);
const entail=labelIndex('entailment'),neutral=labelIndex('neutral'),contradiction=labelIndex('contradiction');
if(![entail,neutral,contradiction].every(Number.isInteger))throw Error('Unrecognized NLI labels.');
const yes=(scores,key)=>{const s=scores[key];return s.entailment/(s.entailment+s.contradiction)>=.7&&s.entailment>=.3&&s.entailment>s.neutral;};
const no=scores=>negative.some(key=>{const s=scores[key];return s.entailment/(s.entailment+s.contradiction)>=.8&&s.entailment>=.5;});
const scoreRisk=scores=>{const n=core.filter(key=>yes(scores,key)).length;return n===3&&!no(scores)?'high':n>=2?'medium':'low';};
const hybridRisk=(analysis,scores)=>{
 if(analysis.risk==='high')return 'high';
 if(analysis.contradictions.length||analysis.signals.free.state==='found'||analysis.signals.warning.state==='found'||no(scores))return analysis.risk;
 const n=core.filter(key=>analysis.signals[key].state==='found'||yes(scores,key)).length;
 return n===3?'high':n>=2?'medium':analysis.risk;
};
for(const c of cases){
  const source=c.sources.map(s=>s.text).join('\n');
  const t=performance.now();
  const input=tokenizer(hypotheses.map(()=>source),{text_pair:hypotheses,padding:true,truncation:true,max_length:512});
  const out=await model(input),data=Array.from(out.logits.data),scores={};
  for(let i=0;i<keys.length;i++){
    const logits=data.slice(i*3,i*3+3),max=Math.max(...logits),exp=logits.map(v=>Math.exp(v-max)),sum=exp.reduce((a,b)=>a+b,0),probs=exp.map(v=>v/sum);
    scores[keys[i]]={entailment:probs[entail],neutral:probs[neutral],contradiction:probs[contradiction]};
  }
  const elapsedMs=performance.now()-t;times.push(elapsedMs);
  const ruleAnalysis=analyzeCampaign(c).analysis,rule=ruleAnalysis.risk,predicted=scoreRisk(scores),hybrid=hybridRisk(ruleAnalysis,scores);
  outputs.push({id:c.id,language:c.language,expected:c.expectedRisk,rules:rule,predicted,hybrid,scores,inputTokens:Number(input.input_ids.dims.at(-1)),atTokenLimit:Number(input.input_ids.dims.at(-1))>=512,elapsedMs});
  if(outputs.length%10===0)console.log(JSON.stringify({phase:'inference',done:outputs.length,total:cases.length}));
}
await model.dispose();
function score(key){
  const matrix=Object.fromEntries(['high','medium','low'].map(k=>[k,{high:0,medium:0,low:0}]));
  let tp=0,fp=0,fn=0,tn=0,correct=0;
  for(const c of outputs){const predicted=c[key];matrix[c.expected][predicted]++;if(predicted===c.expected)correct++;if(c.expected==='high')predicted==='high'?tp++:fn++;else predicted==='high'?fp++:tn++;}
  const macroF1=['high','medium','low'].reduce((sum,k)=>{const t=matrix[k][k],p=Object.values(matrix).reduce((n,row)=>n+row[k],0),actual=Object.values(matrix[k]).reduce((a,b)=>a+b,0);return sum+(p+actual?2*t/(p+actual):0);},0)/3;
  return {total:outputs.length,correct,accuracy:correct/outputs.length,tp,fp,fn,tn,precision:tp+fp?tp/(tp+fp):null,recall:tp/(tp+fn),falsePositiveRate:fp/(fp+tn),macroF1,matrix};
}
times.sort((a,b)=>a-b);
const neural=score('predicted'),hybrid=score('hybrid'),baseline=score('rules'),paired={bothCorrect:0,corrected:0,worsened:0,bothWrong:0};
for(const c of outputs)paired[c.rules===c.expected?(c.hybrid===c.expected?'bothCorrect':'worsened'):(c.hybrid===c.expected?'corrected':'bothWrong')]++;
const report={schemaVersion:1,at:new Date().toISOString(),protocol,protocolSha256:hash(read('evaluation/semantic-hybrid-protocol.json')),scriptSha256:hash(read('scripts/measure-semantic-hybrid.mjs')),baselineEngine:ENGINE_VERSION,probe,scope:'Exploratory fixed-protocol comparison on previously disclosed synthetic v5; not a fresh independent benchmark, human annotation, real corpus, or production accuracy.',neural,hybrid,baseline,paired,byLanguage:Object.fromEntries([...new Set(outputs.map(c=>c.language))].map(language=>[language,outputs.filter(c=>c.language===language).reduce((a,c)=>({n:a.n+1,neuralCorrect:a.neuralCorrect+Number(c.expected===c.predicted),hybridCorrect:a.hybridCorrect+Number(c.expected===c.hybrid),rulesCorrect:a.rulesCorrect+Number(c.expected===c.rules)}),{n:0,neuralCorrect:0,hybridCorrect:0,rulesCorrect:0})])),performance:{runtime:process.version,platform:process.platform,architecture:process.arch,loadMs,cases:outputs.length,p50Ms:times[Math.floor(times.length*.5)],p95Ms:times[Math.min(times.length-1,Math.floor(times.length*.95))],scope:'CPU inference of six NLI hypotheses per complete concatenated synthetic case, two intra-op threads. Excludes browser runtime, OCR and user storage.'},tokenLimitCases:outputs.filter(c=>c.atTokenLimit).length,productionEngineChanged:false,limitations:['Same disclosed v5 dataset used by product team; no unseen-data claim.','NLI pretrained on another task. Scores are not calibrated fraud probabilities.','Kazakh and transliteration task performance is unvalidated.','512-token maximum can truncate long contexts.','A model does not verify source ownership, authenticity or permission.'],cases:outputs};
mkdirSync(new URL('artifacts/semantic-experiment/',root),{recursive:true});
const path=probe?'artifacts/semantic-experiment/hybrid-probe-report.json':'evaluation/semantic-hybrid-report.json';
if(existsSync(new URL(path,root)))throw Error('Experiment report already exists; preserve original before a new protocol.');
writeFileSync(new URL(path,root),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({report:path,neural,hybrid,baseline,paired,byLanguage:report.byLanguage,performance:report.performance,tokenLimitCases:report.tokenLimitCases},null,2));
