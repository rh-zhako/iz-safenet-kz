import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {analyzeCampaign,ENGINE_VERSION} from '../dist/engine.mjs';
import {analyzeCampaign as baselineAnalyze,ENGINE_VERSION as baselineVersion} from '../evaluation/engine-v1.4-snapshot.mjs';
import {evaluate} from '../dist/evaluation.mjs';
import {evaluationCampaigns} from '../dist/demo-data.mjs';
const root=new URL('../',import.meta.url), read=p=>readFileSync(new URL(p,root)), json=p=>JSON.parse(read(p)), hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=json('evaluation/engine-v1.5-freeze.json'),engineSha=hash(read('dist/engine.mjs'));
if(engineSha!==freeze.engineSha256||ENGINE_VERSION!==freeze.engineVersion)throw new Error('Frozen engine changed. A fresh blinded corpus is required.');
const raw=read('evaluation/independent-v3.json'),sha=hash(raw),checks=read('evaluation/independent-v3.sha256').toString();
if(!checks.includes(sha))throw new Error('Frozen independent corpus changed.');
const fresh=JSON.parse(raw),prior=json('evaluation/challenge-v1.json'),v2=json('evaluation/independent-v2.json');
// Corpus uses a display ID plus a distinct canonical reference on its sources.
// Map only unanimous explicit references; never rewrite source refs or labels.
const freshCases=fresh.cases.map(c=>{const refs=[...new Set(c.sources.map(s=>s.campaignRef).filter(Boolean))];return refs.length===1?{...c,campaignRef:refs[0]}:c;});
const ci=(success,total)=>{if(!total)return null;const z=1.96,p=success/total,d=1+z*z/total,m=(p+z*z/(2*total))/d,h=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;return [Math.max(0,m-h),Math.min(1,m+h)];};
const ratio=(n,d)=>d?n/d:null;
function score(cases,name,analyze=analyzeCampaign,version=ENGINE_VERSION){
 const r=evaluate(cases,analyze,version);if(r.tp+r.fp===0)r.precision=null;r.dataset=name;r.cases=r.cases.map(c=>({...c,language:cases.find(x=>x.id===c.id).language||'mixed',category:cases.find(x=>x.id===c.id).category||'historical'}));
 const q={tp:0,fp:0,fn:0,tn:0};for(const c of r.cases)q[c.expected==='low'?(c.predicted==='low'?'tn':'fp'):(c.predicted==='low'?'fn':'tp')]++;
 r.triage={...q,positiveDefinition:'high + medium vs low',precision:ratio(q.tp,q.tp+q.fp),recall:ratio(q.tp,q.tp+q.fn),falsePositiveRate:ratio(q.fp,q.fp+q.tn),confidence95:{precision:ci(q.tp,q.tp+q.fp),recall:ci(q.tp,q.tp+q.fn),falsePositiveRate:ci(q.fp,q.fp+q.tn)}};
 r.confidence95={precision:ci(r.tp,r.tp+r.fp),recall:ci(r.tp,r.tp+r.fn),falsePositiveRate:ci(r.fp,r.fp+r.tn)};
 r.byLanguage=Object.fromEntries([...new Set(r.cases.map(c=>c.language))].map(l=>{const e=evaluate(cases.filter(c=>(c.language||'mixed')===l),analyze,version);return[l,{n:e.total,tp:e.tp,fp:e.fp,tn:e.tn,fn:e.fn,precision:e.tp+e.fp?e.precision:null,recall:e.recall,falsePositiveRate:e.falsePositiveRate,accuracy:e.accuracy}];}));
 return r;
}
const independent=score(freshCases,'120 synthetic cases authored by a separate engine-blinded AI agent; not human or real-world validation');
independent.limitations=['Engine-blinded synthetic corpus authored by a separate AI agent, not human expert validation.','Expected labels are AI-authored; second AI annotation does not establish real-world ground truth.','Medium cases count as not-high in strict binary metrics.','Text metrics exclude OCR/ASR and real social media prevalence.'];
const baselineV14=score(freshCases,'Frozen v1.4 snapshot on the exact same fresh v3 cases',baselineAnalyze,baselineVersion);
const paired={bothCorrect:0,corrected:0,worsened:0,bothWrong:0};for(let i=0;i<independent.cases.length;i++){const b=baselineV14.cases[i].match,c=independent.cases[i].match;paired[b?(c?'bothCorrect':'worsened'):(c?'corrected':'bothWrong')]++;}
const comparison={method:'Paired frozen-engine comparison on the same v3 corpus; no tuning on v3.',baseline:baselineV14,paired};
const development=score(prior.cases.filter(c=>c.split==='development'),'32 previously used development cases');
const holdout=score(prior.cases.filter(c=>c.split==='holdout'),'24 former v1.3 holdout cases; now historical regression after known-error repair');
const regression=score(evaluationCampaigns,'28 historical development regression cases');
const developmentV2=score(v2.cases.map(c=>({...c,campaignRef:[...new Set(c.sources.map(s=>s.campaignRef).filter(Boolean))][0]})),'100 former v1.4 independent cases now used for v1.5 development');
let agreement=null;
const secondPath='evaluation/independent-v3-second-labels.json';
if(existsSync(new URL(secondPath,root))){const second=json(secondPath);const map=new Map(second.cases.map(c=>[c.id,c.expectedRisk]));if(map.size!==fresh.cases.length||fresh.cases.some(c=>!map.has(c.id)||!['high','medium','low'].includes(map.get(c.id))))throw new Error('Incomplete second annotation.');const classes=['high','medium','low'],matrix=Object.fromEntries(classes.map(k=>[k,Object.fromEntries(classes.map(p=>[p,0]))]));for(const c of fresh.cases)matrix[c.expectedRisk][map.get(c.id)]++;const po=classes.reduce((n,k)=>n+matrix[k][k],0)/fresh.cases.length,pe=classes.reduce((n,k)=>n+fresh.cases.filter(c=>c.expectedRisk===k).length*second.cases.filter(c=>c.expectedRisk===k).length,0)/(fresh.cases.length*fresh.cases.length);agreement={method:'Two separate AI annotations, second blinded to engine, predictions and first labels. Not human inter-rater reliability.',n:fresh.cases.length,agreed:Math.round(po*fresh.cases.length),agreement:po,cohenKappa:(po-pe)/(1-pe),matrix,disagreements:fresh.cases.filter(c=>c.expectedRisk!==map.get(c.id)).map(c=>({id:c.id,author:c.expectedRisk,second:map.get(c.id)}))};}
for(let i=0;i<200;i++)analyzeCampaign(prior.cases[i%prior.cases.length]);
const durations=[],iterations=10000,start=performance.now();for(let i=0;i<iterations;i++){const s=performance.now();analyzeCampaign(prior.cases[i%prior.cases.length]);durations.push(performance.now()-s);}const elapsed=performance.now()-start;durations.sort((a,b)=>a-b);
const report={schemaVersion:3,engineVersion:ENGINE_VERSION,engineSha256:engineSha,evaluatedAt:new Date().toISOString(),datasetSha256:hash(read('evaluation/challenge-v1.json')),independentDatasetSha256:sha,synthetic:true,positiveDefinition:fresh.metadata.labelPolicy.high,provenance:fresh.metadata.provenance,freezeProtocol:freeze,headlineSplit:'independent',independent,comparison,annotationAgreement:agreement,holdout,development,developmentV2,regression,history:{v13:json('evaluation/release-v1.3-report.json'),v14:json('evaluation/release-v1.4-report.json')},performance:{runtime:process.version,platform:process.platform,architecture:process.arch,iterations,elapsedMs:elapsed,campaignsPerSecond:iterations*1000/elapsed,p50Ms:durations[Math.floor(iterations*.5)],p95Ms:durations[Math.floor(iterations*.95)],scope:'Warm local Node.js short text rules. Excludes OCR, network, UI, persistence and server concurrency.'},limitations:['120 synthetic cases by a separate AI agent; not representative real platform data.','First author provided expected labels; second AI agreement does not replace expert human adjudication.','v1.5 engine frozen before first v3 run; no tuning on v3 after results. v2 is now development data.','Old v1 holdout is now historical regression because one known error was used for repair.','Class prevalence is designed, so precision does not estimate production precision.','Text indicators and review priority are not fraud or legal judgments.','OCR is measured separately; no ASR or autonomous platform crawling.']};
writeFileSync(new URL('dist/evaluation-report.json',root),JSON.stringify(report,null,2)+'\n');writeFileSync(new URL('dist/release-evaluation.mjs',root),'// Generated by scripts/measure-independent.mjs. Engine and corpus are frozen.\nexport const releaseEvaluation = '+JSON.stringify(report)+';\n');
writeFileSync(new URL('evaluation/independent-v3-results.json',root),JSON.stringify(independent,null,2)+'\n');mkdirSync(new URL('artifacts',root),{recursive:true});writeFileSync(new URL('artifacts/release-metrics.csv',root),'split,id,language,expected,predicted,match\n'+['independent','holdout','development','developmentV2','regression'].flatMap(s=>report[s].cases.map(c=>[s,c.id,c.language,c.expected,c.predicted,c.match].join(','))).join('\n')+'\n');
console.log(JSON.stringify({engine:ENGINE_VERSION,n:independent.total,precision:independent.precision,recall:independent.recall,fpr:independent.falsePositiveRate,accuracy:independent.accuracy,paired:comparison.paired,baselineAccuracy:baselineV14.accuracy,matrix:independent.matrix,triage:independent.triage,byLanguage:independent.byLanguage,failedIds:independent.cases.filter(c=>!c.match).map(c=>c.id),agreement:agreement?{n:agreement.n,agreed:agreement.agreed,kappa:agreement.cohenKappa,disagreements:agreement.disagreements}:null},null,2));
if([independent,holdout,development,regression].some(r=>r.quoteErrors))process.exitCode=1;
