import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {analyzeCampaign,ENGINE_VERSION} from '../dist/engine.mjs';
import {canonicalCase,scoreCases} from './measure-v17.mjs';

// First-run results are immutable. Reproduction checks the stored predictions
// without replacing the original report or opening a new hidden test.
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root));
const json=p=>JSON.parse(read(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const reportPath='evaluation/fresh-ai-v8-report.json';
const reproduce=process.argv.includes('--reproduce');
if(existsSync(new URL(reportPath,root))&&!reproduce)throw new Error('First run already exists. Use --reproduce; never replace the original.');
const freeze=json('evaluation/fresh-ai-v8-freeze.json');
const engineSha=sha(read('dist/engine.mjs'));
if(engineSha!==freeze.engineSha256||ENGINE_VERSION!==freeze.engineVersion)throw new Error('Engine differs from the pre-corpus freeze.');
const corpusBytes=read('evaluation/fresh-ai-v8.json');
const corpus=JSON.parse(corpusBytes);
if(!Array.isArray(corpus.cases)||corpus.cases.length!==160)throw new Error('Expected 160 fresh cases.');
const classes=['high','medium','low'],languages=['ru','kk','mixed','translit'];
const ids=new Set(),sourceIds=new Set();
for(const c of corpus.cases){
 if(!c.id||ids.has(c.id)||!classes.includes(c.expected)||!languages.includes(c.language)||!c.sources?.length)throw new Error('Invalid case shape or duplicate ID.');
 ids.add(c.id);
 for(const s of c.sources){
  if(!s.id||sourceIds.has(s.id)||typeof s.text!=='string'||!s.text.trim()||s.campaignRef!==c.id)throw new Error('Invalid source or campaign identity.');
  sourceIds.add(s.id);
 }
}
for(const lang of languages){
 const cases=corpus.cases.filter(c=>c.language===lang);
 if(cases.length!==40)throw new Error('Language totals differ.');
 for(const [label,n]of [['high',16],['medium',8],['low',16]])if(cases.filter(c=>c.expected===label).length!==n)throw new Error('Class totals differ.');
}
if(corpus.cases.filter(c=>c.sources.length>1).length<64)throw new Error('Insufficient multi-source cases.');
if(corpus.cases.filter(c=>c.sources.reduce((n,s)=>n+s.text.length,0)>1000).length<20)throw new Error('Insufficient long cases.');
const harnessSha=sha(read('scripts/measure-fresh-ai-v8.mjs'));
const result=scoreCases(corpus.cases.map(c=>canonicalCase({...c,synthetic:true,expectedRisk:c.expected})),'Fresh AI-authored synthetic v8; frozen v2.0 before authoring, not real-world or human validation',analyzeCampaign,ENGINE_VERSION);
if(reproduce){
 const first=json(reportPath);
 if(first.engineSha256!==engineSha||first.corpusSha256!==sha(corpusBytes)||first.harnessSha256!==harnessSha)throw new Error('Reproduction inputs changed.');
 if(JSON.stringify(first.result.cases)!==JSON.stringify(result.cases)||first.result.quoteErrors!==result.quoteErrors)throw new Error('Predictions do not reproduce.');
 console.log(JSON.stringify({reproduced:true,total:result.total,accuracy:result.accuracy,quoteErrors:result.quoteErrors}));
}else{
 const report={schemaVersion:1,status:'FRESH_ENGINE_BLINDED_AI_SYNTHETIC',at:new Date().toISOString(),engineVersion:ENGINE_VERSION,engineSha256:engineSha,corpusSha256:sha(corpusBytes),harnessSha256:harnessSha,freeze,authoring:corpus.metadata?.provenance,counts:{cases:corpus.cases.length,sources:sourceIds.size,multiSourceCases:corpus.cases.filter(c=>c.sources.length>1).length},result,limitations:[
  'A separate AI authored the new corpus without reading engine code, previous cases, reports or predictions. The engine was frozen before corpus creation.',
  'Labels, prevalence and wording are AI-authored hypotheses. No human annotators or real publications participated.',
  'This is a small synthetic text test. It does not estimate accuracy on the real social-media population.',
  'The test does not measure OCR, speech recognition, analyst speed, platform integration or server capacity.',
  'Once disclosed, this corpus is open. Tuning against its errors cannot be presented as a new blind result.'
 ]};
 writeFileSync(new URL(reportPath,root),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 writeFileSync(new URL('dist/fresh-v8-evaluation.mjs',root),'// First frozen-engine run on new AI-authored synthetic scenarios.\nexport const freshEvaluation = '+JSON.stringify(report)+';\n');
 const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
 writeFileSync(new URL('evaluation/fresh-ai-v8-predictions.csv',root),'id,language,expected,predicted,match\n'+result.cases.map(c=>[c.id,c.language,c.expected,c.predicted,c.match].map(cell).join(',')).join('\n')+'\n');
 console.log(JSON.stringify({total:result.total,correct:result.cases.filter(c=>c.match).length,accuracy:result.accuracy,precision:result.precision,recall:result.recall,falsePositiveRate:result.falsePositiveRate,tp:result.tp,fp:result.fp,fn:result.fn,tn:result.tn,quoteErrors:result.quoteErrors,byLanguage:Object.fromEntries(Object.entries(result.byLanguage).map(([k,v])=>[k,{n:v.total,accuracy:v.accuracy,recall:v.recall}]))},null,2));
}
if(result.quoteErrors)process.exitCode=1;
