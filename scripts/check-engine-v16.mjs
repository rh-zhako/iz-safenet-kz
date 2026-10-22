import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {analyzeCampaign,analyzeText,ENGINE_VERSION} from '../dist/engine.mjs';
import {analyzeCampaign as frozenV15} from '../evaluation/engine-v1.5-snapshot.mjs';
import {evaluationCampaigns} from '../dist/demo-data.mjs';

// All three corpora below are OPEN DEVELOPMENT data. This script never reads
// a v4 corpus, hidden labels, live evaluation report or later test set.
const checks=[],families=[];
const path=p=>new URL(p,import.meta.url);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=c=>{const refs=[...new Set(c.sources.map(s=>s.campaignRef).filter(Boolean))];return {...c,...(!c.campaignRef&&refs.length===1?{campaignRef:refs[0]}:{})};};
function check(name,fn){try{fn();checks.push({name,passed:true});}catch(e){checks.push({name,passed:false,message:e.message});console.error('FAIL',name,e.message);}}
function quotes(c,r){for(const signal of [...Object.values(r.analysis.signals),{evidence:r.analysis.context?.atoms||[]}])for(const e of signal.evidence){const s=c.sources.find(s=>s.id===e.sourceId);assert.ok(s);assert.ok(Number.isInteger(e.start)&&Number.isInteger(e.end));assert.equal(s.text.slice(e.start,e.end),e.quote);}}
function family(text,expectedRisk,name){const c={id:`v16-family-${families.length}`,expectedRisk,synthetic:true,title:name,sources:[{id:'s',text}]};families.push(c);check(name,()=>{const before=JSON.stringify(c),r=analyzeCampaign(c);assert.equal(r.analysis.risk,expectedRisk);quotes(c,r);assert.equal(JSON.stringify(c),before);if(r.analysis.risk==='high'){for(const k of ['prize','payment','random'])assert.equal(r.analysis.signals[k].state,'found');assert.equal(r.analysis.contradictions.length,0);}});}

