import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {analyzeCampaign,ENGINE_VERSION} from '../dist/engine.mjs';
import {analyzeCampaign as baselineAnalyze,ENGINE_VERSION as baselineVersion} from '../evaluation/engine-v1.6-snapshot.mjs';
import {evaluate} from '../dist/evaluation.mjs';
import {evaluationCampaigns} from '../dist/demo-data.mjs';

// Importing this module is safe for fixture checks: it does not read any corpus,
// invoke an analyzer or write a report. The fresh run requires an explicit flag.
export const CLASSES=['high','medium','low'];
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),json=p=>JSON.parse(read(p));
const hash=b=>createHash('sha256').update(b).digest('hex'),ratio=(n,d)=>d?n/d:null;
const emptyMatrix=()=>Object.fromEntries(CLASSES.map(k=>[k,Object.fromEntries(CLASSES.map(p=>[p,0]))]));

export function wilson95(success,total){
  if(!Number.isInteger(success)||!Number.isInteger(total)||success<0||total<0||success>total)throw new Error('Invalid Wilson counts.');
  if(!total)return null;
  const z=1.96,p=success/total,d=1+z*z/total,m=(p+z*z/(2*total))/d,h=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;
  return [Math.max(0,m-h),Math.min(1,m+h)];
}

export function canonicalCase(c){
  const refs=[...new Set(c.sources.map(s=>s.campaignRef).filter(v=>v!==undefined&&v!==null&&String(v).trim()).map(String))];
  // Never overwrite an explicit campaign identity or a source reference. Only
  // bridge a missing display-level reference when every supplied ref agrees.
  return !c.campaignRef&&refs.length===1?{...c,campaignRef:refs[0]}:{...c};
}

export function metricsFromPredictions(rows){
  const matrix=emptyMatrix(),strict={tp:0,fp:0,tn:0,fn:0},queue={tp:0,fp:0,tn:0,fn:0};let correct=0;
  for(const c of rows){
    if(!CLASSES.includes(c.expected)||!CLASSES.includes(c.predicted))throw new Error('Unknown class in prediction rows.');
    matrix[c.expected][c.predicted]++;if(c.expected===c.predicted)correct++;
    strict[c.expected==='high'?(c.predicted==='high'?'tp':'fn'):(c.predicted==='high'?'fp':'tn')]++;
    queue[c.expected!=='low'?(c.predicted!=='low'?'tp':'fn'):(c.predicted!=='low'?'fp':'tn')]++;
  }
  const binary=m=>({...m,precision:ratio(m.tp,m.tp+m.fp),recall:ratio(m.tp,m.tp+m.fn),falsePositiveRate:ratio(m.fp,m.fp+m.tn),confidence95:{precision:wilson95(m.tp,m.tp+m.fp),recall:wilson95(m.tp,m.tp+m.fn),falsePositiveRate:wilson95(m.fp,m.fp+m.tn)}});
  return {total:rows.length,...binary(strict),matrix,accuracy:ratio(correct,rows.length),confidence95:{...binary(strict).confidence95,accuracy:wilson95(correct,rows.length)},triage:{positiveDefinition:'high + medium vs low',...binary(queue)}};
}

function evidenceErrors(c,r){
  let errors=0;const sources=new Map(c.sources.map(s=>[s.id,s]));
  for(const evidence of [...Object.values(r.analysis.signals).flatMap(s=>s.evidence||[]),...(r.analysis.context?.atoms||[])]){
    const source=sources.get(evidence.sourceId);
    if(!source||!Number.isInteger(evidence.start)||!Number.isInteger(evidence.end)||evidence.start<0||evidence.end<=evidence.start||evidence.end>source.text.length||source.text.slice(evidence.start,evidence.end)!==evidence.quote)errors++;
  }
  return errors;
}

