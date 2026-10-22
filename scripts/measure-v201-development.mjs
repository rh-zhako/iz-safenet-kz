import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {analyzeCampaign,ENGINE_VERSION} from '../dist/engine.mjs';
import {analyzeCampaign as frozenAnalyze,ENGINE_VERSION as frozenVersion} from '../evaluation/engine-v2.0-snapshot.mjs';
import {canonicalCase,scoreCases,pairedComparison} from './measure-v17.mjs';

// Install in scripts/. All v1-v8 corpora are OPEN development data now.
// Only the two explicitly versioned NEW outputs below may be written.
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root));
const json=p=>JSON.parse(read(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const reportPath='evaluation/development-v201-report.json';
const modulePath='dist/patch-evaluation.mjs';
const first=json('evaluation/fresh-ai-v8-report.json');
const freeze=json('evaluation/fresh-ai-v8-freeze.json');
const currentEngineSha256=sha(read('dist/engine.mjs'));
const frozenEngineSha256=sha(read('evaluation/engine-v2.0-snapshot.mjs'));
if(ENGINE_VERSION!=='2.0.1-track1-evidence')throw new Error('Expected the explicit v2.0.1 patch version.');
if(frozenVersion!=='2.0.0-track1-evidence'||frozenVersion!==first.engineVersion||frozenVersion!==freeze.engineVersion)throw new Error('Frozen v2.0 version differs from original v8 evidence.');
if(frozenEngineSha256!==first.engineSha256||frozenEngineSha256!==freeze.engineSha256)throw new Error('Immutable frozen v2.0 snapshot changed.');
if(currentEngineSha256===frozenEngineSha256)throw new Error('Patch engine is identical to the frozen baseline.');
const originalHarnessSha256=sha(read('scripts/measure-fresh-ai-v8.mjs'));
if(originalHarnessSha256!==first.harnessSha256||originalHarnessSha256!==freeze.harnessSha256)throw new Error('Original first-run v8 harness changed.');

const names=['challenge-v1','independent-v2','independent-v3','independent-v4','independent-v5','fresh-ai-v6','fresh-ai-v7','fresh-ai-v8'];
const corpusSha256=Object.fromEntries(names.map(name=>[name,sha(read(`evaluation/${name}.json`))]));
if(corpusSha256['fresh-ai-v8']!==first.corpusSha256)throw new Error('Original v8 corpus or labels changed.');
const cases=Object.fromEntries(names.map(name=>[name,json(`evaluation/${name}.json`).cases.map(c=>canonicalCase({...c,synthetic:true,expectedRisk:c.expectedRisk??c.expected}))]));
const sets=Object.fromEntries(names.map(name=>[name,scoreCases(cases[name],`${name}: OPEN DEVELOPMENT; patch check on disclosed data, not a fresh blind result`,analyzeCampaign,ENGINE_VERSION)]));
const baselineSets=Object.fromEntries(names.map(name=>[name,scoreCases(cases[name],`${name}: frozen v2.0 on now-open data`,frozenAnalyze,frozenVersion)]));
const originalV8=baselineSets['fresh-ai-v8'];
if(JSON.stringify(originalV8.cases)!==JSON.stringify(first.result.cases)||originalV8.quoteErrors!==first.result.quoteErrors)throw new Error('Original frozen v2.0/v8 predictions do not reproduce.');

const summary=r=>({engineVersion:r.engineVersion,total:r.total,correct:r.cases.filter(c=>c.match).length,accuracy:r.accuracy,tp:r.tp,fp:r.fp,fn:r.fn,tn:r.tn,precision:r.precision,recall:r.recall,falsePositiveRate:r.falsePositiveRate,quoteErrors:r.quoteErrors});
const comparisonsBySet=Object.fromEntries(names.map(name=>{
 const after=sets[name],before=baselineSets[name],previous=new Map(before.cases.map(c=>[c.id,c]));
 const changedPredictions=after.cases.flatMap(c=>{
  const b=previous.get(c.id);
  return b.predicted!==c.predicted?[{id:c.id,language:c.language,expected:c.expected,before:b.predicted,after:c.predicted,beforeMatch:b.match,afterMatch:c.match}]:[];
 });
 return[name,{dataset:`Same open ${name}`,baseline:summary(before),current:summary(after),paired:pairedComparison(after,before),changedPredictions}];
}));
const quoteErrors={currentBySet:Object.fromEntries(names.map(name=>[name,sets[name].quoteErrors])),baselineBySet:Object.fromEntries(names.map(name=>[name,baselineSets[name].quoteErrors]))};
const report={
 schemaVersion:1,
 status:'OPEN_DEVELOPMENT_NOT_INDEPENDENT',
 engineVersion:ENGINE_VERSION,
 engineSha256:currentEngineSha256,
 baselineEngineVersion:frozenVersion,
 baselineEngineSha256:frozenEngineSha256,
 at:new Date().toISOString(),
 provenance:'v1-v8 are already disclosed AI-synthetic development data. The v2.0.1 patch was motivated by a controlled OCR-flow example where financial commission language was attributed to judged winner selection. This open regression comparison is not a new blind result and does not establish a general accuracy improvement.',
 patchContext:{trigger:'Controlled OCR-flow smoke test; not a new detector benchmark.',mechanism:'Generic word-boundary handling for the lexical judged-selection operator; a substring of commission/percentage wording must not establish judged selection.',scope:'Known-data regression and paired comparison only; not a measurement of real-world detection, OCR quality, analyst benefit or generalization.'},
 inputSha256:{currentEngine:currentEngineSha256,frozenEngineSnapshot:frozenEngineSha256,corpora:corpusSha256,measurementScript:sha(read('scripts/measure-v201-development.mjs')),sharedScoringHarness:sha(read('scripts/measure-v17.mjs')),evaluationModule:sha(read('dist/evaluation.mjs')),originalV8Harness:originalHarnessSha256,originalV8Report:sha(read('evaluation/fresh-ai-v8-report.json')),originalV8Freeze:sha(read('evaluation/fresh-ai-v8-freeze.json'))},
 sets,
 baselineSets,
 comparisonsBySet,
 comparison:comparisonsBySet['fresh-ai-v8'],
 quoteErrors,
 historicalFreshV8Report:'fresh-ai-v8-report.json',
 historicalFreshV8Status:first.status,
 immutableFirstV8Reproduced:true,
 limitations:[
  'All eight corpora, their labels and their challenge frequencies are AI-synthetic hypotheses and are already open.',
  'The patch responds to a context-attribution defect observed in an OCR-flow example; these corpus results do not estimate general accuracy or OCR quality.',
  'Frozen v2.0 and the original first v8 report, corpus, labels, harness and current development-v20 evidence remain separate and are not overwritten.',
  'All current and frozen-baseline predictions, metrics, exact-quote validation errors and paired changes are included; program checks are not a detection-accuracy score.',
  'No real publications, independent human labels, analyst-time savings or new blind test were measured.'
 ]
};
writeFileSync(new URL(reportPath,root),JSON.stringify(report,null,2)+'\n');
writeFileSync(new URL(modulePath,root),'// Open v2.0.1 patch regression evidence; never a new blind estimate.\nexport const patchEvaluation = '+JSON.stringify(report)+';\n');
console.log(JSON.stringify({status:report.status,engineVersion:ENGINE_VERSION,baselineEngineVersion:frozenVersion,sets:Object.fromEntries(names.map(name=>[name,summary(sets[name])])),pairedV8:report.comparison.paired,changedV8Predictions:report.comparison.changedPredictions.length,quoteErrors,outputs:[reportPath,modulePath]},null,2));
if([...Object.values(sets),...Object.values(baselineSets)].some(r=>r.quoteErrors))process.exitCode=1;