const positiveParts=[
 ['Розыгрыш проектора.','Для участия обязательно оплатите билет за 430 ₸.','Победителя выберем случайно.'],
 ['Жүлде — ақылды сағат.','Қатысу үшін 870 ₸ билет сатып алу міндетті.','Жеңімпазды кездейсоқ таңдаймыз.'],
 ['Rozygryvaem kolonku.','Dlya uchastiya obyazatelno oplatite bilet 620 tg.','Pobeditelya vyberem sluchaino.'],
];
for(const [language,parts] of positiveParts.entries())for(const order of [[0,1,2],[2,0,1],[1,2,0]]){
 family(order.map(i=>parts[i]).join(' '),'high',`condition ordering ${language}/${order.join('')}`);
 family(order.map(i=>parts[i]).join('\n'),'high',`OCR line boundaries ${language}/${order.join('')}`);
}
for(const [text,expected,name] of [
 ['Приз — лампа. Для участия нужен билет за 830 ₸; доставка бесплатная. Победитель случайный.','high','free benefit is not free entry'],
 ['Жүлде — шам. Қатысу үшін 430 ₸ төлеу міндетті. Жеткізу тегін. Жеңімпаз кездейсоқ таңдалады.','high','KK free shipping does not contradict entry'],
 ['Розыгрыш лампы. Участие возможно только после оплаты номера. Победителя выберет рандом.','high','permission conditional on payment is not epistemic uncertainty'],
 ['Приз — лампа. Для участия обязательно оплатить билет; платить после победы нельзя. Победителя случайно вытянем из списка.','high','prohibition after win does not cancel prepayment'],
 ['Приз — лампа. Для участия нужен билет за 430 ₸. Донат по желанию. Победителя выберем случайно.','high','optional extra donation independent of ticket'],
 ['Приз — лампа. Донат назван добровольным. Для участия обязательный донат 430 ₸. Победитель случайный.','medium','same donation optional and mandatory is unresolved'],
 ['Розыгрыш лампы. Участие бесплатное. Донат по желанию и никак не влияет на допуск. Победителя выберем случайно.','low','optional donation does not establish payment'],
 ['Приз — лампа. Участие бесплатное, взносов и покупок нет. Победителя выберем случайно.','low','negated fees do not negate free entry'],
 ['Розыгрыш лампы. Участие бесплатно. Победитель случайный. Платная доставка доступна лишь после выигрыша и не нужна для участия.','low','post-win optional delivery has another role'],
 ['Приз — лампа. Для участия обязателен билет за 430 ₸. Жюри оценивает на первом этапе. Финального победителя выберем случайно.','high','preliminary jury does not contradict final random draw'],
 ['Приз — лампа. Для участия обязателен билет за 430 ₸. На первом этапе случайно выберем порядок выступлений. Итогового победителя определит жюри.','low','random ordering is not prize selection'],
 ['Приз — лампа. Для участия обязателен билет за 430 ₸. Победителя выберем случайно. Итоговое решение примет жюри по качеству работы.','medium','contradictory final selection mechanisms'],
 ['Приз — лампа. Для участия обязателен билет за 430 ₸. Жюри не выбирает победителя. Победителя выберем случайно.','high','denied jury is not a positive criterion'],
 ['Приз — лампа. Для участия обязателен билет за 430 ₸. Победителя определит жюри. Случайного выбора не будет.','low','explicit skill contest without random selection'],
 ['Приз — лампа. Для участия обязателен билет за 430 ₸. Возможно, победителя выберем случайно.','medium','modal possibility is not confirmed selection'],
 ['Приз — лампа. Для участия обязателен билет за 430 ₸. Мүмкін жеңімпазды кездейсоқ таңдаймыз.','medium','KK modal possibility is not confirmed selection'],
 ['Приз — лампа. Для участия нужен билет за 430 ₸. Курьер случайно уронил коробку.','medium','incidental accident is not a winner mechanism'],
 ['Приз — лампа. Для участия нужен билет за 430 ₸. Генератор паролей работает случайно.','medium','random technical identifier is not prize selection'],
 ['Участие стоит 430 ₸. Победителя выберем случайно. Приз пока не объявлен.','medium','entry and random remain observable without declared prize'],
 ['Жеребьёвка вечером. Входной билет 430 ₸. Что получит выбранный участник, пока не объявлено.','medium','question about reward is not reward evidence'],
 ['Учебная цитата: «Приз — лампа, для участия билет 430 ₸, победитель случайный». Мы не проводим акцию.','low','quoted teaching example is not an own offer'],
 ['Chuzhaya reklama dlya razbora: \'oplati bilet 430 tg, priz lampa, pobeditel sluchainyi\'. My tolko citiruem.','low','transliterated attribution preserves quoted context'],
 ['Осторожно, не платите по чужим объявлениям. А у нас розыгрыш лампы: для участия купите билет за 430 ₸. Победителя выберем случайно.','high','separately stated own offer survives warning'],
 ['Продаём лампу за 430 ₸. Призов, билетов и случайного выбора у нас нет.','low','ordinary retail with coordinated absence'],
])family(text,expected,name);

check('foreign campaign excluded from signals and context',()=>{const c={id:'ours',sources:[{id:'one',text:'Приз — лампа.',campaignRef:'ours'},{id:'foreign',text:'Для участия оплатите билет. Победитель случайный.',campaignRef:'other'}]},r=analyzeCampaign(c);assert.equal(r.analysis.risk,'low');assert.ok(r.analysis.context.atoms.every(a=>a.sourceId!=='foreign'));quotes(c,r);});
check('normalization preserves UTF-16 offsets including NFKC and removed noise',()=>{const text='🎁 Розы\u200bгрыш лампы. Для участия опла\u200bтите билет ４３０ ₸. Победителя выберет рандoмайзер.',r=analyzeText(text);assert.equal(r.analysis.risk,'high');quotes(r,r);});
check('no organizer income inferred from entry fee',()=>assert.equal(analyzeText('Приз — лампа. Для участия билет 430 ₸. Победитель случайный.').analysis.signals.income.state,'unknown'));
check('empty input does not create context atoms',()=>{const r=analyzeText('');assert.equal(r.analysis.risk,'low');assert.equal(r.analysis.context.atoms.length,0);});