export function scoreCases(cases,name,analyzer=analyzeCampaign,version=ENGINE_VERSION){
  let strictEvidenceErrors=0;
  const checked=c=>{const r=analyzer(c);strictEvidenceErrors+=evidenceErrors(c,r);return r;};
  const r=evaluate(cases,checked,version),byId=new Map(cases.map(c=>[c.id,c]));
  if(byId.size!==cases.length)throw new Error('Duplicate campaign IDs in score input.');
  r.cases=r.cases.map(c=>({...c,language:byId.get(c.id).language||'mixed',category:byId.get(c.id).category||'historical'}));
  const metrics=metricsFromPredictions(r.cases);
  Object.assign(r,metrics,{dataset:name,quoteErrors:r.quoteErrors+strictEvidenceErrors,evidenceValidation:{signalErrorsReportedByEvaluate:r.quoteErrors,strictSignalAndContextErrors:strictEvidenceErrors,scope:'Main campaigns and their single-source baseline calls; exact original UTF-16 offsets.'}});
  const singleSource=metricsFromPredictions(r.cases.map(c=>({...c,predicted:c.baseline==='high'?'high':'low'})));
  r.baseline={name:'Any single source classified high',precision:singleSource.precision,recall:singleSource.recall,falsePositiveRate:singleSource.falsePositiveRate};
  r.byLanguage=Object.fromEntries([...new Set(r.cases.map(c=>c.language))].map(language=>{const m=metricsFromPredictions(r.cases.filter(c=>c.language===language));return[language,{n:m.total,...m}];}));
  r.limitations=['Synthetic textual scenarios; class prevalence and wording are designed.','Medium cases count as not-high for strict binary metrics; queue metrics use high + medium vs low.','Text metrics exclude OCR, ASR, platform access and human analyst performance.'];
  return r;
}

export function annotationAgreement(first,second){
  if(!Array.isArray(second.cases))throw new Error('Second annotation has no cases.');
  const map=new Map(second.cases.map(c=>[c.id,c.expectedRisk]));
  if(map.size!==second.cases.length||map.size!==first.length||first.some(c=>!map.has(c.id)||!CLASSES.includes(map.get(c.id))))throw new Error('Second annotation is incomplete, duplicated or contains invalid labels.');
  const matrix=emptyMatrix();for(const c of first)matrix[c.expectedRisk][map.get(c.id)]++;
  const n=first.length,agreed=CLASSES.reduce((sum,k)=>sum+matrix[k][k],0),po=ratio(agreed,n);
  const pe=n?CLASSES.reduce((sum,k)=>sum+first.filter(c=>c.expectedRisk===k).length*second.cases.filter(c=>c.expectedRisk===k).length,0)/(n*n):null;
  return {method:'Two separate AI annotations. The second was prepared without engine predictions or first labels; this is not human inter-rater reliability.',n,agreed,agreement:po,cohenKappa:pe===null||pe===1?null:(po-pe)/(1-pe),matrix,disagreements:first.filter(c=>c.expectedRisk!==map.get(c.id)).map(c=>({id:c.id,author:c.expectedRisk,second:map.get(c.id)}))};
}

export function pairedComparison(current,baseline){
  const map=new Map(baseline.cases.map(c=>[c.id,c]));
  if(map.size!==current.cases.length||current.cases.some(c=>!map.has(c.id)))throw new Error('Paired comparison IDs do not agree.');
  const paired={bothCorrect:0,corrected:0,worsened:0,bothWrong:0};
  for(const c of current.cases){const b=map.get(c.id);if(b.expected!==c.expected)throw new Error('Paired comparison labels differ.');paired[b.match?(c.match?'bothCorrect':'worsened'):(c.match?'corrected':'bothWrong')]++;}
  return paired;
}

function checksumFor(manifest,name){
  for(const line of manifest.split(/\r?\n/u)){const m=line.trim().match(/^([a-f\d]{64})\s+\*?(?:.*\/)?([^/\s]+)$/iu);if(m&&m[2]===name)return m[1].toLowerCase();}
  throw new Error(`Checksum manifest has no entry for ${name}.`);
}

export function validateCorpus(corpus,counts){
  if(!Array.isArray(corpus.cases)||corpus.cases.length!==Object.values(counts).reduce((a,b)=>a+b,0))throw new Error('Unexpected fresh corpus size.');
  const ids=new Set();for(const c of corpus.cases){if(typeof c.id!=='string'||!c.id||ids.has(c.id))throw new Error('Missing or duplicated campaign ID.');ids.add(c.id);if(!CLASSES.includes(c.expectedRisk)||!Array.isArray(c.sources)||!c.sources.length)throw new Error('Invalid campaign shape.');const sourceIds=new Set();for(const s of c.sources){if(typeof s.id!=='string'||!s.id||sourceIds.has(s.id)||typeof s.text!=='string')throw new Error('Missing/duplicated source ID or non-text source.');sourceIds.add(s.id);}}
  for(const [label,n]of Object.entries(counts))if(corpus.cases.filter(c=>c.expectedRisk===label).length!==n)throw new Error(`Unexpected ${label} distribution.`);
}