function evaluate(cases,analyzer){
 const matrix=Object.fromEntries(['high','medium','low'].map(k=>[k,{high:0,medium:0,low:0}]));let tp=0,fp=0,tn=0,fn=0,qtp=0,qfp=0,qtn=0,qfn=0,quoteErrors=0;
 const results=cases.map(raw=>{const c=canonical(raw),r=analyzer(c),p=r.analysis.risk,e=c.expectedRisk;matrix[e][p]++;if(e==='high'&&p==='high')tp++;else if(p==='high')fp++;else if(e==='high')fn++;else tn++;if(e!=='low'&&p!=='low')qtp++;else if(e==='low'&&p!=='low')qfp++;else if(e!=='low')qfn++;else qtn++;try{quotes(c,r);}catch{quoteErrors++;}return{id:c.id,expected:e,predicted:p,match:e===p,language:c.language||'family',score:r.analysis.score};});
 const div=(a,b)=>b?a/b:0;return{total:results.length,accuracy:div(results.filter(c=>c.match).length,results.length),tp,fp,tn,fn,precision:div(tp,tp+fp),recall:div(tp,tp+fn),falsePositiveRate:div(fp,fp+tn),matrix,quoteErrors,triage:{tp:qtp,fp:qfp,tn:qtn,fn:qfn,precision:div(qtp,qtp+qfp),recall:div(qtp,qtp+qfn),falsePositiveRate:div(qfp,qfp+qtn)},cases:results};
}
const corpora={};for(const name of ['challenge-v1','independent-v2','independent-v3']){const bytes=readFileSync(path(`../evaluation/${name}.json`));corpora[name]={sha256:sha(bytes),...evaluate(JSON.parse(bytes).cases,analyzeCampaign)};}
const previousV3=evaluate(JSON.parse(readFileSync(path('../evaluation/independent-v3.json'))).cases,frozenV15),historical=evaluate(evaluationCampaigns,analyzeCampaign),familyResults=evaluate(families,analyzeCampaign);
check('all open corpora evidence offsets remain exact',()=>assert.equal(Object.values(corpora).reduce((n,r)=>n+r.quoteErrors,0)+historical.quoteErrors+familyResults.quoteErrors,0));
check('historical regression has no loss',()=>{assert.equal(historical.total,28);assert.equal(historical.accuracy,1);});
check('all v1 data remain development regression',()=>assert.equal(corpora['challenge-v1'].accuracy,1));
check('opened v2 does not regress',()=>assert.equal(corpora['independent-v2'].accuracy,1));
check('high invariant holds across all open examples',()=>{for(const name of ['challenge-v1','independent-v2','independent-v3'])for(const raw of JSON.parse(readFileSync(path(`../evaluation/${name}.json`))).cases){const r=analyzeCampaign(canonical(raw));if(r.analysis.risk==='high'){assert.equal(r.analysis.contradictions.length,0);for(const k of ['prize','payment','random'])assert.equal(r.analysis.signals[k].state,'found');}}});
const report={schemaVersion:1,status:'OPEN_DEVELOPMENT_NOT_INDEPENDENT',engineVersion:ENGINE_VERSION,engineSha256:sha(readFileSync(path('../dist/engine.mjs'))),createdAt:new Date().toISOString(),provenance:'v3 was frozen before v1.5, then its 39 errors were opened and explicitly used to develop v1.6. All v1/v2/v3 scores here are development or regression. No hidden v4 or later corpus is read.',architecture:'clause-v1: mapped normalization → source/quote attribution → clauses → role/polarity/stage atoms → linked campaign evidence → unresolved-contradiction checks → priority',changes:['Payment conditions are scoped to clauses and assigned entry, delivery, prize-price or unknown roles.','Negation and optionality apply to a particular condition; the same donation can conflict, an optional extra donation cannot cancel a required ticket.','Random/skill selection distinguish positive, denied, unknown and preliminary stages.','NFKC, mixed glyph and OCR normalization maps every quote to original UTF-16 offsets.','RU, KK and transliteration families expanded without case IDs, complete scenario text or prize/amount-specific labels.'],corpora,previousV3,historical,familyResults,checks,checkSummary:{passed:checks.filter(c=>c.passed).length,total:checks.length},limitations:['Development results are not an independent accuracy estimate.','Clause boundaries, attribution, stages and semantic roles are heuristic and dictionary-based.','Synthetic agent-authored corpora do not establish real-world precision or time savings.','The classifier does not decide fraud, illegality, ownership or actual organizer revenue.']};
console.log(JSON.stringify({engineVersion:report.engineVersion,engineSha256:report.engineSha256,checks:report.checkSummary,openDevelopment:Object.fromEntries(Object.entries(corpora).map(([k,r])=>[k,{accuracy:r.accuracy,precision:r.precision,recall:r.recall,queueFPR:r.triage.falsePositiveRate,quoteErrors:r.quoteErrors}])),previousV3Accuracy:previousV3.accuracy,families:familyResults.accuracy,historical:historical.accuracy},null,2));
if(report.checkSummary.passed!==checks.length)process.exitCode=1;
else if(process.argv.includes('--freeze-development')){writeFileSync(path('../evaluation/development-v3-notes.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log('Development report frozen once; this is not independent evaluation.');}