function csvCell(value){const s=String(value??'');return /[",\r\n]/u.test(s)?`"${s.replaceAll('"','""')}"`:s;}

export function runMeasurement(){
  const freeze=json('evaluation/engine-v1.7-freeze.json'),engineSha=hash(read('dist/engine.mjs'));
  if(engineSha!==freeze.engineSha256||ENGINE_VERSION!==freeze.engineVersion||!freeze.frozenBeforeIndependentEvaluation)throw new Error('Frozen v1.7 engine/protocol changed.');
  if(hash(read('evaluation/engine-v1.7-snapshot.mjs'))!==engineSha)throw new Error('v1.7 snapshot does not match frozen current engine.');
  const baselineFreeze=json('evaluation/engine-v1.6-freeze.json'),baselineSha=hash(read('evaluation/engine-v1.6-snapshot.mjs'));
  if(baselineSha!==baselineFreeze.engineSha256||baselineVersion!==baselineFreeze.engineVersion)throw new Error('Frozen v1.6 baseline changed.');
  const raw=read('evaluation/independent-v5.json'),sha=hash(raw),manifest=read('evaluation/independent-v5.sha256').toString();
  if(checksumFor(manifest,'independent-v5.json')!==sha)throw new Error('Frozen v5 corpus checksum differs.');
  const fresh=JSON.parse(raw);validateCorpus(fresh,{high:80,low:80,medium:40});
  const prior=json('evaluation/challenge-v1.json'),v2=json('evaluation/independent-v2.json'),v3=json('evaluation/independent-v3.json'),v4=json('evaluation/independent-v4.json');
  const histories={v13:json('evaluation/release-v1.3-report.json'),v14:json('evaluation/release-v1.4-report.json'),v15:json('evaluation/release-v1.5-report.json'),v16:json('evaluation/release-v1.6-report.json')};
  const secondPath='evaluation/independent-v5-second-labels.json',secondBytes=existsSync(new URL(secondPath,root))?read(secondPath):null,second=secondBytes?JSON.parse(secondBytes):null;
  if(second?.blindDatasetSha256&&second.blindDatasetSha256!==checksumFor(manifest,'independent-v5-blind.json'))throw new Error('Second annotation describes a different blinded corpus.');
  // Validate annotation completeness before any prediction or immutable first
  // run record. Labels are never adjudicated or changed using predictions.
  const agreement=second?annotationAgreement(fresh.cases,second):null;
  const firstPath=new URL('evaluation/independent-v5-first-run.json',root);
  const firstRecord={at:new Date().toISOString(),engineVersion:ENGINE_VERSION,engineSha256:engineSha,datasetSha256:sha,baselineEngineSha256:baselineSha,harnessSha256:hash(read('scripts/measure-v17.mjs')),secondAnnotationSha256:secondBytes?hash(secondBytes):null,protocol:'First evaluation of frozen v1.7 on v5. Subsequent identical runs reproduce this fixed evaluation; v5 cannot be reused as a fresh blind result after tuning.'};
  if(!Number.isFinite(Date.parse(freeze.frozenAt))||Date.parse(freeze.frozenAt)>Date.parse(firstRecord.at))throw new Error('Invalid engine freeze timestamp.');
  if(existsSync(firstPath)){
    const first=JSON.parse(readFileSync(firstPath));
    for(const key of ['engineVersion','engineSha256','datasetSha256','baselineEngineSha256','harnessSha256','secondAnnotationSha256'])if(first[key]!==firstRecord[key])throw new Error(`Immutable first-run input differs: ${key}.`);
  }else writeFileSync(firstPath,JSON.stringify(firstRecord,null,2)+'\n',{flag:'wx'});
  const freshCases=fresh.cases.map(canonicalCase);
  const independent=scoreCases(freshCases,'200 synthetic cases by a separate engine-blinded AI author; not human or real-world validation');
  independent.limitations.unshift('Frozen before the first v5 run. Independent AI authorship does not establish human ground truth or real-world performance.');
  const baseline=scoreCases(freshCases,'Frozen v1.6 snapshot on the exact same v5 cases',baselineAnalyze,baselineVersion);
  const comparison={method:'Paired frozen v1.6/v1.7 comparison on the same v5 corpus; no tuning on v5.',baseline,paired:pairedComparison(independent,baseline)};
  const development=scoreCases(prior.cases.filter(c=>c.split==='development').map(canonicalCase),'32 previously used development cases');
  const holdout=scoreCases(prior.cases.filter(c=>c.split==='holdout').map(canonicalCase),'24 former v1.3 holdout cases, now historical development regression');
  const regression=scoreCases(evaluationCampaigns.map(canonicalCase),'28 historical development regression cases');
  const developmentV2=scoreCases(v2.cases.map(canonicalCase),'100 former v1.4 independent cases, now open development');
  const developmentV3=scoreCases(v3.cases.map(canonicalCase),'120 former v1.5 independent cases, now open development');
  const developmentV4=scoreCases(v4.cases.map(canonicalCase),'160 former v1.6 independent cases, now open development for v1.7');
  const performanceCases=prior.cases.filter(c=>c.split==='development').map(canonicalCase);if(!performanceCases.length)throw new Error('Missing historical performance fixture.');
  for(let i=0;i<200;i++)analyzeCampaign(performanceCases[i%performanceCases.length]);
  const durations=[],iterations=10000,start=performance.now();for(let i=0;i<iterations;i++){const at=performance.now();analyzeCampaign(performanceCases[i%performanceCases.length]);durations.push(performance.now()-at);}const elapsed=performance.now()-start;durations.sort((a,b)=>a-b);
  const report={schemaVersion:5,engineVersion:ENGINE_VERSION,engineSha256:engineSha,evaluatedAt:new Date().toISOString(),datasetSha256:hash(read('evaluation/challenge-v1.json')),independentDatasetSha256:sha,synthetic:true,positiveDefinition:fresh.metadata?.labelPolicy?.high||independent.positiveDefinition,provenance:fresh.metadata?.provenance||{corpusType:'AI-synthetic',humanCollected:false,realWorldCampaigns:false},freezeProtocol:freeze,firstRun:JSON.parse(readFileSync(firstPath)),headlineSplit:'independent',independent,comparison,annotationAgreement:agreement,holdout,development,developmentV2,developmentV3,developmentV4,regression,history:histories,performance:{runtime:process.version,platform:process.platform,architecture:process.arch,iterations,elapsedMs:elapsed,campaignsPerSecond:iterations*1000/elapsed,p50Ms:durations[Math.floor(iterations*.5)],p95Ms:durations[Math.floor(iterations*.95)],scope:'Warm local Node.js rules on historical short text development cases. Excludes OCR, network, UI, persistence, workers and server concurrency.'},limitations:['200 synthetic cases by a separate AI author; not representative real platform data.','Expected labels are AI-authored. Second AI agreement is not expert human validation.','v1.7 was frozen before the first v5 run; all v1/v2/v3/v4 material is now open development.','The historical v1 holdout is no longer an independent validation split.','Designed class prevalence means precision does not estimate production precision.','Text indicators and review priority are not fraud or legal judgments.','OCR is measured separately. No ASR, autonomous platform crawling, real pilot or human time savings is established.']};
  writeFileSync(new URL('dist/evaluation-report.json',root),JSON.stringify(report,null,2)+'\n');
  writeFileSync(new URL('dist/release-evaluation.mjs',root),'// Generated by scripts/measure-v17.mjs from frozen engine/corpus inputs.\nexport const releaseEvaluation = '+JSON.stringify(report)+';\n');
  writeFileSync(new URL('evaluation/independent-v5-results.json',root),JSON.stringify(independent,null,2)+'\n');
  mkdirSync(new URL('artifacts',root),{recursive:true});
  const splits=['independent','holdout','development','developmentV2','developmentV3','developmentV4','regression'];
  writeFileSync(new URL('artifacts/release-metrics.csv',root),'split,id,language,expected,predicted,match\n'+splits.flatMap(split=>report[split].cases.map(c=>[split,c.id,c.language,c.expected,c.predicted,c.match].map(csvCell).join(','))).join('\n')+'\n');
  console.log(JSON.stringify({engine:ENGINE_VERSION,n:independent.total,precision:independent.precision,recall:independent.recall,fpr:independent.falsePositiveRate,accuracy:independent.accuracy,confidence95:independent.confidence95,paired:comparison.paired,baselineAccuracy:baseline.accuracy,matrix:independent.matrix,triage:independent.triage,byLanguage:independent.byLanguage,failedIds:independent.cases.filter(c=>!c.match).map(c=>c.id),agreement:agreement?{n:agreement.n,agreed:agreement.agreed,kappa:agreement.cohenKappa,disagreements:agreement.disagreements}:null,quoteErrors:Object.fromEntries([...splits.map(k=>[k,report[k].quoteErrors]),['frozenBaseline',baseline.quoteErrors]])},null,2));
  if([...splits.map(k=>report[k]),baseline].some(r=>r.quoteErrors))process.exitCode=1;
  return report;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.includes('--run-frozen-v5'))runMeasurement();
  else console.log('Prepared v1.7 harness. Run only after authorized corpus/annotation release: node scripts/measure-v17.mjs --run-frozen-v5');
}
